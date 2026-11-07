"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// Open-access status → colour. Mirrors how OA is conventionally coloured.
const OA_COLORS: Record<string, string> = {
  gold: "#c9a227",
  hybrid: "#2f6e78",
  green: "#1a8753",
  bronze: "#a9712e",
  diamond: "#6ab0bd",
  closed: "#9aa39c",
  unknown: "#c3c9c1",
};

export function OADonut({ data }: { data: { status: string; works: number }[] }) {
  const total = data.reduce((a, d) => a + d.works, 0);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie
          data={data}
          dataKey="works"
          nameKey="status"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
          stroke="var(--surface)"
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.status} fill={OA_COLORS[d.status] ?? "#c3c9c1"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, n) => {
            const num = Number(v) || 0;
            return [`${num} works (${Math.round((num / total) * 100)}%)`, String(n)];
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const GREEN = "#1a8753";
const GOLD = "#b9872a";
const TEAL = "#2f6e78";
const RED = "#a8452e";
const GRID = "rgba(120,140,128,0.18)";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--fg)",
};

export function DepartmentBar({
  data,
}: {
  data: { department: string; students: number; completions: number; drops: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(120,140,128,0.08)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completions" name="Completions" fill={GREEN} radius={[4, 4, 0, 0]} />
        <Bar dataKey="drops" name="Drops" fill={RED} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HeadcountBar({
  data,
}: {
  data: { department: string; students: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} fontSize={12} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(120,140,128,0.08)" }} />
        <Bar dataKey="students" name="Students" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 ? TEAL : GREEN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PubTrend({
  data,
}: {
  data: { year: number; publications: number; citations: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="pub" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
        {/* Separate axes: publications (hundreds) and citations (tens of
            thousands) share no sensible scale, so give each its own. */}
        <YAxis yAxisId="pub" tickLine={false} axisLine={false} fontSize={12} width={40} stroke={GREEN} />
        <YAxis
          yAxisId="cit"
          orientation="right"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={44}
          stroke={GOLD}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area yAxisId="pub" type="monotone" dataKey="publications" name="Publications" stroke={GREEN} fill="url(#pub)" strokeWidth={2} />
        <Area yAxisId="cit" type="monotone" dataKey="citations" name="Citations" stroke={GOLD} fill="url(#cit)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
