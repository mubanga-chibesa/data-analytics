"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  BarChart3,
  Network,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Emblem } from "@/components/Brand";

const FEATURES = [
  {
    icon: Network,
    title: "Every source, one truth",
    body: "Moodle, SIS, ORCID, OpenAlex, DSpace & journals.unza.zm — unified and de-duplicated.",
  },
  {
    icon: BarChart3,
    title: "Institutional intelligence",
    body: "Enrolment, outcomes, engagement and research impact, live on one dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by design",
    body: "Role-based, department-scoped access to sensitive student records — enforced in the database.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        {/* layered background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 10%, #1a7a4e 0%, #0f5132 38%, #0a3b25 66%, #06281a 100%)",
          }}
        />
        {/* dotted grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* gold glow + ring motif */}
        <div
          className="absolute -right-24 -top-24 -z-10 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #e0bb57 0%, transparent 65%)" }}
        />
        <svg className="absolute -bottom-32 -left-24 -z-10 opacity-[0.10]" width="520" height="520" viewBox="0 0 520 520" fill="none">
          {[90, 150, 210, 258].map((r) => (
            <circle key={r} cx="150" cy="370" r={r} stroke="#eccb63" strokeWidth="1.5" />
          ))}
        </svg>

        <div className="flex items-center gap-3">
          <Emblem size={44} />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">University of Zambia</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#eccb63]">
              Data Analytics Platform
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight">
            Research & academic intelligence,{" "}
            <span className="text-[#eccb63]">unified.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            The single source of truth for teaching, learning and research across
            the University of Zambia.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon size={17} className="text-[#eccb63]" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-[13px] leading-snug text-white/60">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/50">
          <span className="font-medium italic tracking-wide text-white/70">
            “Service and Excellence”
          </span>
          <span>© {new Date().getFullYear()} University of Zambia</span>
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Emblem size={38} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">University of Zambia</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                Data Analytics
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            {mode === "signin"
              ? "Sign in to access the analytics workspace."
              : "Request access to the UNZA analytics workspace."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--fg-muted)]">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@unza.zm"
                  className="w-full rounded-lg border bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--fg-muted)]">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
                />
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border bg-[var(--surface-2)] py-2.5 pl-9 pr-10 text-sm outline-none transition-colors focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs font-medium text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--brand-2)] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Sign up"}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--fg-muted)]">
            {mode === "signin" ? "Don't have an account? " : "Already have access? "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-semibold text-[var(--brand)] hover:underline"
            >
              {mode === "signin" ? "Request access" : "Sign in"}
            </button>
          </div>

          <p className="mt-10 text-center text-[11px] leading-relaxed text-[var(--fg-muted)]">
            Protected by role-based access control.
            <br />
            Authorised UNZA staff and faculty only.
          </p>
        </div>
      </main>
    </div>
  );
}
