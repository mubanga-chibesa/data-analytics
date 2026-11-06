"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Emblem } from "@/components/Brand";

export function TopBar({ name, role }: { name?: string; role?: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (name ?? "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <Emblem size={30} />
          <div className="leading-none">
            <div className="text-[13px] font-semibold tracking-tight">UNZA Analytics</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Institutional Intelligence
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[13px] font-medium leading-tight">{name ?? "Signed in"}</div>
            <div className="text-[11px] capitalize leading-tight text-[var(--fg-muted)]">
              {role?.replace(/_/g, " ") ?? "viewer"}
            </div>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">
            {initials}
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--fg-muted)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
