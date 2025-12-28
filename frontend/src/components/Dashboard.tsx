import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import SensorCard from "./SensorCard";
import { AlertItem } from "./AlertItem";
import { MapPin } from "./MapPin";
import { 
  AlertTriangle, 
  TrendingUp,
  Droplets,
  Bell
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Generate readings every 5 minutes for the past 24 hours
const generateFiveMinReadings = () => {
  const readings = [];
  const now = new Date();
  const intervals = 24 * 60 / 5; // 288 readings for 24 hours
  for (let i = intervals - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
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

const fiveMinReadings = generateFiveMinReadings();
const latestReading = fiveMinReadings[fiveMinReadings.length - 1];

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
  const [liveTemperature, setLiveTemperature] = useState<number | null>(null);
  const waterQualityRef = useRef<HTMLDivElement>(null);
  const alertsStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch temperature from backend every 5 seconds
    const fetchTemperature = () => {
      fetch("http://localhost:3001/api/sensors/latest")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.temperature === "number") {
            setLiveTemperature(data.temperature);
          }
        })
        .catch(() => {});
    };
    fetchTemperature();
    const interval = setInterval(fetchTemperature, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const setHeight = () => {
      if (waterQualityRef.current && alertsStreamRef.current) {
        const height = waterQualityRef.current.offsetHeight;
        alertsStreamRef.current.style.height = height + "px";
      }
    };
    setHeight();
    if (waterQualityRef.current) {
      const resizeObserver = new window.ResizeObserver(setHeight);
      resizeObserver.observe(waterQualityRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [alerts]);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  // Only count unacknowledged alerts for temperature (real data), both warning and critical
  const unacknowledgedAlerts = alerts.filter(
    alert =>
      !alert.isAcknowledged &&
      alert.parameter === "Temperature" &&
      (alert.level === "critical" || alert.level === "warning")
  ).length;
  const criticalAlerts = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

  // Calculate 24-hour averages
  const avgTurbidity = (fiveMinReadings.reduce((sum, r) => sum + r.turbidity, 0) / fiveMinReadings.length).toFixed(1);
  const avgTemperature = (fiveMinReadings.reduce((sum, r) => sum + r.temperature, 0) / fiveMinReadings.length).toFixed(1);
  const avgPh = (fiveMinReadings.reduce((sum, r) => sum + r.ph, 0) / fiveMinReadings.length).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">Mang Jose's Fish Pond</h1>
          <p className="text-gray-600 mb-2">100 square meters • San Miguel, Tacloban City</p>
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

      {/* Main Section: Left column (sensor cards + summary cards), Right column (Alerts Stream) */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch" style={{ minHeight: 320 }}>
        <div className="flex-1 flex flex-col">
          {/* Sensor Data UI at the top */}
          <div className="mb-6 mt-2">
            {/* Only temperature is real, turbidity and pH are mock for now */}
            <SensorCard
              readings={{
                temperature: liveTemperature !== null ? liveTemperature : latestReading.temperature,
                turbidity: 8.5, // mock value
                ph: 7.2 // mock value
              }}
            />
          </div>
          {/* Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Active Alerts Card */}
              <Card className="h-60">
                <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 h-full">
                  <CardTitle className="text-md font-medium">Active Alerts</CardTitle>
                  <AlertTriangle className="h-10 w-10 text-yellow-500" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-3xl font-bold text-red-500 text-center">{unacknowledgedAlerts}</div>
                  <p className="text-sm text-muted-foreground mt-6 mb-2 text-center">
                    Critical alerts
                  </p>
                </CardContent>
              </Card>

              {/* Total Readings Card (all parameters) */}
              <Card className="h-60">
                <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 h-full">
                  <CardTitle className="text-md font-medium">Total Parameter Readings</CardTitle>
                  <TrendingUp className="h-10 w-10 text-green-500" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-3xl font-bold text-schistoguard-navy text-center">{fiveMinReadings.length}</div>
                  <p className="text-sm text-muted-foreground mt-6 mb-2 text-center">
                    Total readings (5 min interval, last 24 hours)
                  </p>
                </CardContent>
              </Card>

              {/* Risk Level Card (based on all parameters) */}
              {(() => {
                // Use real temperature, mock turbidity and pH
                const temp = liveTemperature !== null ? liveTemperature : latestReading.temperature;
                const turbidity = 8.5; // mock
                const ph = 7.2; // mock

                // Determine risk for each
                let tempRisk: 'critical' | 'warning' | 'safe' = 'safe';
                if (temp >= 22 && temp <= 28) tempRisk = 'critical';
                else if ((temp >= 20 && temp < 22) || (temp > 28 && temp <= 32)) tempRisk = 'warning';

                let turbidityRisk: 'critical' | 'warning' | 'safe' = 'safe';
                if (turbidity > 15) turbidityRisk = 'critical';
                else if (turbidity > 5) turbidityRisk = 'warning';

                let phRisk: 'critical' | 'warning' | 'safe' = 'safe';
                if (ph < 6.5 || ph > 8.5) phRisk = 'critical';
                else if ((ph >= 6.5 && ph < 7) || (ph > 8 && ph <= 8.5)) phRisk = 'warning';

                // Highest risk wins: critical > warning > safe
                let overallRisk: 'critical' | 'warning' | 'safe' = 'safe';
                if ([tempRisk, turbidityRisk, phRisk].includes('critical')) overallRisk = 'critical';
                else if ([tempRisk, turbidityRisk, phRisk].includes('warning')) overallRisk = 'warning';

                let badgeClass = overallRisk === 'critical'
                  ? 'bg-status-critical hover:bg-status-critical/80 text-white'
                  : overallRisk === 'warning'
                  ? 'bg-status-warning hover:bg-status-warning/80 text-black'
                  : 'bg-status-safe hover:bg-status-safe/80 text-white';
                let iconClass = overallRisk === 'critical'
                  ? 'h-10 w-10 text-red-500'
                  : overallRisk === 'warning'
                  ? 'h-10 w-10 text-yellow-500'
                  : 'h-10 w-10 text-green-500';

                return (
                  <Card className="h-60">
                    <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 h-full">
                      <CardTitle className="text-md font-medium">Risk Level</CardTitle>
                      <Droplets className={iconClass} />
                    </CardHeader>
                    <CardContent className="flex flex-col items-center mt-[-32px] justify-center h-full">
                      <Badge className={badgeClass}>{overallRisk.toUpperCase()}</Badge>
                      <p className="text-sm text-muted-foreground mt-6 mb-2 text-center">
                        Based on temperature, turbidity, and pH
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          {/* Removed Current Water Quality card and SensorCard */}
        </div>
        {/* Right column: Alerts Stream */}
        <div ref={alertsStreamRef} className="w-full lg:w-[380px] flex-shrink-0 flex flex-col scrollbar-hide mt-2" style={{ maxWidth: 380 }}>
          <Card className="flex flex-col h-60 border rounded-md">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm font-bold">
                Alerts Stream
                <Badge variant="secondary">{unacknowledgedAlerts} unread</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 mt-0 flex-1 p-4 h-full">
              <div className="overflow-y-auto scrollbar-hide flex flex-col gap-3 h-44">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
