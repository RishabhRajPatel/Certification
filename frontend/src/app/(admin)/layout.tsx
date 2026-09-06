import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      companyName={settings.companyName}
    >
      {children}
    </AppShell>
  );
}
