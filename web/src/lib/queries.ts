import { createClient } from "@/lib/supabase/server";

export type Kpi = {
  academic_year: number;
  department_id: string | null;
  headcount: number | null;
  completions: number | null;
  drops: number | null;
  dropout_rate: number | null;
  avg_gpa: number | null;
  lms_active_students: number | null;
  publications: number | null;
  citations: number | null;
  pct_open_access: number | null;
};

export type ResearchSummary = {
  works: number;
  citations: number;
  mean_citations: number | null;
  pct_open_access: number | null;
  h_index: number;
  authors: number;
  venues: number;
};

export type Overview = {
  kpis: Kpi[];
  latestYear: number;
  totals: {
    students: number;
    avgGpa: number;
    completionRate: number;
    publications: number;
    citations: number;
    openAccessPct: number;
    hIndex: number;
  };
  byDepartment: { department: string; students: number; completions: number; drops: number }[];
  pubsByYear: { year: number; publications: number; citations: number }[];
};

export async function getOverview(): Promise<Overview> {
  const supabase = await createClient();
  // Teaching comes from institutional_kpi; research comes from the publication-
  // grain research views (institutional_kpi sums fact_publication, which is
  // per-author and so multiplies citations by co-author count — wrong for totals).
  const [{ data }, { data: summaryRows }, { data: trendRows }] = await Promise.all([
    supabase.from("institutional_kpi").select("*").order("academic_year", { ascending: true }),
    supabase.from("research_summary").select("*"),
    supabase.from("research_trend").select("*").order("year", { ascending: true }),
  ]);
  const summary = (summaryRows?.[0] ?? null) as ResearchSummary | null;

  const kpis = (data ?? []) as Kpi[];
  const years = kpis.map((k) => k.academic_year);
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
  // Research data (real, OpenAlex) can extend past the teaching/seed data, so
  // anchor the teaching KPIs to the latest year that actually has enrolment —
  // otherwise "latest year" lands on a research-only year and reads as all-zero.
  const teachingYears = kpis.filter((k) => (k.headcount ?? 0) > 0).map((k) => k.academic_year);
  const latestYear = teachingYears.length ? Math.max(...teachingYears) : maxYear;
  // Teaching aggregates: latest teaching year, real departments only (OpenAlex
  // research rows have a null department and must not pollute teaching views).
  const latest = kpis.filter((k) => k.academic_year === latestYear && k.department_id);

  const sum = (rows: Kpi[], f: (k: Kpi) => number | null | undefined) =>
    rows.reduce((a, k) => a + (f(k) ?? 0), 0);

  const students = sum(latest, (k) => k.headcount);
  const completions = sum(latest, (k) => k.completions);
  const drops = sum(latest, (k) => k.drops);
  const gpaRows = latest.filter((k) => k.avg_gpa != null);
  const avgGpa = gpaRows.length ? sum(gpaRows, (k) => k.avg_gpa) / gpaRows.length : 0;

  // Research totals from the correct publication-grain view.
  const publications = summary?.works ?? 0;
  const citations = summary?.citations ?? 0;
  const openAccessPct = summary?.pct_open_access ?? 0;
  const hIndex = summary?.h_index ?? 0;

  const byDepartment = Object.values(
    latest.reduce<Record<string, { department: string; students: number; completions: number; drops: number }>>(
      (acc, k) => {
        const d = k.department_id as string;
        acc[d] ??= { department: d, students: 0, completions: 0, drops: 0 };
        acc[d].students += k.headcount ?? 0;
        acc[d].completions += k.completions ?? 0;
        acc[d].drops += k.drops ?? 0;
        return acc;
      },
      {},
    ),
  );

  // Research trend from the publication-grain view (last 12 years for legibility).
  const trendMaxYear = (trendRows ?? []).reduce((m, r) => Math.max(m, r.year as number), maxYear);
  const pubsByYear = ((trendRows ?? []) as { year: number; works: number; citations: number }[])
    .filter((d) => d.year >= trendMaxYear - 11)
    .map((d) => ({ year: d.year, publications: d.works, citations: d.citations }));

  return {
    kpis,
    latestYear,
    totals: {
      students,
      avgGpa,
      completionRate: completions + drops > 0 ? completions / (completions + drops) : 0,
      publications,
      citations,
      openAccessPct,
      hIndex,
    },
    byDepartment,
    pubsByYear,
  };
}

// ─────────────────────── Research analytics (segmented) ─────────────────────
export type ResearchData = {
  summary: ResearchSummary | null;
  trend: { year: number; publications: number; citations: number }[];
  venues: { venue: string; is_unza_journal: boolean; works: number; citations: number; oa_share: number }[];
  fields: { field: string; works: number; citations: number }[];
  authors: { person_id: number; author: string; works: number; citations: number }[];
  oa: { status: string; works: number; citations: number }[];
  types: { type: string; works: number }[];
  topCited: {
    publication_id: number;
    title: string;
    pub_year: number | null;
    venue_name: string | null;
    is_unza_journal: boolean | null;
    is_open_access: boolean | null;
    cited_by_count: number | null;
    doi: string | null;
    openalex_id: string | null;
  }[];
};

export async function getResearch(): Promise<ResearchData> {
  const supabase = await createClient();
  const [summaryR, trendR, venuesR, fieldsR, authorsR, oaR, typesR, topR] = await Promise.all([
    supabase.from("research_summary").select("*"),
    supabase.from("research_trend").select("*").order("year", { ascending: true }),
    supabase.from("top_venue").select("*").order("works", { ascending: false }).limit(8),
    supabase.from("top_field").select("*").order("works", { ascending: false }).limit(8),
    supabase.from("top_author").select("*").order("citations", { ascending: false }).limit(8),
    supabase.from("oa_breakdown").select("*").order("works", { ascending: false }),
    supabase.from("pub_type").select("*").order("works", { ascending: false }),
    supabase
      .from("publication")
      .select("publication_id, title, pub_year, venue_name, is_unza_journal, is_open_access, cited_by_count, doi, openalex_id")
      .order("cited_by_count", { ascending: false })
      .limit(10),
  ]);

  const summary = (summaryR.data?.[0] ?? null) as ResearchSummary | null;
  const trendAll = (trendR.data ?? []) as { year: number; works: number; citations: number }[];
  const maxYear = trendAll.reduce((m, r) => Math.max(m, r.year), new Date().getFullYear());
  const trend = trendAll
    .filter((d) => d.year >= maxYear - 11)
    .map((d) => ({ year: d.year, publications: d.works, citations: d.citations }));

  return {
    summary,
    trend,
    venues: (venuesR.data ?? []) as ResearchData["venues"],
    fields: (fieldsR.data ?? []) as ResearchData["fields"],
    authors: (authorsR.data ?? []) as ResearchData["authors"],
    oa: (oaR.data ?? []) as ResearchData["oa"],
    types: (typesR.data ?? []) as ResearchData["types"],
    topCited: (topR.data ?? []) as ResearchData["topCited"],
  };
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("me")
    .select("full_name, app_role, department_ids")
    .maybeSingle();
  return { email: user.email, ...(data ?? {}) } as {
    email?: string;
    full_name?: string;
    app_role?: string;
    department_ids?: string[];
  };
}
