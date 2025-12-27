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
            <SensorCard
              readings={{
                ...latestReading,
                temperature: liveTemperature !== null ? liveTemperature : latestReading.temperature,
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

              {/* Total Readings Card */}
              <Card className="h-60">
                <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 h-full">
                  <CardTitle className="text-md font-medium">Total Readings</CardTitle>
                  <TrendingUp className="h-10 w-10 text-green-500" />
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="text-3xl font-bold text-schistoguard-navy text-center">{hourlyReadings.length}</div>
                  <p className="text-sm text-muted-foreground mt-6 mb-2 text-center">
                    Last 24 hours
                  </p>
                </CardContent>
              </Card>

              {/* Risk Level Card */}
              <Card className="h-60">
                <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 h-full">
                  <CardTitle className="text-md font-medium">Risk Level</CardTitle>
                  <Droplets className={
                    siteData.riskLevel === 'safe'
                      ? 'h-10 w-10 text-green-500'
                      : siteData.riskLevel === 'warning'
                      ? 'h-10 w-10 text-yellow-500'
                      : 'h-10 w-10 text-red-500'
                  } />
                </CardHeader>
                <CardContent className="flex flex-col items-center mt-[-32px] justify-center h-full">
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
                  <p className="text-sm text-muted-foreground mt-6 mb-2 text-center">
                    Based on turbidity
                  </p>
                </CardContent>
              </Card>
            </div>
          {/* Removed Current Water Quality card and SensorCard */}
        </div>
        {/* Right column: Alerts Stream */}
        <div ref={alertsStreamRef} className="w-full lg:w-[380px] flex-shrink-0 flex flex-col scrollbar-hide mt-2" style={{ maxWidth: 380 }}>
          <Card className="flex flex-col h-full flex-1">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm font-bold">
                Alerts Stream
                <Badge variant="secondary">{unacknowledgedAlerts} unread</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 mt-0 flex-1 p-4 h-full" style={{ overflow: 'hidden' }}>
              <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-3 h-full" style={{ maxHeight: '100%' }}>
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
