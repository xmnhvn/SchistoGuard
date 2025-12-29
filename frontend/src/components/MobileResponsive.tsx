import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import SensorCard from "./SensorCard";
import { AlertItem } from "./AlertItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Bell, 
  MapPin as MapPinIcon, 
  Home, 
  AlertTriangle,
  Menu,
  X
} from "lucide-react";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />
      )}

      <div className={`lg:hidden fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-schistoguard-navy">Menu</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <MapPinIcon className="w-4 h-4 mr-2" />
              Map View
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Bell className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </nav>
        </div>
      </div>
    </>
  );
}

export function ResponsiveDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [readings, setReadings] = useState<any[]>([]);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/sensors/history");
        const data = await res.json();
        setReadings(data);
        if (data && data.length > 0) setLatestReading(data[data.length - 1]);
      } catch {
        setReadings([]);
        setLatestReading(null);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("http://localhost:3001/api/alerts")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAlerts(data);
          }
        })
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-schistoguard-light-bg">
        <MobileNavigation />
        <div className="pt-16 pb-4 px-4 bg-white border-b">
          <h1 className="text-xl font-semibold text-schistoguard-navy">SchistoGuard</h1>
          <p className="text-sm text-muted-foreground">Water Quality Monitoring</p>
        </div>
        <div className="px-4 py-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sites">Sites</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-schistoguard-navy">{readings.length}</div>
                    <div className="text-xs text-muted-foreground">Total Readings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-red-500">{alerts.length}</div>
                    <div className="text-xs text-muted-foreground">Alerts</div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">System Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Safe Sites</span>
                      <Badge className="bg-status-safe text-white">{readings.filter(r => r.turbidity <= 5).length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Warning Sites</span>
                      <Badge className="bg-status-warning text-black">{readings.filter(r => r.turbidity > 5 && r.turbidity <= 15).length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Sites</span>
                      <Badge className="bg-status-critical text-white">{readings.filter(r => r.turbidity > 15).length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="sites" className="space-y-4 mt-4">
              {latestReading && (
                <SensorCard
                  readings={latestReading}
                  summary={{
                    avgTurbidity: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.turbidity ?? 0), 0) / readings.length) : 0,
                    avgTemperature: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.temperature ?? 0), 0) / readings.length) : 0,
                    avgPh: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.ph ?? 0), 0) / readings.length) : 0,
                    totalReadings: readings.length
                  }}
                />
              )}
            </TabsContent>
            <TabsContent value="alerts" className="space-y-4 mt-4">
              {alerts.length > 0 ? alerts.map(alert => (
                <AlertItem key={alert.id} {...alert} />
              )) : <div className="text-center text-gray-500">No alerts</div>}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-schistoguard-light-bg p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">SchistoGuard Desktop</h1>
        <p className="text-muted-foreground mb-8">Full desktop experience with sidebar navigation</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {latestReading && (
              <SensorCard
                readings={latestReading}
                summary={{
                  avgTurbidity: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.turbidity ?? 0), 0) / readings.length) : 0,
                  avgTemperature: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.temperature ?? 0), 0) / readings.length) : 0,
                  avgPh: readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.ph ?? 0), 0) / readings.length) : 0,
                  totalReadings: readings.length
                }}
              />
            )}
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  {alerts.length > 0 ? alerts.map(alert => (
                    <AlertItem key={alert.id} {...alert} />
                  )) : <div className="text-center text-gray-500">No alerts</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BreakpointIndicator() {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black text-white px-2 py-1 rounded text-xs font-mono">
      <span className="sm:hidden">xs</span>
      <span className="hidden sm:inline md:hidden">sm</span>
      <span className="hidden md:inline lg:hidden">md</span>
      <span className="hidden lg:inline xl:hidden">lg</span>
      <span className="hidden xl:inline 2xl:hidden">xl</span>
      <span className="hidden 2xl:inline">2xl</span>
    </div>
  );
}