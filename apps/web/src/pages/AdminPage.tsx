import { useCallback, useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckCircle2, Gauge, Plus, ShieldCheck, Store, Ticket, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type MetricSet = { activeVenues: number; dealsLiveToday: number; dealsPendingReview: number };
type AdminVenue = {
  id: string; name: string; cuisine: string; address: string; lat: number; lng: number; rating: number; phone?: string | null; photoUrl?: string | null; isActive: boolean; autoApproveOffers: boolean; claimStatus: string; verificationNotes?: string | null;
  owner?: { id: string; name: string; email: string } | null;
  _count: { deals: number };
};
type AdminDeal = {
  id: string; restaurantId: string; title: string; description: string; menuItem?: string | null; offerType: OfferType; discountPct: number | null; tag: string; dietaryTags: string[]; startsAt: string; endsAt: string; isActive: boolean; status: "draft" | "pending_review" | "approved" | "rejected" | "expired"; reviewNotes?: string | null;
  restaurant: { id: string; name: string };
  submittedBy?: { id: string; name: string; email: string } | null;
};
type OfferType = "discount" | "combo" | "set_menu" | "perk" | "event" | "bundle" | "other";
const OFFER_TYPES: { value: OfferType; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "combo", label: "Combo" },
  { value: "set_menu", label: "Set menu" },
  { value: "perk", label: "Perk" },
  { value: "event", label: "Event" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Other" },
];
type ClaimRequest = {
  id: string; contactPhone: string; contactEmail: string; proofNotes: string; createdAt: string;
  venue: { id: string; name: string; address: string; ownerUserId: string | null };
  requestingUser: { id: string; name: string; email: string };
};

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<MetricSet | null>(null);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [venueFormOpen, setVenueFormOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<AdminVenue | null>(null);
  const [editingDeal, setEditingDeal] = useState<AdminDeal | null>(null);

  const load = useCallback(async () => {
    if (user?.role !== "ADMIN") { setLoading(false); return; }
    try {
      setLoading(true);
      const [dashboard, venueData, dealData, claimData] = await Promise.all([
        api<{ metrics: MetricSet }>("/admin/dashboard"),
        api<{ venues: AdminVenue[] }>("/admin/venues"),
        api<{ deals: AdminDeal[] }>("/admin/deals"),
        api<{ claims: ClaimRequest[] }>("/admin/claim-requests"),
      ]);
      setMetrics(dashboard.metrics);
      setVenues(venueData.venues);
      setDeals(dealData.deals);
      setClaims(claimData.claims);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load admin panel");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const pendingDeals = useMemo(() => deals.filter((deal) => deal.status === "pending_review"), [deals]);

  async function approveDeal(deal: AdminDeal) {
    await api(`/admin/deals/${deal.id}/approve`, { method: "POST" });
    void load();
  }

  async function rejectDeal(deal: AdminDeal) {
    const notes = window.prompt(`Why reject "${deal.title}"?`);
    if (!notes?.trim()) return;
    await api(`/admin/deals/${deal.id}/reject`, { method: "POST", body: JSON.stringify({ notes }) });
    void load();
  }

  async function expireDeal(deal: AdminDeal) {
    if (!window.confirm(`Expire "${deal.title}" now?`)) return;
    await api(`/admin/deals/${deal.id}/expire`, { method: "POST" });
    void load();
  }

  async function deactivateVenue(venue: AdminVenue) {
    if (!window.confirm(`Deactivate ${venue.name}?`)) return;
    await api(`/admin/venues/${venue.id}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) });
    void load();
  }

  async function reviewClaim(claim: ClaimRequest, approved: boolean) {
    const notes = approved ? claim.proofNotes : window.prompt(`Why reject ${claim.venue.name}'s claim?`);
    if (!notes?.trim()) return;
    await api(`/admin/claim-requests/${claim.id}/${approved ? "approve" : "reject"}`, { method: "POST", body: JSON.stringify({ notes }) });
    void load();
  }

  if (authLoading || loading) return <PanelShell><p className="text-white/60">Loading admin desk...</p></PanelShell>;
  if (!user) return <PanelShell><Gate title="Log in as an admin" action={<Link to="/login?next=/admin" className="rounded-lg bg-cyan-300 px-4 py-2 font-bold text-[#07151a]">Log in</Link>} /></PanelShell>;
  if (user.role !== "ADMIN") return <PanelShell><Gate title="Admin access required" subtitle={`You are logged in as ${user.email}. Log out first if you want to switch to an admin account.`} action={<LogoutButton />} /></PanelShell>;

  return <PanelShell>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">BakuNights operations</p><h1 className="mt-1 text-3xl font-semibold text-white">Admin panel</h1></div>
      <div className="flex gap-2"><button onClick={() => { setEditingVenue(null); setVenueFormOpen(true); }} className="panel-button"><Plus size={16} />Venue</button><button onClick={() => { setEditingDeal(null); setDealFormOpen(true); }} className="panel-button"><Plus size={16} />Offer</button></div>
    </div>
    {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      <Metric icon={Store} label="Active venues" value={metrics?.activeVenues ?? 0} />
      <Metric icon={Ticket} label="Offers live today" value={metrics?.dealsLiveToday ?? 0} />
      <Metric icon={Gauge} label="Pending review" value={metrics?.dealsPendingReview ?? 0} />
    </div>
    <Section title="Moderation queue" subtitle={`${pendingDeals.length} merchant offers waiting`}>
      <DataTable columns={["Offer", "Venue", "Submitted by", "Ends", "Actions"]}>
        {pendingDeals.map((deal) => <tr key={deal.id} className="border-t border-white/10"><td className="p-3"><strong>{deal.title}</strong><p className="text-xs text-white/45">{offerSummary(deal)} · {deal.tag}</p></td><td className="p-3">{deal.restaurant.name}</td><td className="p-3 text-sm">{deal.submittedBy?.email ?? "Unknown"}</td><td className="p-3 text-sm">{format(new Date(deal.endsAt), "MMM d, HH:mm")}</td><td className="p-3"><button onClick={() => void approveDeal(deal)} className="mr-2 text-cyan-300"><CheckCircle2 /></button><button onClick={() => void rejectDeal(deal)} className="text-red-300"><XCircle /></button></td></tr>)}
      </DataTable>
    </Section>
    <Section title="Claim requests" subtitle={`${claims.length} pending`}>
      <DataTable columns={["Venue", "Requester", "Contact", "Proof", "Actions"]}>
        {claims.map((claim) => <tr key={claim.id} className="border-t border-white/10"><td className="p-3"><strong>{claim.venue.name}</strong><p className="text-xs text-white/45">{claim.venue.address}</p></td><td className="p-3 text-sm">{claim.requestingUser.email}</td><td className="p-3 text-sm">{claim.contactEmail}<br />{claim.contactPhone}</td><td className="max-w-md p-3 text-sm text-white/65">{claim.proofNotes}</td><td className="p-3"><button onClick={() => void reviewClaim(claim, true)} className="mr-2 text-cyan-300"><CheckCircle2 /></button><button onClick={() => void reviewClaim(claim, false)} className="text-red-300"><XCircle /></button></td></tr>)}
      </DataTable>
    </Section>
    <Section title="Venues" subtitle="Create, edit, or deactivate">
      <DataTable columns={["Venue", "Owner", "Status", "Automation", "Offers", "Actions"]}>
        {venues.map((venue) => <tr key={venue.id} className="border-t border-white/10"><td className="p-3"><strong>{venue.name}</strong><p className="text-xs text-white/45">{venue.address}</p></td><td className="p-3 text-sm">{venue.owner?.email ?? "Unclaimed"}</td><td className="p-3"><StatusPill label={venue.isActive ? venue.claimStatus : "inactive"} /></td><td className="p-3"><StatusPill label={venue.autoApproveOffers ? "auto approve" : "manual review"} /></td><td className="p-3">{venue._count.deals}</td><td className="p-3"><button onClick={() => { setEditingVenue(venue); setVenueFormOpen(true); }} className="mr-3 text-sm font-semibold text-cyan-300">Edit</button>{venue.isActive && <button onClick={() => void deactivateVenue(venue)} className="text-sm font-semibold text-red-300">Deactivate</button>}</td></tr>)}
      </DataTable>
    </Section>
    <Section title="Offer management" subtitle="Admin-created offers auto-approve and are audited">
      <DataTable columns={["Offer", "Venue", "Status", "Ends", "Actions"]}>
        {deals.map((deal) => <tr key={deal.id} className="border-t border-white/10"><td className="p-3"><strong>{deal.title}</strong><p className="text-xs text-white/45">{offerSummary(deal)} · {deal.tag}</p></td><td className="p-3">{deal.restaurant.name}</td><td className="p-3"><StatusPill label={deal.status} /></td><td className="p-3 text-sm">{format(new Date(deal.endsAt), "MMM d, HH:mm")}</td><td className="p-3"><button onClick={() => { setEditingDeal(deal); setDealFormOpen(true); }} className="mr-3 text-sm font-semibold text-cyan-300">Edit</button>{deal.status !== "expired" && <button onClick={() => void expireDeal(deal)} className="text-sm font-semibold text-red-300">Expire</button>}</td></tr>)}
      </DataTable>
    </Section>
    {venueFormOpen && <VenueForm venue={editingVenue} onClose={() => setVenueFormOpen(false)} onSaved={() => { setVenueFormOpen(false); void load(); }} />}
    {dealFormOpen && <DealForm deal={editingDeal} venues={venues} onClose={() => setDealFormOpen(false)} onSaved={() => { setDealFormOpen(false); void load(); }} />}
  </PanelShell>;
}

function PanelShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#09090e] px-4 py-6 text-white md:px-8"><div className="mx-auto max-w-7xl">{children}</div></div>;
}

function Gate({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center"><ShieldCheck className="mx-auto text-cyan-300" size={44} /><h1 className="mt-4 text-2xl font-semibold">{title}</h1>{subtitle && <p className="mt-2 text-white/55">{subtitle}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.045] p-5"><Icon className="text-cyan-300" size={22} /><p className="mt-4 text-3xl font-semibold">{value}</p><p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p></div>;
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="mt-8"><div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2><span className="text-xs text-white/45">{subtitle}</span></div>{children}</section>;
}

function DataTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.035]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[0.055] text-xs uppercase tracking-[.14em] text-white/45"><tr>{columns.map((column) => <th key={column} className="p-3">{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-xs capitalize text-white/70">{label.replaceAll("_", " ")}</span>;
}

function offerSummary(deal: Pick<AdminDeal, "offerType" | "discountPct">) {
  if (deal.offerType === "discount" && deal.discountPct != null) return `${deal.discountPct}% off`;
  return OFFER_TYPES.find((item) => item.value === deal.offerType)?.label ?? "Offer";
}

function VenueForm({ venue, onClose, onSaved }: { venue: AdminVenue | null; onClose: () => void; onSaved: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get("name")),
      cuisine: String(form.get("cuisine")),
      address: String(form.get("address")),
      lat: Number(form.get("lat")),
      lng: Number(form.get("lng")),
      rating: Number(form.get("rating") || 0),
      phone: String(form.get("phone") || "") || null,
      photoUrl: String(form.get("photoUrl") || "") || null,
      isActive: form.get("isActive") === "on",
      autoApproveOffers: form.get("autoApproveOffers") === "on",
      verificationNotes: String(form.get("verificationNotes") || "") || null,
      dietaryTags: [],
    };
    await api(venue ? `/admin/venues/${venue.id}` : "/admin/venues", { method: venue ? "PATCH" : "POST", body: JSON.stringify(body) });
    onSaved();
  }
  return <Modal title={venue ? "Edit venue" : "Create venue"} onClose={onClose}><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><Input name="name" label="Name" defaultValue={venue?.name} /><Input name="cuisine" label="Category" defaultValue={venue?.cuisine ?? "Restaurant"} /><Input name="address" label="Address" defaultValue={venue?.address} wide /><Input name="lat" label="Latitude" type="number" step="any" defaultValue={venue?.lat ?? 40.4093} /><Input name="lng" label="Longitude" type="number" step="any" defaultValue={venue?.lng ?? 49.8671} /><Input name="rating" label="Rating" type="number" step="0.1" defaultValue={venue?.rating ?? 4.5} /><Input name="phone" label="Phone" defaultValue={venue?.phone ?? ""} /><Input name="photoUrl" label="Photo URL" defaultValue={venue?.photoUrl ?? ""} wide /><label className="md:col-span-2"><span className="form-label">Verification notes</span><textarea name="verificationNotes" className="form-field min-h-24" defaultValue={venue?.verificationNotes ?? ""} /></label><label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={venue?.isActive ?? true} />Active</label><label className="flex items-center gap-2 text-sm"><input name="autoApproveOffers" type="checkbox" defaultChecked={venue?.autoApproveOffers ?? false} />Auto-approve merchant offers for this venue</label><p className="md:col-span-2 text-xs text-white/45">Use this only for trusted/verified venues. Merchant offers will go live immediately without entering the moderation queue.</p><Actions onClose={onClose} /></form></Modal>;
}

function DealForm({ deal, venues, onClose, onSaved }: { deal: AdminDeal | null; venues: AdminVenue[]; onClose: () => void; onSaved: () => void }) {
  const localValue = (date?: string, offset = 0) => { const value = date ? new Date(date) : new Date(Date.now() + offset); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const discountValue = String(form.get("discountPct") || "").trim();
    const menuItem = String(form.get("menuItem") || "").trim();
    const body = { restaurantId: String(form.get("restaurantId")), title: String(form.get("title")), description: String(form.get("description")), menuItem: menuItem || null, offerType: String(form.get("offerType")), discountPct: discountValue ? Number(discountValue) : null, tag: String(form.get("tag")), dietaryTags: String(form.get("dietaryTags") || "").split(",").map((item) => item.trim()).filter(Boolean), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: new Date(String(form.get("endsAt"))).toISOString(), isRecurring: false };
    await api(deal ? `/admin/deals/${deal.id}` : "/admin/deals", { method: deal ? "PATCH" : "POST", body: JSON.stringify(body) });
    onSaved();
  }
  return <Modal title={deal ? "Edit offer" : "Create offer"} onClose={onClose}><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><label><span className="form-label">Venue</span><select name="restaurantId" className="form-field" defaultValue={deal?.restaurantId}>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label><label><span className="form-label">Offer type</span><select name="offerType" className="form-field" defaultValue={deal?.offerType ?? "combo"}>{OFFER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><Input name="discountPct" label="Discount % (only for discount offers)" type="number" min={1} max={100} defaultValue={deal?.discountPct ?? ""} required={false} /><Input name="title" label="Offer title" defaultValue={deal?.title} wide /><Input name="menuItem" label="Specific meal/item (optional)" defaultValue={deal?.menuItem ?? ""} placeholder="Lule Kebab, lunch combo, dessert plate..." wide required={false} /><label className="md:col-span-2"><span className="form-label">Description</span><textarea name="description" className="form-field min-h-24" required defaultValue={deal?.description} placeholder="Combo details, menu items, price, conditions, and what the customer receives." /></label><label><span className="form-label">Daypart</span><select name="tag" className="form-field" defaultValue={deal?.tag ?? "all day"}>{["breakfast", "lunch", "dinner", "happy hour", "all day"].map((tag) => <option key={tag}>{tag}</option>)}</select></label><Input name="dietaryTags" label="Tags" defaultValue={deal?.dietaryTags.join(", ") ?? ""} required={false} /><Input name="startsAt" label="Starts (date and time)" type="datetime-local" defaultValue={localValue(deal?.startsAt)} /><Input name="endsAt" label="Ends (date and time)" type="datetime-local" defaultValue={localValue(deal?.endsAt, 24 * 60 * 60 * 1000)} /><Actions onClose={onClose} /></form></Modal>;
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button type="button" onClick={() => void logout()} className="rounded-lg bg-cyan-300 px-4 py-2 font-bold text-[#07151a]">Log out / switch account</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><div className="mx-auto my-4 max-w-2xl rounded-xl border border-white/10 bg-[#12121a] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-semibold">{title}</h2><button onClick={onClose} className="text-2xl text-white/60">x</button></div>{children}</div></div>;
}

function Input({ label, wide, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; wide?: boolean }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="form-label">{label}</span><input className="form-field" required {...props} /></label>;
}

function Actions({ onClose }: { onClose: () => void }) {
  return <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-white/70">Cancel</button><button className="rounded-lg bg-cyan-300 px-4 py-2 font-bold text-[#07151a]">Save</button></div>;
}
