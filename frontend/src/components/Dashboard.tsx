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
  Droplets
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
const siteData = {
  id: "site-1",
  siteName: "Mang Jose's Fish Pond",
  barangay: "San Miguel",
  municipality: "Tacloban City",
  area: "100 sq meters",
  readings: latestReading,
  riskLevel: latestReading.turbidity > 15 ? "critical" : latestReading.turbidity > 5 ? "warning" : "safe",
  timestamp: new Date(latestReading.timestamp).toLocaleString(),
  trend: "stable" as const
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
  }
];

export function Dashboard() {
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
      <div>
        <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">Mang Jose's Fish Pond</h1>
        <p className="text-gray-600">100 square meters • San Miguel, Tacloban City</p>
        <p className="text-sm text-gray-500">Data updates every hour • Last update: {siteData.timestamp}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monitoring active
            </p>
          </CardContent>
        </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Readings */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* 24-Hour Averages */}
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Average Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Turbidity</p>
                  <p className="text-2xl font-bold text-schistoguard-navy">{avgTurbidity}</p>
                  <p className="text-xs text-gray-500">NTU</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Temperature</p>
                  <p className="text-2xl font-bold text-schistoguard-navy">{avgTemperature}</p>
                  <p className="text-xs text-gray-500">°C</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">pH Level</p>
                  <p className="text-2xl font-bold text-schistoguard-navy">{avgPh}</p>
                  <p className="text-xs text-gray-500">pH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Alerts & Map */}
        <div className="space-y-4">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Alerts Stream
                <Badge variant="secondary">{unacknowledgedAlerts} unread</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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

          {/* Mini Map */}
          <Card>
            <CardHeader>
              <CardTitle>Site Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <div className="absolute inset-4 bg-blue-50 rounded border-2 border-dashed border-blue-200 flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center">
                    <p>Mang Jose's Fish Pond</p>
                    <p className="text-xs mt-1">100 sq meters</p>
                  </div>
                </div>
                
                {/* Single pin in center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <MapPin riskLevel={siteData.riskLevel} size="md" siteName="Fish Pond" />
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Open Full Map
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
