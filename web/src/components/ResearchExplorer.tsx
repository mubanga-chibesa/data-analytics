"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2, Microscope, Building2, User, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OADonut } from "@/components/Charts";

type Field = { field: string; works: number; citations: number };
type Venue = { venue: string; is_unza_journal: boolean; works: number; citations: number };
type Author = { person_id: number; author: string; works: number; citations: number };
type Oa = { status: string; works: number };

type Drill =
  | { kind: "field"; label: string; works: number; citations: number }
  | { kind: "venue"; label: string; works: number; citations: number }
  | { kind: "author"; label: string; id: number; works: number; citations: number };

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

const nf = (n: number | null | undefined) => (n ?? 0).toLocaleString();

function workLink(w: Work): string | null {
  if (w.doi) return `https://doi.org/${w.doi}`;
  if (w.openalex_id) return `https://openalex.org/${w.openalex_id}`;
  return null;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div className="h-full rounded-full" style={{ width: `${Math.max((value / max) * 100, 3)}%`, background: color }} />
    </div>
  );
}

export function ResearchExplorer({
  fields,
  venues,
  authors,
  oa,
}: {
  fields: Field[];
  venues: Venue[];
  authors: Author[];
  oa: Oa[];
}) {
  const [drill, setDrill] = useState<Drill | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);

  const maxField = Math.max(1, ...fields.map((f) => f.works));
  const maxVenue = Math.max(1, ...venues.map((v) => v.works));
  const maxAuthor = Math.max(1, ...authors.map((a) => a.citations));

  useEffect(() => {
    if (!drill) return;
    let cancelled = false;
    setLoading(true);
    setWorks([]);
    const sb = createClient();
    const cols = "publication_id, title, pub_year, venue_name, cited_by_count, is_open_access, doi, openalex_id";
    const run = async () => {
      let q;
      if (drill.kind === "author") {
        q = sb.from("author_publication").select(cols).eq("person_id", drill.id);
      } else {
        q = sb.from("publication").select(cols).eq(drill.kind === "field" ? "topic_field" : "venue_name", drill.label);
      }
      const { data } = await q.order("cited_by_count", { ascending: false }).limit(50);
      if (!cancelled) {
        setWorks((data ?? []) as Work[]);
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [drill]);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrill(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const kindIcon = { field: Microscope, venue: Building2, author: User };

  return (
    <>
      {/* fields + OA */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold">Dominating research fields</h2>
          <p className="mb-4 text-xs text-[var(--fg-muted)]">Click a field to see its publications</p>
          <div className="space-y-2">
            {fields.map((f) => (
              <button
                key={f.field}
                onClick={() => setDrill({ kind: "field", label: f.field, works: f.works, citations: f.citations })}
                className="group -mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-1 truncate font-medium">
                    {f.field}
                    <ChevronRight size={13} className="shrink-0 text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--fg-muted)]">
                    {nf(f.works)}
                    <span className="ml-1.5 text-[11px]">· {nf(f.citations)} cites</span>
                  </span>
                </div>
                <Bar value={f.works} max={maxField} color="var(--brand)" />
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Open-access visibility</h2>
          <p className="mb-2 text-xs text-[var(--fg-muted)]">Works by OA status</p>
          <OADonut data={oa} />
        </div>
      </div>

      {/* venues + authors */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Leading publication venues</h2>
            <p className="text-xs text-[var(--fg-muted)]">Click a venue to see UNZA works in it</p>
          </div>
          <div className="divide-y">
            {venues.map((v) => (
              <button
                key={v.venue}
                onClick={() => setDrill({ kind: "venue", label: v.venue, works: v.works, citations: v.citations })}
                className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{v.venue}</span>
                    {v.is_unza_journal && <span className="chip shrink-0">UNZA</span>}
                  </div>
                  <div className="mt-1">
                    <Bar value={v.works} max={maxVenue} color="var(--brand)" />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-semibold tabular-nums">{nf(v.works)}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">{nf(v.citations)} cites</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Most visible researchers</h2>
            <p className="text-xs text-[var(--fg-muted)]">Click a researcher to see their work</p>
          </div>
          <div className="divide-y">
            {authors.map((a, i) => (
              <button
                key={a.person_id}
                onClick={() => setDrill({ kind: "author", label: a.author, id: a.person_id, works: a.works, citations: a.citations })}
                className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{a.author}</div>
                  <div className="mt-1">
                    <Bar value={a.citations} max={maxAuthor} color="var(--accent)" />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[13px] font-semibold tabular-nums">{nf(a.citations)}</div>
                  <div className="text-[10px] text-[var(--fg-muted)]">{nf(a.works)} works</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-[var(--fg-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* drill-down drawer */}
      {drill && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setDrill(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                  {(() => {
                    const Icon = kindIcon[drill.kind];
                    return <Icon size={18} />;
                  })()}
                </span>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                    {drill.kind === "field" ? "Research field" : drill.kind === "venue" ? "Publication venue" : "Researcher"}
                  </div>
                  <div className="text-base font-semibold leading-tight">{drill.label}</div>
                  <div className="mt-1 text-xs text-[var(--fg-muted)]">
                    {nf(drill.works)} works · {nf(drill.citations)} citations
                  </div>
                </div>
              </div>
              <button onClick={() => setDrill(null)} className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-[var(--fg-muted)]">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : (
                <ul className="divide-y">
                  {works.map((w) => {
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
                          <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums">{nf(w.cited_by_count)}</span>
                        </div>
                      </li>
                    );
                  })}
                  {!works.length && (
                    <li className="px-5 py-10 text-center text-sm text-[var(--fg-muted)]">No publications found.</li>
                  )}
                </ul>
              )}
            </div>
            <div className="border-t px-5 py-2.5 text-[11px] text-[var(--fg-muted)]">
              Showing top {Math.min(works.length, 50)} by citations · click a title to open the source
            </div>
          </aside>
        </>
      )}
    </>
  );
}
