import { useState } from "react";
import { Bookmark, Clock3, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import type { Deal } from "../types";

export function DealCard({ deal, onSave, saved = false }: { deal: Deal; onSave?: (deal: Deal) => void; saved?: boolean }) {
  const badge = offerBadge(deal);
  const accent = accentForDeal(deal);
  return <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121c] text-white shadow-[0_18px_55px_rgba(0,0,0,.28)] transition duration-200 hover:-translate-y-1 hover:border-white/[0.16]">
    <Link to={`/deals/${deal.id}`} className="block">
      <div className="relative h-48 overflow-hidden bg-[#181824]">
        <DealImage src={deal.restaurant.photoUrl} label={deal.restaurant.cuisine || "Baku nights"} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121c] via-black/35 to-black/10" />
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.16em] text-white backdrop-blur">{deal.tag || "live offer"}</span>
        <div className="absolute right-4 top-4 grid min-h-14 min-w-14 place-items-center rounded-2xl border border-white/15 bg-black/45 px-3 text-center backdrop-blur">
          <span className="font-display text-xl font-bold uppercase leading-none text-white">{badge.main}<small className="block text-[9px] tracking-[.18em] text-white/70">{badge.sub}</small></span>
        </div>
      </div>
      <div className="px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: accent }}>{deal.restaurant.cuisine}</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-300"><Star size={14} fill="currentColor" stroke="currentColor" />{(deal.restaurant.rating ?? 0).toFixed(1)}</span>
        </div>
        <h2 className="font-display text-2xl font-bold uppercase leading-tight tracking-tight">{deal.title}</h2>
        {deal.menuItem && <p className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold" style={{ color: accent }}>For: {deal.menuItem}</p>}
        <p className="mt-2 text-sm font-semibold text-white/80">{deal.restaurant.name}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/55">{deal.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.08] pt-3 text-[11px] font-semibold uppercase text-white/55">
          <span className="flex items-center gap-1.5"><MapPin size={13} className="text-amber-300" />{deal.distanceMiles != null ? `${deal.distanceMiles.toFixed(1)} mi` : deal.restaurant.address.split(",")[0]}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={13} className="text-amber-300" />Ends in {formatDistanceToNowStrict(new Date(deal.endsAt))}</span>
        </div>
      </div>
    </Link>
    {onSave && <button onClick={() => onSave(deal)} className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:border-amber-300 hover:text-amber-300" aria-label={saved ? "Remove saved deal" : "Save deal"}><Bookmark size={18} fill={saved ? "#f59e0b" : "none"} stroke={saved ? "#f59e0b" : "currentColor"} /></button>}
  </article>;
}

function offerBadge(deal: Deal) {
  if ((deal.offerType ?? "discount") === "discount" && deal.discountPct != null) return { main: `${deal.discountPct}%`, sub: "OFF" };
  const label = (deal.offerType ?? "offer").replaceAll("_", " ").split(" ")[0] ?? "offer";
  return { main: label, sub: "OFFER" };
}

function DealImage({ src, label }: { src?: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_28%_22%,rgba(245,158,11,.35),transparent_34%),linear-gradient(135deg,#222235,#08080d)]">
    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-amber-200">{label}</span>
  </div>;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
}

function accentForDeal(deal: Deal) {
  if (deal.offerType === "combo" || deal.offerType === "bundle") return "#67e8f9";
  if (deal.offerType === "set_menu") return "#a78bfa";
  if (deal.offerType === "perk" || deal.offerType === "event") return "#f472b6";
  return "#f59e0b";
}
