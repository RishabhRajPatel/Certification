import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { SessionInfo } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Flash } from "@/components/flash";
import { SettingsClient } from "@/components/settings-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const sp = await searchParams;
  const [settings, sessions] = await Promise.all([
    getSettings(),
    apiGet<SessionInfo[]>("/auth/sessions"),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Company profile, document defaults and account security." />
      <Flash code={sp.flash} />
      <SettingsClient settings={settings} sessions={sessions ?? []} />
    </div>
  );
}
