"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpenText,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Emblem } from "@/components/Brand";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/students", label: "Students & Learning", icon: GraduationCap },
  { href: "/research", label: "Research Output", icon: BookOpenText },
];

export function Sidebar({
  name,
  role,
}: {
  name?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r bg-[var(--surface)] px-4 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <Emblem size={34} />
        <div className="leading-tight">
          <div className="text-sm font-semibold">UNZA Analytics</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Data Platform
          </div>
        </div>
      </div>

      <nav className="mt-7 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name ?? "Signed in"}</div>
            <div className="truncate text-[11px] capitalize text-[var(--fg-muted)]">
              {role?.replace("_", " ") ?? "viewer"}
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
