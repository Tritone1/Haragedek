import { LoaderCircle, SearchX, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "Hunting down deals…" }: { label?: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><LoaderCircle className="animate-spin text-primary-500" size={34} /><p className="font-mono text-sm font-semibold uppercase">{label}</p></div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center gap-3 px-6 text-center"><SearchX size={42} className="text-primary-500" /><h2 className="font-display text-2xl font-bold uppercase">{title}</h2><p className="text-ink/65">{message}</p>{action}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="mx-auto my-8 flex max-w-lg items-center gap-4 border-2 border-ink bg-white p-4 shadow-ticket-sm"><WifiOff className="shrink-0 text-tomato" /><div className="flex-1"><p className="font-semibold">Couldn’t load this</p><p className="text-sm text-ink/65">{message}</p></div>{retry && <button className="btn-mustard !min-h-9 !px-3" onClick={retry}>Retry</button>}</div>;
}
