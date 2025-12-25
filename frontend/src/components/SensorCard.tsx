import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MoreHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface SensorReading {
  turbidity: number;
  temperature: number;
  ph: number;
}

interface SensorCardProps {
  siteName: string;
  barangay: string;
  readings: SensorReading;
  riskLevel: "safe" | "warning" | "critical";
  timestamp: string;
  trend?: "up" | "down" | "stable";
}

function getRiskBadgeVariant(risk: string) {
  switch (risk) {
    case "safe": return "default";
    case "warning": return "secondary";
    case "critical": return "destructive";
    default: return "default";
  }
}

function getRiskBadgeStyle(risk: string) {
  switch (risk) {
    case "safe": return "bg-status-safe hover:bg-status-safe/80 text-white";
    case "warning": return "bg-status-warning hover:bg-status-warning/80 text-black";
    case "critical": return "bg-status-critical hover:bg-status-critical/80 text-white";
    default: return "";
  }
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3 h-3 text-red-500" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3 text-green-500" />;
  return <Minus className="w-3 h-3 text-gray-400" />;
}

export function SensorCard({ siteName, barangay, readings, riskLevel, timestamp, trend }: SensorCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{siteName}</h3>
            <p className="text-sm text-muted-foreground">{barangay}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getRiskBadgeVariant(riskLevel)}
              className={getRiskBadgeStyle(riskLevel)}
            >
              {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 p-0 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Export Data</DropdownMenuItem>
                <DropdownMenuItem>Configure Alerts</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Turbidity</span>
              <TrendIcon trend={trend} />
            </div>
            <p className="text-lg font-medium">{readings.turbidity} NTU</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Temperature</span>
            <p className="text-lg font-medium">{readings.temperature}°C</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">pH Level</span>
            <p className="text-lg font-medium">{readings.ph}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Last updated: {timestamp}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
