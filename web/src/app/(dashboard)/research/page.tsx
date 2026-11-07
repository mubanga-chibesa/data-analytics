import { PubTrend, OADonut } from "@/components/Charts";
import { getResearch } from "@/lib/queries";

function nf(n: number | null | undefined) {
  return (n ?? 0).toLocaleString();
}

// A labelled horizontal rank bar (server-rendered, no client JS needed).
function RankRow({
  label,
  value,
  max,
  sub,
  accent = "var(--brand)",
}: {
  label: string;
  value: number;
  max: number;
  sub?: string;
  accent?: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-[var(--fg-muted)]">
          {nf(value)}
          {sub && <span className="ml-1.5 text-[11px]">{sub}</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </div>
  );
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
  const maxFieldWorks = Math.max(1, ...r.fields.map((f) => f.works));
  const maxVenueWorks = Math.max(1, ...r.venues.map((v) => v.works));
  const maxAuthorCites = Math.max(1, ...r.authors.map((a) => a.citations));

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

      {/* ── dominating fields + open-access mix ────────────────────── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold">Dominating research fields</h2>
          <p className="mb-4 text-xs text-[var(--fg-muted)]">Works by discipline (citations shown)</p>
          <div className="space-y-3.5">
            {r.fields.map((f) => (
              <RankRow
                key={f.field}
                label={f.field}
                value={f.works}
                max={maxFieldWorks}
                sub={`· ${nf(f.citations)} cites`}
              />
            ))}
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Open-access visibility</h2>
          <p className="mb-2 text-xs text-[var(--fg-muted)]">Works by OA status</p>
          <OADonut data={r.oa} />
        </div>
      </div>

      {/* ── top venues + top researchers ───────────────────────────── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Leading publication venues</h2>
            <p className="text-xs text-[var(--fg-muted)]">Journals &amp; repositories UNZA publishes in</p>
          </div>
          <div className="divide-y">
            {r.venues.map((v) => (
              <div key={v.venue} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{v.venue}</span>
                    {v.is_unza_journal && <span className="chip shrink-0">UNZA</span>}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${Math.max((v.works / maxVenueWorks) * 100, 3)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-semibold tabular-nums">{nf(v.works)}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">{nf(v.citations)} cites</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Most visible researchers</h2>
            <p className="text-xs text-[var(--fg-muted)]">By citations across UNZA-affiliated work</p>
          </div>
          <div className="divide-y">
            {r.authors.map((a, i) => (
              <div key={a.person_id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{a.author}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.max((a.citations / maxAuthorCites) * 100, 3)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-semibold tabular-nums">{nf(a.citations)}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">{nf(a.works)} works</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                  <td className="max-w-md px-5 py-3 font-medium">{p.title}</td>
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
