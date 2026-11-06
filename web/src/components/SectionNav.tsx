"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, BookOpenText, type LucideIcon } from "lucide-react";

type Section = {
  href: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  stat?: string;
};

const SECTIONS: Section[] = [
  {
    href: "/",
    label: "Institutional Overview",
    blurb: "Headline KPIs across teaching & research",
    icon: LayoutDashboard,
  },
  {
    href: "/students",
    label: "Students & Learning",
    blurb: "Enrolment, outcomes and LMS engagement",
    icon: GraduationCap,
  },
  {
    href: "/research",
    label: "Research Output",
    blurb: "Publications and citation impact",
    icon: BookOpenText,
  },
];

export function SectionNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SECTIONS.map(({ href, label, blurb, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
              active
                ? "border-[var(--brand)]/30 bg-[var(--surface)] shadow-[var(--shadow)]"
                : "border-[var(--border)] bg-[var(--surface)]/60 hover:-translate-y-0.5 hover:bg-[var(--surface)] hover:shadow-[var(--shadow)]"
            }`}
          >
            {/* active accent bar */}
            <span
              className={`absolute inset-x-0 top-0 h-0.5 origin-left transition-transform duration-300 ${
                active ? "scale-x-100 bg-[var(--brand)]" : "scale-x-0 bg-[var(--accent)] group-hover:scale-x-100"
              }`}
            />
            <div className="flex items-start gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--brand-soft)] text-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-white"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${active ? "text-[var(--fg)]" : "text-[var(--fg)]"}`}>
                  {label}
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-[var(--fg-muted)]">{blurb}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
