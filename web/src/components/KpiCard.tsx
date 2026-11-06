import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-[var(--fg-muted)]">{label}</span>
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{
            background: accent ? "var(--accent-soft)" : "var(--brand-soft)",
            color: accent ? "var(--accent)" : "var(--brand)",
          }}
        >
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--fg-muted)]">{sub}</div>}
    </div>
  );
}
