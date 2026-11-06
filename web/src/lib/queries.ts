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
  };
  byDepartment: { department: string; students: number; completions: number; drops: number }[];
  pubsByYear: { year: number; publications: number; citations: number }[];
};

export async function getOverview(): Promise<Overview> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("institutional_kpi")
    .select("*")
    .order("academic_year", { ascending: true });

  const kpis = (data ?? []) as Kpi[];
  const years = kpis.map((k) => k.academic_year);
  const latestYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const latest = kpis.filter((k) => k.academic_year === latestYear);

  const sum = (rows: Kpi[], f: (k: Kpi) => number | null | undefined) =>
    rows.reduce((a, k) => a + (f(k) ?? 0), 0);

  const students = sum(latest, (k) => k.headcount);
  const completions = sum(latest, (k) => k.completions);
  const drops = sum(latest, (k) => k.drops);
  const gpaRows = latest.filter((k) => k.avg_gpa != null);
  const avgGpa = gpaRows.length ? sum(gpaRows, (k) => k.avg_gpa) / gpaRows.length : 0;

  const publications = sum(kpis, (k) => k.publications);
  const citations = sum(kpis, (k) => k.citations);
  const oaRows = kpis.filter((k) => k.pct_open_access != null);
  const openAccessPct = oaRows.length ? sum(oaRows, (k) => k.pct_open_access) / oaRows.length : 0;

  const byDepartment = Object.values(
    latest.reduce<Record<string, { department: string; students: number; completions: number; drops: number }>>(
      (acc, k) => {
        const d = k.department_id ?? "—";
        acc[d] ??= { department: d, students: 0, completions: 0, drops: 0 };
        acc[d].students += k.headcount ?? 0;
        acc[d].completions += k.completions ?? 0;
        acc[d].drops += k.drops ?? 0;
        return acc;
      },
      {},
    ),
  );

  const pubsByYear = Object.values(
    kpis.reduce<Record<number, { year: number; publications: number; citations: number }>>((acc, k) => {
      acc[k.academic_year] ??= { year: k.academic_year, publications: 0, citations: 0 };
      acc[k.academic_year].publications += k.publications ?? 0;
      acc[k.academic_year].citations += k.citations ?? 0;
      return acc;
    }, {}),
  ).sort((a, b) => a.year - b.year);

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
    },
    byDepartment,
    pubsByYear,
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
