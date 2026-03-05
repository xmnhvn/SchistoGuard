import { SubscriptionPanel } from "./SubscriptionPanel";

interface SettingsPageProps {
  siteName?: string;
}

export function SettingsPage({ siteName = "All Sites" }: SettingsPageProps) {
  return (
    <div className="min-h-screen bg-schistoguard-light-bg p-6">
      <SubscriptionPanel siteName={siteName} />
    </div>
  );
}
