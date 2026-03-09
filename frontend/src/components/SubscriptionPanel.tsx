import { Card, CardContent } from "./ui/card";
import { useState } from "react";
import { ResidentsManager } from "./ResidentsManager";

interface SubscriptionPanelProps {
  siteName?: string;
}

export function SubscriptionPanel({
  siteName = "All Sites"
}: SubscriptionPanelProps) {
  return (
    <ResidentsManager siteName={siteName} />
  );
}
