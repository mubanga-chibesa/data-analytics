"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PubTrend } from "@/components/Charts";
import type { ResearchSummary } from "@/lib/queries";

const nf = (n: number | null | undefined) => (n ?? 0).toLocaleString();

type Work = {
  publication_id: number;
  title: string;
  pub_year: number | null;
  venue_name: string | null;
  cited_by_count: number | null;
  is_open_access: boolean | null;
  doi: string | null;
  openalex_id: string | null;
};
type AuthorRow = { person_id: number; author: string; works: number; citations: number };
type VenueRow = { venue: string; works: number; citations: number; oa_share: number };
type OaRow = { status: string; works: number; citations: number };

type Sel =
  | { mode: "works"; title: string; subtitle: string; year?: number }
  | { mode: "authors"; title: string; subtitle: string }
  | { mode: "venues"; title: string; subtitle: string }
  | { mode: "oa"; title: string; subtitle: string };

function workLink(w: Work) {
  if (w.doi) return `https://doi.org/${w.doi}`;
  if (w.openalex_id) return `https://openalex.org/${w.openalex_id}`;
  return null;
}

export function ResearchTop({
  summary,
  trend,
}: {
  summary: ResearchSummary | null;
  trend: { year: number; publications: number; citations: number }[];
}) {
  const s = summary;
  const [sel, setSel] = useState<Sel | null>(null);
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sel) return;
    let cancelled = false;
    setLoading(true);
    setRows([]);
    const sb = createClient();
    const run = async () => {
      let data: unknown[] = [];
      if (sel.mode === "works") {
        let q = sb
          .from("publication")
          .select("publication_id, title, pub_year, venue_name, cited_by_count, is_open_access, doi, openalex_id")
          .not("openalex_id", "is", null);
        if (sel.year != null) q = q.eq("pub_year", sel.year);
        const res = await q.order("cited_by_count", { ascending: false }).limit(50);
        data = res.data ?? [];
      } else if (sel.mode === "authors") {
        const res = await sb.from("top_author").select("person_id, author, works, citations").order("citations", { ascending: false }).limit(50);
        data = res.data ?? [];
      } else if (sel.mode === "venues") {
        const res = await sb.from("top_venue").select("venue, works, citations, oa_share").order("works", { ascending: false }).limit(50);
        data = res.data ?? [];
      } else {
        const res = await sb.from("oa_breakdown").select("status, works, citations").order("works", { ascending: false });
        data = res.data ?? [];
      }
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pct = Math.round((s?.pct_open_access ?? 0) * 100);
  const tiles: { label: string; value: string; sub: string; onClick: () => void }[] = [
    {
      label: "Publications",
      value: nf(s?.works),
      sub: "indexed works",
      onClick: () => setSel({ mode: "works", title: "All publications", subtitle: `${nf(s?.works)} works, most-cited first` }),
    },
    {
      label: "Citations",
      value: nf(s?.citations),
      sub: `${(s?.mean_citations ?? 0).toFixed(1)} avg / work`,
      onClick: () => setSel({ mode: "works", title: "Citation impact", subtitle: `${nf(s?.citations)} citations across all works` }),
    },
    {
      label: "h-index",
      value: nf(s?.h_index),
      sub: "institutional",
      onClick: () => setSel({ mode: "works", title: `h-index ${nf(s?.h_index)}`, subtitle: `${nf(s?.h_index)} papers each cited ≥ their rank` }),
    },
    {
      label: "Open access",
      value: `${pct}%`,
      sub: "of all works",
      onClick: () => setSel({ mode: "oa", title: "Open-access visibility", subtitle: `${pct}% of works are open access` }),
    },
    {
      label: "Researchers",
      value: nf(s?.authors),
      sub: "distinct authors",
      onClick: () => setSel({ mode: "authors", title: "Researchers", subtitle: `${nf(s?.authors)} distinct authors, by visibility` }),
    },
    {
      label: "Venues",
      value: nf(s?.venues),
      sub: "journals & sources",
      onClick: () => setSel({ mode: "venues", title: "Publication venues", subtitle: `${nf(s?.venues)} journals & sources` }),
    },
  ];

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={t.onClick}
            className="card group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--brand)]/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--fg-muted)]">{t.label}</span>
              <ChevronRight size={13} className="text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{t.value}</div>
            <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{t.sub}</div>
          </button>
        ))}
      </section>

      <div className="card mt-5 p-5">
        <h2 className="text-sm font-semibold">Output &amp; impact over time</h2>
        <p className="mb-3 text-xs text-[var(--fg-muted)]">Publications and citations by year — click a year to drill in</p>
        <PubTrend
          data={trend}
          onYearClick={(year) => setSel({ mode: "works", title: `Publications in ${year}`, subtitle: "Works from this year, most-cited first", year })}
        />
      </div>

      {sel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setSel(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold leading-tight">{sel.title}</div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">{sel.subtitle}</div>
              </div>
              <button onClick={() => setSel(null)} className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-[var(--fg-muted)]">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : sel.mode === "works" ? (
                <ul className="divide-y">
                  {(rows as Work[]).map((w) => {
                    const link = workLink(w);
                    return (
                      <li key={w.publication_id} className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            {link ? (
                              <a href={link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1 text-[13px] font-medium leading-snug hover:text-[var(--brand)]">
                                <span>{w.title}</span>
                                <ExternalLink size={12} className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-100" />
                              </a>
                            ) : (
                              <span className="text-[13px] font-medium leading-snug">{w.title}</span>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                              <span>{w.pub_year ?? "—"}</span>
                              {w.venue_name && <span className="truncate">· {w.venue_name}</span>}
                              {w.is_open_access && <span className="chip">OA</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-[13px] font-semibold tabular-nums">{nf(w.cited_by_count)}</span>
                        </div>
                      </li>
                    );
                  })}
                  {!rows.length && <li className="px-5 py-10 text-center text-sm text-[var(--fg-muted)]">No publications found.</li>}
                </ul>
              ) : sel.mode === "authors" ? (
                <ul className="divide-y">
                  {(rows as AuthorRow[]).map((a, i) => (
                    <li key={a.person_id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)]">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{a.author}</span>
                      <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums">
                        {nf(a.citations)}
                        <span className="ml-1.5 text-[10px] font-normal text-[var(--fg-muted)]">{nf(a.works)} works</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : sel.mode === "venues" ? (
                <ul className="divide-y">
                  {(rows as VenueRow[]).map((v) => (
                    <li key={v.venue} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{v.venue}</span>
                      <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums">
                        {nf(v.works)}
                        <span className="ml-1.5 text-[10px] font-normal text-[var(--fg-muted)]">{nf(v.citations)} cites</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="divide-y">
                  {(rows as OaRow[]).map((o) => (
                    <li key={o.status} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex-1 text-[13px] font-medium capitalize">{o.status}</span>
                      <span className="text-right text-[13px] font-semibold tabular-nums">
                        {nf(o.works)}
                        <span className="ml-1.5 text-[10px] font-normal text-[var(--fg-muted)]">{nf(o.citations)} cites</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
