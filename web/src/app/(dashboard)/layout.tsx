import { TopBar } from "@/components/TopBar";
import { SectionNav } from "@/components/SectionNav";
import { getProfile } from "@/lib/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <TopBar name={profile?.full_name ?? profile?.email} role={profile?.app_role} />
      <div className="mx-auto max-w-6xl px-6 py-7">
        <SectionNav />
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
