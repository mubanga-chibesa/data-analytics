import { ResearchExplorer } from "@/components/ResearchExplorer";
import { ResearchTop } from "@/components/ResearchTop";
import { getResearch } from "@/lib/queries";

function nf(n: number | null | undefined) {
  return (n ?? 0).toLocaleString();
}

export default async function ResearchPage() {
  const r = await getResearch();

  return (
    <div>
      <p className="mb-5 text-sm text-[var(--fg-muted)]">
        University of Zambia research output and visibility, aggregated from OpenAlex
        {" "}(ORCID, DSpace and journals.unza.zm to follow). Real bibliometric data.
      </p>

      {/* ── drillable headline metrics + trend ─────────────────────── */}
      <ResearchTop summary={r.summary} trend={r.trend} />

      {/* ── drillable segments: fields, venues, researchers + OA ───── */}
      <ResearchExplorer fields={r.fields} venues={r.venues} authors={r.authors} oa={r.oa} />

      {/* ── most-cited publications ────────────────────────────────── */}
      <div className="mt-5 card overflow-hidden">
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
              {r.topCited.map((p) => (
                <tr key={p.publication_id} className="border-t">
                  <td className="max-w-md px-5 py-3 font-medium">
                    {p.doi || p.openalex_id ? (
                      <a
                        href={p.doi ? `https://doi.org/${p.doi}` : `https://openalex.org/${p.openalex_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--brand)] hover:underline"
                      >
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{p.pub_year ?? "—"}</td>
                  <td className="px-5 py-3 text-[var(--fg-muted)]">
                    {p.venue_name ?? "—"}
                    {p.is_unza_journal && <span className="chip ml-2">UNZA</span>}
                  </td>
                  <td className="px-5 py-3">{p.is_open_access ? "✓" : "—"}</td>
                  <td className="px-5 py-3 font-semibold tabular-nums">{nf(p.cited_by_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
