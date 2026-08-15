import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { BarChart3, Bookmark, CheckCircle2, Eye, Plus, QrCode, Search, Store, TicketCheck, Users, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type MerchantDeal = {
  id: string; restaurantId: string; title: string; description: string; menuItem?: string | null; offerType: OfferType; discountPct: number | null; tag: string; dietaryTags: string[]; startsAt: string; endsAt: string; status: "draft" | "pending_review" | "approved" | "rejected" | "expired"; reviewNotes?: string | null;
  _count: { views: number; savedBy: number; redemptions: number };
};
type ManagedVenue = { id: string; name: string; address: string; deals: MerchantDeal[]; _count: { followers: number } };
type SearchVenue = { id: string; name: string; address: string; cuisine: string; ownerUserId: string | null; claimStatus: string };
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

export function MerchantPage() {
  const { user, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState<ManagedVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MerchantDeal | null>(null);

  const load = useCallback(async () => {
    if (user?.role !== "MERCHANT" && user?.role !== "ADMIN") { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await api<{ restaurants: ManagedVenue[] }>("/merchant/dashboard");
      setVenues(data.restaurants);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (authLoading || loading) return <Shell><p className="text-white/60">Loading merchant dashboard...</p></Shell>;
  if (!user) return <Shell><Gate title="Log in to manage a venue" action={<Link to="/login?next=/merchant" className="panel-button">Log in</Link>} /></Shell>;
  if (user.role === "CONSUMER") return <Shell><Gate title="Merchant account required" subtitle="Search and submit a venue claim to unlock merchant tools." /></Shell>;
  if (error) return <Shell><Gate title="Could not load merchant dashboard" subtitle={error} /></Shell>;
  if (venues.length === 0) return <Shell><ClaimListing notice={notice} onClaimed={setNotice} /></Shell>;

  const allDeals = venues.flatMap((venue) => venue.deals);
  const totals = allDeals.reduce((sum, deal) => ({
    views: sum.views + deal._count.views,
    saves: sum.saves + deal._count.savedBy,
    redemptions: sum.redemptions + deal._count.redemptions,
  }), { views: 0, saves: 0, redemptions: 0 });

  async function expire(deal: MerchantDeal) {
    if (!window.confirm(`Expire "${deal.title}" now?`)) return;
    await api(`/merchant/deals/${deal.id}/expire`, { method: "POST" });
    void load();
  }

  return <Shell>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300"><BarChart3 className="mr-1 inline" size={14} />Merchant dashboard</p><h1 className="mt-1 text-3xl font-semibold">Today at a glance</h1><p className="mt-1 text-white/55">{venues.map((venue) => venue.name).join(" · ")}</p></div>
      <button onClick={() => { setEditing(null); setShowForm(true); }} className="panel-button"><Plus size={16} />New offer</button>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={Eye} label="Offer views" value={totals.views} />
      <Metric icon={Bookmark} label="Saves" value={totals.saves} />
      <Metric icon={TicketCheck} label="QR claims" value={totals.redemptions} />
      <Metric icon={Users} label="Followers" value={venues.reduce((sum, venue) => sum + venue._count.followers, 0)} />
    </div>
    <RedeemCode />
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Your offer board</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.035]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.055] text-xs uppercase tracking-[.14em] text-white/45"><tr><th className="p-3">Offer</th><th className="p-3">Status</th><th className="p-3">Ends</th><th className="p-3">Views</th><th className="p-3">Saves</th><th className="p-3">QR proofs</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>{allDeals.map((deal) => <tr key={deal.id} className="border-t border-white/10"><td className="p-3"><strong>{deal.title}</strong><p className="text-xs text-white/45">{offerSummary(deal)} · {deal.tag}</p>{deal.status === "rejected" && deal.reviewNotes && <p className="mt-1 text-xs text-red-300">{deal.reviewNotes}</p>}</td><td className="p-3"><StatusPill label={deal.status} /></td><td className="p-3">{format(new Date(deal.endsAt), "MMM d, HH:mm")}</td><td className="p-3">{deal._count.views}</td><td className="p-3">{deal._count.savedBy}</td><td className="p-3">{deal._count.redemptions}</td><td className="p-3 text-right"><button onClick={() => { setEditing(deal); setShowForm(true); }} className="mr-3 font-semibold text-cyan-300">Edit</button>{deal.status === "approved" && <button onClick={() => void expire(deal)} className="font-semibold text-red-300">Expire</button>}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
    {showForm && <DealForm venues={venues} editing={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void load(); }} />}
  </Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#09090e] px-4 py-6 text-white md:px-8"><div className="mx-auto max-w-6xl">{children}</div></div>;
}

function Gate({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center"><Store className="mx-auto text-cyan-300" size={44} /><h1 className="mt-4 text-2xl font-semibold">{title}</h1>{subtitle && <p className="mt-2 text-white/55">{subtitle}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.045] p-5"><Icon className="text-cyan-300" size={22} /><p className="mt-4 text-3xl font-semibold">{value}</p><p className="text-xs uppercase tracking-[.16em] text-white/45">{label}</p></div>;
}

function RedeemCode() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ redemption: { redemptionCode: string; deal: { title: string }; user: { name: string; email: string } } }>("/merchant/redemptions/redeem", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setMessage(`Verified ${result.redemption.deal.title} for ${result.redemption.user.name || result.redemption.user.email}.`);
      setCode("");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not verify this QR/code.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-8 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-5">
    <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300"><QrCode className="mr-1 inline" size={14} />Customer proof</p><h2 className="mt-1 text-xl font-semibold">Verify QR or code</h2><p className="mt-1 text-sm text-white/55">Ask the customer to show their QR from the app, then enter the code here.</p></div>
    <form onSubmit={submit} className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
      <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="form-field font-mono uppercase" placeholder="GS-AB12CD34" required />
      <button className="panel-button justify-center" disabled={busy}>{busy ? "Checking..." : "Verify"}</button>
    </form>
    {message && <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75">{message}</p>}
  </section>;
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-xs capitalize text-white/70">{label.replaceAll("_", " ")}</span>;
}

function offerSummary(deal: Pick<MerchantDeal, "offerType" | "discountPct">) {
  if (deal.offerType === "discount" && deal.discountPct != null) return `${deal.discountPct}% off`;
  return OFFER_TYPES.find((item) => item.value === deal.offerType)?.label ?? "Offer";
}

function ClaimListing({ onClaimed, notice }: { onClaimed: (message: string) => void; notice: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchVenue[]>([]);
  const [selected, setSelected] = useState<SearchVenue | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    const data = await api<{ restaurants: SearchVenue[] }>(`/restaurants?query=${encodeURIComponent(query)}`);
    setResults(data.restaurants);
  }

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/restaurants/${selected.id}/claim`, { method: "POST", body: JSON.stringify({ contactPhone: form.get("contactPhone"), contactEmail: form.get("contactEmail"), proofNotes: form.get("proofNotes") }) });
      onClaimed("Claim submitted. We will review the ownership proof before activating your dashboard.");
      setSelected(null);
    } catch (reason) {
      onClaimed(reason instanceof Error ? reason.message : "Could not submit claim");
    }
  }

  return <div className="mx-auto max-w-2xl">
    <Store size={44} className="text-cyan-300" /><p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">First things first</p><h1 className="mt-1 text-3xl font-semibold">Claim your venue</h1><p className="mt-2 text-white/55">Find your listing, then tell us how we can verify you manage it.</p>
    <form onSubmit={search} className="mt-6 flex gap-2"><input className="form-field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Venue name or address" required /><button className="panel-button"><Search size={18} />Search</button></form>
    <div className="mt-3 space-y-2">{results.map((venue) => <button key={venue.id} disabled={Boolean(venue.ownerUserId)} onClick={() => setSelected(venue)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left disabled:opacity-50"><span><strong className="block">{venue.name}</strong><small className="text-white/45">{venue.address}</small></span>{venue.ownerUserId ? <span className="text-xs uppercase text-white/45">Claimed</span> : <CheckCircle2 />}</button>)}</div>
    {selected && <form onSubmit={claim} className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5"><div className="flex justify-between"><h2 className="text-xl font-semibold">Claim {selected.name}</h2><button type="button" onClick={() => setSelected(null)}><XCircle /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="form-label">Contact phone</span><input name="contactPhone" className="form-field" required placeholder="+994..." /></label><label><span className="form-label">Contact email</span><input name="contactEmail" className="form-field" type="email" required placeholder="manager@venue.az" /></label></div><label className="mt-4 block"><span className="form-label">Ownership proof</span><textarea name="proofNotes" className="form-field min-h-32" minLength={20} maxLength={2000} required placeholder="Work email, business phone, registration number, or other proof..." /></label><button className="panel-button mt-4">Submit for review</button></form>}
    {notice && <p className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-100">{notice}</p>}
  </div>;
}

function DealForm({ venues, editing, onClose, onSaved }: { venues: ManagedVenue[]; editing: MerchantDeal | null; onClose: () => void; onSaved: () => void }) {
  const localValue = (date?: string, offset = 0) => { const value = date ? new Date(date) : new Date(Date.now() + offset); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const discountValue = String(form.get("discountPct") || "").trim();
    const menuItem = String(form.get("menuItem") || "").trim();
    const body = { restaurantId: String(form.get("restaurantId")), title: String(form.get("title")), description: String(form.get("description")), menuItem: menuItem || null, offerType: String(form.get("offerType")), discountPct: discountValue ? Number(discountValue) : null, tag: String(form.get("tag")), dietaryTags: String(form.get("dietaryTags") || "").split(",").map((item) => item.trim()).filter(Boolean), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: new Date(String(form.get("endsAt"))).toISOString(), isRecurring: false };
    await api(editing ? `/merchant/deals/${editing.id}` : "/merchant/deals", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
    onSaved();
  }
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={submit} className="mx-auto my-4 max-w-2xl rounded-xl border border-white/10 bg-[#12121a] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-semibold">{editing ? "Edit offer" : "Submit new offer"}</h2><button type="button" onClick={onClose} className="text-2xl text-white/60">x</button></div><div className="grid gap-3 md:grid-cols-2"><label><span className="form-label">Venue</span><select name="restaurantId" className="form-field" defaultValue={editing?.restaurantId}>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label><label><span className="form-label">Offer type</span><select name="offerType" className="form-field" defaultValue={editing?.offerType ?? "combo"}>{OFFER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><Input name="discountPct" label="Discount % (only for discount offers)" type="number" min={1} max={100} defaultValue={editing?.discountPct ?? ""} required={false} /><Input name="title" label="Offer title" defaultValue={editing?.title} wide /><Input name="menuItem" label="Specific meal/item (optional)" defaultValue={editing?.menuItem ?? ""} placeholder="Lule Kebab, lunch combo, dessert plate..." wide required={false} /><label className="md:col-span-2"><span className="form-label">Description</span><textarea name="description" className="form-field min-h-24" required defaultValue={editing?.description} placeholder="Combo details, menu items, price, conditions, and what the customer receives." /></label><label><span className="form-label">Daypart</span><select name="tag" className="form-field" defaultValue={editing?.tag ?? "all day"}>{["breakfast", "lunch", "dinner", "happy hour", "all day"].map((tag) => <option key={tag}>{tag}</option>)}</select></label><Input name="dietaryTags" label="Tags" defaultValue={editing?.dietaryTags.join(", ") ?? ""} required={false} /><Input name="startsAt" label="Starts (date and time)" type="datetime-local" defaultValue={localValue(editing?.startsAt)} /><Input name="endsAt" label="Ends (date and time)" type="datetime-local" defaultValue={localValue(editing?.endsAt, 24 * 60 * 60 * 1000)} /></div><p className="mt-4 text-sm text-white/50">Merchant changes go to pending review. Nothing becomes public until an admin approves it.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-white/70">Cancel</button><button className="panel-button">Submit for review</button></div></form></div>;
}

function Input({ label, wide, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; wide?: boolean }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="form-label">{label}</span><input className="form-field" required {...props} /></label>;
}
