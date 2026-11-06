"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Emblem } from "@/components/Brand";
import { LoginPreview } from "@/components/LoginPreview";

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
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ── Brand / product panel ───────────────────────────────────── */}
      <aside
        className="grain relative hidden flex-col justify-between p-10 text-white lg:flex xl:p-14"
        style={{
          background:
            "linear-gradient(165deg, #0e3d28 0%, #0c3321 32%, #092a1b 60%, #061e14 100%)",
        }}
      >
        {/* soft directional light, top-left — depth without a gradient blob */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(60% 50% at 8% 0%, rgba(60,187,124,0.22) 0%, transparent 60%)",
          }}
        />
        {/* a single thin warm seam along the inner edge, like a bound page */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-px opacity-40"
          style={{ background: "linear-gradient(180deg, transparent, #d9ae3f, transparent)" }}
        />

        <div className="relative flex items-center gap-2.5">
          <Emblem size={30} />
          <span className="text-[13px] font-semibold tracking-tight">University of Zambia</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#d9ae3f]">
            Data Analytics Platform
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.2] tracking-tight xl:text-[38px]">
            Teaching, learning and research{" "}
            <span className="bg-gradient-to-r from-[#e8c568] to-[#d9ae3f] bg-clip-text text-transparent">
              read as one system.
            </span>
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/55">
            Enrolment, LMS engagement and research output from Moodle, SIS,
            ORCID, OpenAlex and DSpace, resolved to a single institutional
            record.
          </p>
        </div>

        {/* live-product preview: the point of the panel */}
        <div className="relative">
          <LoginPreview />
        </div>
      </aside>

      {/* ── Sign-in panel ───────────────────────────────────────────── */}
      <main className="flex items-center justify-center bg-[var(--bg)] px-6 py-10">
        <div className="w-full max-w-[360px]">
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <Emblem size={28} />
            <span className="text-sm font-semibold">University of Zambia</span>
          </div>

          <h2 className="text-[22px] font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-1 text-[13.5px] text-[var(--fg-muted)]">
            {mode === "signin"
              ? "Access the UNZA analytics workspace."
              : "Request access to the UNZA analytics workspace."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-3.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--fg-muted)]">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@unza.zm"
                  className="w-full rounded-md border bg-[var(--surface)] py-2.5 pl-9 pr-3 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)]"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--fg-muted)]">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[var(--fg-muted)] hover:text-[var(--brand)]"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={15}
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
                  className="w-full rounded-md border bg-[var(--surface)] py-2.5 pl-9 pr-9 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)]"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-[var(--danger)]/25 bg-[var(--danger)]/[0.06] px-3 py-2 text-[12.5px] font-medium text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--brand)] py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--brand-2)] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[13px] text-[var(--fg-muted)]">
            {mode === "signin" ? "No account yet? " : "Already have access? "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-[var(--brand)] hover:underline"
            >
              {mode === "signin" ? "Request access" : "Sign in"}
            </button>
          </p>

          <p className="mt-10 border-t pt-5 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
            Authorised UNZA staff and faculty only. Access is role- and
            department-scoped and enforced at the database layer.
          </p>
        </div>
      </main>
    </div>
  );
}
