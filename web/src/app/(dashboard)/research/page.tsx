import { PubTrend } from "@/components/Charts";
import { getOverview } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

type Pub = {
  publication_id: number;
  title: string;
  pub_year: number | null;
  venue_name: string | null;
  is_unza_journal: boolean | null;
  is_open_access: boolean | null;
  cited_by_count: number | null;
};

export default async function ResearchPage() {
  const o = await getOverview();
  const supabase = await createClient();
  // Publication-grain view (one row per paper) — fact_publication is per-author
  // and would list multi-author papers multiple times.
  const { data } = await supabase
    .from("publication")
    .select("publication_id, title, pub_year, venue_name, is_unza_journal, is_open_access, cited_by_count")
    .order("cited_by_count", { ascending: false })
    .limit(10);
  const top = (data ?? []) as Pub[];

  return (
    <div>
      <p className="mb-5 text-sm text-[var(--fg-muted)]">
        Publications and citation impact aggregated from ORCID, OpenAlex, DSpace and journals.unza.zm.
      </p>

      <div className="card mb-5 p-5">
        <h2 className="text-sm font-semibold">Output & impact over time</h2>
        <p className="mb-3 text-xs text-[var(--fg-muted)]">Publications and citations by year</p>
        <PubTrend data={o.pubsByYear} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Most-cited publications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--fg-muted)]">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Year</th>
                <th className="px-5 py-3 font-medium">Venue</th>
                <th className="px-5 py-3 font-medium">OA</th>
                <th className="px-5 py-3 font-medium">Citations</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.publication_id} className="border-t">
                  <td className="px-5 py-3 font-medium">{p.title}</td>
                  <td className="px-5 py-3 tabular-nums">{p.pub_year ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--fg-muted)]">
                    {p.venue_name ?? "—"}
                    {p.is_unza_journal && <span className="chip ml-2">UNZA</span>}
                  </td>
                  <td className="px-5 py-3">{p.is_open_access ? "✓" : "—"}</td>
                  <td className="px-5 py-3 tabular-nums font-semibold">{p.cited_by_count ?? 0}</td>
                </tr>
              ))}
              {top.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[var(--fg-muted)]">
                    No publications visible for your role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
