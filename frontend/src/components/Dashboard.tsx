import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SensorCard } from "./SensorCard";
import { AlertItem } from "./AlertItem";
import { MapPin } from "./MapPin";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  MapPinIcon, 
  Search,
  Filter,
  Download,
  TrendingUp,
  Droplets,
  Bell
} from "lucide-react";
import { useState } from "react";

// Generate hourly readings for the past 24 hours
const generateHourlyReadings = () => {
  const readings = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Simulate realistic variations throughout the day
    const baseTemp = 26 + Math.sin(hour / 24 * Math.PI * 2) * 3;
    const baseTurbidity = 4.5 + Math.random() * 2;
    const basePh = 7.0 + (Math.random() - 0.5) * 0.4;
    
    readings.push({
      timestamp: timestamp.toISOString(),
      turbidity: parseFloat(baseTurbidity.toFixed(1)),
      temperature: parseFloat(baseTemp.toFixed(1)),
      ph: parseFloat(basePh.toFixed(1))
    });
  }
  
  return readings;
};

const hourlyReadings = generateHourlyReadings();
const latestReading = hourlyReadings[hourlyReadings.length - 1];

// Mock site data - single location
const siteData: {
  id: string;
  siteName: string;
  barangay: string;
  municipality: string;
  area: string;
  readings: typeof latestReading;
  riskLevel: "critical" | "warning" | "safe";
  timestamp: string;
  trend: "stable";
} = {
  id: "site-1",
  siteName: "Mang Jose's Fish Pond",
  barangay: "San Miguel",
  municipality: "Tacloban City",
  area: "100 sq meters",
  readings: latestReading,
  riskLevel: latestReading.turbidity > 15 ? "critical" : latestReading.turbidity > 5 ? "warning" : "safe",
  timestamp: new Date(latestReading.timestamp).toLocaleString(),
  trend: "stable"
};

const mockAlerts = [
  {
    id: "alert-1",
    level: "warning" as const,
    message: "Turbidity levels slightly elevated during morning hours",
    siteName: "Mang Jose's Fish Pond",
    parameter: "Turbidity",
    value: "5.8 NTU",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
    isAcknowledged: false
  },
  {
    id: "alert-2", 
    level: "warning" as const,
    message: "Temperature readings elevated during midday",
    siteName: "Mang Jose's Fish Pond", 
    parameter: "Temperature",
    value: "28.2°C",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toLocaleString(),
    isAcknowledged: true
  },
  {
    id: "alert-3",
    level: "critical" as const,
    message: "Turbidity levels critically high!",
    siteName: "Mang Jose's Fish Pond",
    parameter: "Turbidity",
    value: "16.2 NTU",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toLocaleString(),
    isAcknowledged: false
  }
];

export function Dashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [alerts, setAlerts] = useState(mockAlerts);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.isAcknowledged).length;
  const criticalAlerts = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

  // Calculate 24-hour averages
  const avgTurbidity = (hourlyReadings.reduce((sum, r) => sum + r.turbidity, 0) / hourlyReadings.length).toFixed(1);
  const avgTemperature = (hourlyReadings.reduce((sum, r) => sum + r.temperature, 0) / hourlyReadings.length).toFixed(1);
  const avgPh = (hourlyReadings.reduce((sum, r) => sum + r.ph, 0) / hourlyReadings.length).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-0">Mang Jose's Fish Pond</h1>
          <p className="text-gray-600">100 square meters • San Miguel, Tacloban City</p>
          <p className="text-sm text-gray-500">Data updates every hour • Last update: {siteData.timestamp}</p>
        </div>
        <Button 
          size="sm" 
          className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 h-10 flex items-center self-start"
          onClick={() => onNavigate?.("alerts")}
        >
          <Bell className="w-4 h-4 mr-2" />
          Alerts (3)
        </Button>
      </div>

      {/* Main Section: Left column (summary cards + Current Water Quality), Right column (Alerts Stream) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left column: summary cards + Current Water Quality */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{unacknowledgedAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  {criticalAlerts} critical alerts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-schistoguard-navy">{hourlyReadings.length}</div>
                <p className="text-xs text-muted-foreground">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge 
                  className={
                    siteData.riskLevel === 'safe' 
                      ? 'bg-status-safe hover:bg-status-safe/80 text-white' 
                      : siteData.riskLevel === 'warning'
                      ? 'bg-status-warning hover:bg-status-warning/80 text-black'
                      : 'bg-status-critical hover:bg-status-critical/80 text-white'
                  }
                >
                  {siteData.riskLevel.toUpperCase()}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on turbidity
                </p>
              </CardContent>
            </Card>
          </div>
          {/* Current Water Quality below summary cards */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Water Quality</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SensorCard
                siteName={siteData.siteName}
                barangay={siteData.barangay}
                readings={siteData.readings}
                riskLevel={siteData.riskLevel}
                timestamp={siteData.timestamp}
                trend={siteData.trend}
              />
            </CardContent>
          </Card>
        </div>
        {/* Right column: Alerts Stream */}
        <div className="lg:max-w-[200px] h-[00px] flex-shrink-0">
          <Card className="self-start">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm font-bold">
                Alerts Stream
                <Badge variant="secondary">{unacknowledgedAlerts} unread</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 mt-0 max-h-[250px] overflow-y-auto">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  {...alert}
                  onAcknowledge={handleAcknowledgeAlert}
                />
              ))}
              {alerts.length === 0 && (
                <p className="text-center text-gray-500 py-4">No alerts</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
