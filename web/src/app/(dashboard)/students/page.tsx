import { HeadcountBar } from "@/components/Charts";
import { getOverview } from "@/lib/queries";

export default async function StudentsPage() {
  const o = await getOverview();
  return (
    <div>
      <p className="mb-5 text-sm text-[var(--fg-muted)]">
        Enrolment distribution and learning outcomes, FY {o.latestYear}.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Headcount by department</h2>
          <p className="mb-3 text-xs text-[var(--fg-muted)]">Current enrolled students</p>
          <HeadcountBar data={o.byDepartment} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Completion summary</h2>
          <ul className="space-y-3">
            {o.byDepartment.map((d) => {
              const total = d.completions + d.drops;
              const rate = total ? d.completions / total : 0;
              return (
                <li key={d.department}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{d.department}</span>
                    <span className="tabular-nums text-[var(--fg-muted)]">
                      {(rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
