import { SubscriptionPanel } from "./SubscriptionPanel";

interface SettingsPageProps {
  siteName?: string;
}

export function SettingsPage({ siteName = "All Sites" }: SettingsPageProps) {
  return (
    <SubscriptionPanel siteName={siteName} />
  );
}
