import { PubTrend } from "@/components/Charts";
import { ResearchExplorer } from "@/components/ResearchExplorer";
import { getResearch } from "@/lib/queries";

function nf(n: number | null | undefined) {
  return (n ?? 0).toLocaleString();
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[12px] font-medium text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{sub}</div>}
    </div>
  );
}

export default async function ResearchPage() {
  const r = await getResearch();
  const s = r.summary;

  return (
    <div>
      <p className="mb-5 text-sm text-[var(--fg-muted)]">
        University of Zambia research output and visibility, aggregated from OpenAlex
        {" "}(ORCID, DSpace and journals.unza.zm to follow). Real bibliometric data.
      </p>

      {/* ── headline bibliometrics ─────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Publications" value={nf(s?.works)} sub="indexed works" />
        <Stat label="Citations" value={nf(s?.citations)} sub={`${(s?.mean_citations ?? 0).toFixed(1)} avg / work`} />
        <Stat label="h-index" value={nf(s?.h_index)} sub="institutional" />
        <Stat label="Open access" value={`${Math.round((s?.pct_open_access ?? 0) * 100)}%`} sub="of all works" />
        <Stat label="Researchers" value={nf(s?.authors)} sub="distinct authors" />
        <Stat label="Venues" value={nf(s?.venues)} sub="journals & sources" />
      </section>

      {/* ── output & impact trend ──────────────────────────────────── */}
      <div className="card mt-5 p-5">
        <h2 className="text-sm font-semibold">Output &amp; impact over time</h2>
        <p className="mb-3 text-xs text-[var(--fg-muted)]">Publications and citations by year</p>
        <PubTrend data={r.trend} />
      </div>

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
