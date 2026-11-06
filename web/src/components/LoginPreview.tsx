"use client";

import { useEffect, useRef, useState } from "react";

// A small, real interaction loop for the login brand panel: click a stat to
// drive the chart, hover a bar for its exact value, hover a department to
// reveal its rate. Static numbers shaped like the real institutional_kpi
// mart — this isn't live data (unauthenticated), but it behaves like the
// product instead of sitting there as a picture of one.

type MetricKey = "students" | "completion" | "publications";

// Each metric gets its own color from the palette instead of one gold reused
// everywhere — the chart's hue tells you which stat you're looking at.
const METRIC_COLOR: Record<MetricKey, { from: string; to: string; text: string }> = {
  students: { from: "#3cbb7c", to: "#3cbb7c4d", text: "#5fd99a" },
  completion: { from: "#5bb0bd", to: "#5bb0bd4d", text: "#7fc9d4" },
  publications: { from: "#e8c568", to: "#e8c5684d", text: "#e8c568" },
};

const METRICS: Record<
  MetricKey,
  {
    label: string;
    stat: string;
    target: number;
    suffix: string;
    unit: string;
    bars: { label: string; value: number }[];
  }
> = {
  students: {
    label: "Students",
    stat: "12,480",
    target: 12480,
    suffix: "",
    unit: "enrolled",
    bars: [
      { label: "Wk 1", value: 760 },
      { label: "Wk 2", value: 1040 },
      { label: "Wk 3", value: 920 },
      { label: "Wk 4", value: 1420 },
      { label: "Wk 5", value: 1280 },
      { label: "Wk 6", value: 1660 },
      { label: "Wk 7", value: 1160 },
    ],
  },
  completion: {
    label: "Completion",
    stat: "81%",
    target: 81,
    suffix: "%",
    unit: "completion rate",
    bars: [
      { label: "2022 S1", value: 68 },
      { label: "2022 S2", value: 72 },
      { label: "2023 S1", value: 75 },
      { label: "2023 S2", value: 74 },
      { label: "2024 S1", value: 78 },
      { label: "2024 S2", value: 81 },
      { label: "2025 S1", value: 79 },
    ],
  },
  publications: {
    label: "Publications",
    stat: "214",
    target: 214,
    suffix: "",
    unit: "this year",
    bars: [
      { label: "Q1 '24", value: 9 },
      { label: "Q2 '24", value: 14 },
      { label: "Q3 '24", value: 11 },
      { label: "Q4 '24", value: 18 },
      { label: "Q1 '25", value: 16 },
      { label: "Q2 '25", value: 22 },
      { label: "Q3 '25", value: 19 },
    ],
  },
};

const DEPARTMENTS = [
  { code: "MED", name: "Medicine", pct: 78 },
  { code: "CS", name: "Computer Science", pct: 64 },
  { code: "ENG", name: "Electrical Engineering", pct: 59 },
  { code: "ECON", name: "Economics", pct: 71 },
];

function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    setValue(0);
    start.current = null;
    let raf: number;
    const tick = (t: number) => {
      if (start.current === null) start.current = t;
      const progress = Math.min((t - start.current) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function StatTile({
  metric,
  active,
  onSelect,
}: {
  metric: MetricKey;
  active: boolean;
  onSelect: (m: MetricKey) => void;
}) {
  const m = METRICS[metric];
  const count = useCountUp(m.target);
  const display =
    metric === "students" ? count.toLocaleString() : `${count}${m.suffix}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(metric)}
      className={`rounded-md px-2 py-1.5 text-left transition-colors ${
        active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
      }`}
    >
      <div
        className="text-lg font-semibold tabular-nums transition-colors"
        style={{ color: active ? METRIC_COLOR[metric].text : "white" }}
      >
        {display}
      </div>
      <div className="text-[11px] text-white/40">{m.label}</div>
    </button>
  );
}

export function LoginPreview() {
  const [metric, setMetric] = useState<MetricKey>("students");
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  const [openDept, setOpenDept] = useState<string | null>(DEPARTMENTS[0].code);
  const [grown, setGrown] = useState(false);

  const active = METRICS[metric];
  const maxVal = Math.max(...active.bars.map((b) => b.value));

  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] backdrop-blur-sm xl:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
          Institutional overview · FY2025
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3cbb7c] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3cbb7c]" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1">
        {(Object.keys(METRICS) as MetricKey[]).map((k) => (
          <StatTile key={k} metric={k} active={metric === k} onSelect={setMetric} />
        ))}
      </div>

      {/* items-stretch gives each bar's wrapper a definite height (matching
          h-16) so the bar button's percentage height resolves correctly —
          without it, percentage height on a non-stretched flex child
          collapses to zero. */}
      <div className="relative mt-5 flex h-16 items-stretch gap-1.5">
        {active.bars.map((b, i) => {
          const h = Math.max((b.value / maxVal) * 100, 6);
          const hovered = hoverBar === i;
          return (
            <div key={b.label} className="relative flex-1">
              {hovered && (
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#081f15] px-2 py-1 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/10">
                  {b.value.toLocaleString()} {active.unit}
                  <span className="block text-center text-[9px] text-white/40">{b.label}</span>
                </div>
              )}
              <button
                type="button"
                onMouseEnter={() => setHoverBar(i)}
                onMouseLeave={() => setHoverBar(null)}
                onFocus={() => setHoverBar(i)}
                onBlur={() => setHoverBar(null)}
                aria-label={`${b.label}: ${b.value} ${active.unit}`}
                className="absolute bottom-0 left-0 right-0 rounded-[2px] bg-gradient-to-t transition-[height,opacity] duration-700 ease-out"
                style={{
                  height: grown ? `${h}%` : "0%",
                  transitionDelay: `${i * 45}ms`,
                  backgroundImage: `linear-gradient(to top, ${METRIC_COLOR[metric].from}, ${METRIC_COLOR[metric].to})`,
                  opacity: hovered ? 1 : 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {active.bars.map((b) => (
          <span key={b.label} className="flex-1 text-center text-[9px] text-white/30">
            {b.label}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
        {DEPARTMENTS.map((d) => {
          const open = openDept === d.code;
          return (
            <button
              key={d.code}
              type="button"
              onClick={() => setOpenDept(open ? null : d.code)}
              onMouseEnter={() => setOpenDept(d.code)}
              className="flex w-full items-center gap-2.5 rounded px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="w-9 shrink-0 text-[11px] text-white/40">{d.code}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[background-color]"
                  style={{
                    width: grown ? `${d.pct}%` : "0%",
                    backgroundColor: open ? "#e8c568" : "#3cbb7c",
                    transition: "width 700ms ease-out, background-color 200ms",
                    transitionDelay: "280ms",
                  }}
                />
              </div>
              <span
                className={`shrink-0 text-[11px] tabular-nums text-white/60 transition-opacity ${
                  open ? "opacity-100" : "opacity-0"
                }`}
              >
                {d.pct}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
