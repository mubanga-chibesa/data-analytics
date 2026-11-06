import { Sidebar } from "@/components/Sidebar";
import { getProfile } from "@/lib/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  return (
    <div className="flex">
      <Sidebar name={profile?.full_name ?? profile?.email} role={profile?.app_role} />
      <main className="h-dvh flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
