import { SubscriptionPanel } from "./SubscriptionPanel";

interface SettingsPageProps {
  siteName?: string;
}

export function SettingsPage({ siteName = "Mang Jose's Fish Pond" }: SettingsPageProps) {
  return (
    <div className="min-h-screen bg-schistoguard-light-bg p-6">
      <div className="max-w-6xl mx-auto">
        <SubscriptionPanel siteName={siteName} />
      </div>
    </div>
  );
}
