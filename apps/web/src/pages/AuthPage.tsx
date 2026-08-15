import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Moon } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [verificationSentTo, setVerificationSentTo] = useState("");
  const [verifiedNotice, setVerifiedNotice] = useState("");
  const { user, refresh, googleAuthEnabled } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const verifyToken = params.get("verify") || "";

  useEffect(() => {
    if (!verifyToken || user) return;
    setBusy(true);
    void api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: verifyToken }) })
      .then(async () => { await refresh(); setVerifiedNotice("Email verified. You are logged in now."); navigate(next); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not verify email"))
      .finally(() => setBusy(false));
  }, [navigate, next, refresh, user, verifyToken]);

  if (user) {
    return <AuthShell><div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 text-center"><p className="mb-2 text-white/70">You are already logged in as</p><p className="mb-4 font-semibold text-white">{user.email}</p><div className="flex flex-col gap-3"><Link to={next} className="panel-button justify-center">Continue</Link><button type="button" onClick={async () => { await api("/auth/logout", { method: "POST" }); await refresh(); }} className="rounded-xl border border-white/10 px-4 py-3 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Log out / switch account</button></div></div></AuthShell>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) { setError(passwordError); setBusy(false); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); setBusy(false); return; }
    }
    try {
      const result = await api<{ verificationUrl?: string; sentTo?: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password,
          confirmPassword,
        }),
      });
      if (mode === "signup") {
        setVerificationUrl(result.verificationUrl || "");
        setVerificationSentTo(result.sentTo || "");
        return;
      }
      await refresh();
      navigate(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell>
    <div className="grid min-h-screen lg:grid-cols-[minmax(320px,.8fr)_1fr]">
      <section className="hidden border-r border-white/10 bg-white/[0.035] p-10 lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="inline-flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-night"><Moon size={23} /></span>
          <span className="text-xl font-bold">Baku<span className="text-gold">Nights</span></span>
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">Venue operations</p>
          <h1 className="mt-3 max-w-lg font-display text-5xl font-semibold leading-tight text-white">Moderate deals before they go live.</h1>
          <p className="mt-5 max-w-md text-white/55">Admin and merchant access for onboarding venues, reviewing submissions, and keeping BakuNights clean.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-night"><Moon size={20} /></span>
            <span className="font-bold">Baku<span className="text-gold">Nights</span></span>
          </Link>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">{mode === "login" ? "Welcome back" : "Create account"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{mode === "login" ? "Log in" : "Join BakuNights"}</h1>
          <p className="mt-2 text-white/55">{mode === "login" ? "Customers must log in to claim offers and get QR codes." : "Create an account, then verify your email before you continue."}</p>
          {verifiedNotice && <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{verifiedNotice}</p>}
          {verificationUrl && <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100"><p className="font-semibold">Check your email to verify your account.</p>{verificationSentTo && <p className="mt-1 text-cyan-100/75">Verification notice sent to: {verificationSentTo}</p>}<p className="mt-1 text-cyan-100/75">Local dev shortcut:</p><Link to={verificationUrl} className="mt-2 inline-flex font-semibold underline">Verify email and continue</Link></div>}

          {googleAuthEnabled && <a href={`${apiUrl}/auth/google`} className="mt-6 flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] font-bold text-white transition hover:bg-white/[0.1]">Continue with Google</a>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && <label className="block"><span className="form-label">Your name</span><input className="form-field" name="name" autoComplete="name" required minLength={2} placeholder="Your name" /></label>}
            <label className="block"><span className="form-label">Email</span><input className="form-field" name="email" type="email" autoComplete="email" required placeholder="admin@bakunights.test" /></label>
            <label className="block"><span className="form-label">Password</span><span className="relative block"><input className="form-field pr-12" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} placeholder={mode === "signup" ? "8+ chars, A-Z and a-z" : "At least 8 characters"} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{mode === "signup" && <p className="mt-1 text-xs text-white/45">Minimum 8 characters with one uppercase letter and one lowercase letter.</p>}</label>
            {mode === "signup" && <label className="block"><span className="form-label">Retype password</span><span className="relative block"><input className="form-field pr-12" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} placeholder="Type the same password again" /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white" aria-label={showConfirmPassword ? "Hide repeated password" : "Show repeated password"}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
            {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</p>}
            <button className="panel-button mt-2 w-full justify-center" disabled={busy}>{busy ? "Working..." : mode === "login" ? "Log in" : "Create account"}<ArrowRight size={18} /></button>
          </form>

          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setVerificationUrl(""); setVerificationSentTo(""); }} className="mt-5 w-full text-center text-sm font-semibold text-cyan-300 underline">
            {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </section>
    </div>
  </AuthShell>;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#09090e] text-white">{children}</div>;
}

function validatePassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  return "";
}
