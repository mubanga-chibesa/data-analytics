import { Users, GraduationCap, BookOpenText, Quote, Gauge } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { DepartmentBar, PubTrend } from "@/components/Charts";
import { getOverview } from "@/lib/queries";

export default async function OverviewPage() {
  const o = await getOverview();
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const empty = o.kpis.length === 0;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <p className="text-sm text-[var(--fg-muted)]">
          Teaching, learning and research intelligence across the University of Zambia.
        </p>
        <span className="chip shrink-0">FY {o.latestYear}</span>
      </div>

      {empty && (
        <div className="card mb-6 border-dashed p-6 text-sm text-[var(--fg-muted)]">
          No data visible for your role yet. An administrator can grant you a
          department scope, or run the seed script to populate demo data.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Students" value={o.totals.students.toLocaleString()} sub={`enrolled, FY ${o.latestYear}`} icon={Users} />
        <KpiCard label="Avg GPA" value={o.totals.avgGpa.toFixed(2)} sub="current cohort" icon={Gauge} />
        <KpiCard label="Completion" value={pct(o.totals.completionRate)} sub="of graded outcomes" icon={GraduationCap} />
        <KpiCard label="Publications" value={o.totals.publications.toLocaleString()} sub="all years" icon={BookOpenText} accent />
        <KpiCard label="Citations" value={o.totals.citations.toLocaleString()} sub={`${pct(o.totals.openAccessPct)} open access`} icon={Quote} accent />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Outcomes by department</h2>
          <p className="mb-3 text-xs text-[var(--fg-muted)]">Completions vs. drops, FY {o.latestYear}</p>
          <DepartmentBar data={o.byDepartment} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Research output trend</h2>
          <p className="mb-3 text-xs text-[var(--fg-muted)]">Publications & citations by year</p>
          <PubTrend data={o.pubsByYear} />
        </div>
      </section>

      <section className="mt-6 card overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Department scorecard — FY {o.latestYear}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Headcount</th>
                <th className="px-5 py-3 font-medium">Completions</th>
                <th className="px-5 py-3 font-medium">Drops</th>
                <th className="px-5 py-3 font-medium">Avg GPA</th>
                <th className="px-5 py-3 font-medium">Publications</th>
              </tr>
            </thead>
            <tbody>
              {o.kpis
                .filter((k) => k.academic_year === o.latestYear && k.department_id)
                .map((k) => (
                  <tr key={`${k.department_id}`} className="border-t">
                    <td className="px-5 py-3 font-medium">{k.department_id ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{k.headcount ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{k.completions ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{k.drops ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{k.avg_gpa ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{k.publications ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
