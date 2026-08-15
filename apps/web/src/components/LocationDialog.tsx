import { useEffect, useState, type FormEvent } from "react";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { api } from "../lib/api";

type Location = { lat: number; lng: number; label: string };
type Suggestion = { id: string; label: string };

export function LocationDialog({ open, onClose, onSelect, onCurrentLocation }: {
  open: boolean;
  onClose: () => void;
  onSelect: (location: Location) => void;
  onCurrentLocation: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim().length < 3) { setSuggestions([]); return; }
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true); setError("");
        const result = await api<{ suggestions: Suggestion[] }>(`/places/autocomplete?input=${encodeURIComponent(query)}`);
        setSuggestions(result.suggestions);
      } catch (reason) {
        setSuggestions([]);
        setError(reason instanceof Error ? reason.message : "Search unavailable");
      } finally { setLoading(false); }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query]);

  if (!open) return null;
  async function choose(id: string) {
    try {
      setLoading(true);
      const result = await api<{ place: { name?: string; address: string; lat: number; lng: number } }>(`/places/${id}`);
      onSelect({ lat: result.place.lat, lng: result.place.lng, label: result.place.name || result.place.address });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not select location"); }
    finally { setLoading(false); }
  }
  function useCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lat = Number(form.get("lat")); const lng = Number(form.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError("Enter valid latitude and longitude values."); return;
    }
    onSelect({ lat, lng, label: "Custom location" });
  }

  return <div className="fixed inset-0 z-50 flex items-end bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="location-title">
    <div className="w-full rounded-t-2xl border-2 border-ink bg-paper p-5 shadow-ticket sm:max-w-lg sm:rounded-2xl">
      <div className="flex items-start justify-between"><div><p className="eyebrow text-accent-500">Set your spot</p><h2 id="location-title" className="font-display text-3xl font-bold uppercase">Where are you hungry?</h2></div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/10" aria-label="Close"><X /></button></div>
      <button onClick={onCurrentLocation} className="btn-mustard mt-5 w-full"><LocateFixed size={18} />Use current location</button>
      <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-ink/20" /><span className="eyebrow text-ink/50">or search</span><span className="h-px flex-1 bg-ink/20" /></div>
      <label className="relative block"><Search className="absolute left-3 top-3 text-ink/40" size={20} /><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Neighborhood, city, or address" autoFocus /></label>
      {(loading || suggestions.length > 0) && <div className="mt-2 overflow-hidden rounded-lg border border-ink/20 bg-cream">{loading && <p className="p-3 font-mono text-xs uppercase">Searching…</p>}{suggestions.map((item) => <button key={item.id} onClick={() => void choose(item.id)} className="flex w-full items-start gap-2 border-b border-ink/10 p-3 text-left last:border-0 hover:bg-primary-50"><MapPin size={17} className="mt-0.5 shrink-0 text-primary-500" /><span>{item.label}</span></button>)}<p className="border-t border-ink/10 p-2 text-right font-mono text-[9px] uppercase text-ink/50">Powered by Google</p></div>}
      {error && <p className="mt-2 text-sm font-semibold text-tomato">{error}</p>}
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold underline">Enter coordinates instead</summary><form onSubmit={useCoordinates} className="mt-3 grid grid-cols-2 gap-2"><input name="lat" className="field" inputMode="decimal" placeholder="Latitude" required /><input name="lng" className="field" inputMode="decimal" placeholder="Longitude" required /><button className="btn-primary col-span-2" type="submit">Use coordinates</button></form></details>
    </div>
  </div>;
}
