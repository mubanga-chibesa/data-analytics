"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">
            U
          </div>
          <div>
            <div className="text-lg font-semibold">UNZA Data Analytics</div>
            <div className="text-xs text-[var(--fg-muted)]">Research & academic intelligence</div>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <h1 className="text-base font-semibold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              placeholder="you@unza.zm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[var(--brand)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
