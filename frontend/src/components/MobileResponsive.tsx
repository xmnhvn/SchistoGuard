import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { SensorCard } from "./SensorCard";
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

// Mobile-first responsive components demonstrating the UI kit at different breakpoints
export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
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

      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />
      )}

      {/* Mobile navigation panel */}
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

  const mockSensorData = {
    siteName: "Barangay San Miguel River",
    barangay: "San Miguel",
    readings: { turbidity: 3.2, temperature: 26.5, ph: 7.1 },
    riskLevel: "safe" as const,
    timestamp: "2025-09-20 14:30",
    trend: "stable" as const
  };

  const mockAlert = {
    id: "alert-demo",
    level: "warning" as const,
    message: "Temperature readings elevated above normal range",
    siteName: "Barangay Malinao Canal",
    parameter: "Temperature",
    value: "28.2°C",
    timestamp: "2025-09-20 13:45",
    isAcknowledged: false
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-schistoguard-light-bg">
        <MobileNavigation />
        
        {/* Mobile header */}
        <div className="pt-16 pb-4 px-4 bg-white border-b">
          <h1 className="text-xl font-semibold text-schistoguard-navy">SchistoGuard</h1>
          <p className="text-sm text-muted-foreground">Water Quality Monitoring</p>
        </div>

        {/* Mobile tabs */}
        <div className="px-4 py-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sites">Sites</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Mobile summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-schistoguard-navy">5</div>
                    <div className="text-xs text-muted-foreground">Active Sites</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-bold text-red-500">2</div>
                    <div className="text-xs text-muted-foreground">Alerts</div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Mobile status indicators */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">System Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Safe Sites</span>
                      <Badge className="bg-status-safe text-white">3</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Warning Sites</span>
                      <Badge className="bg-status-warning text-black">2</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Sites</span>
                      <Badge className="bg-status-critical text-white">0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sites" className="space-y-4 mt-4">
              <SensorCard {...mockSensorData} />
              <SensorCard 
                {...mockSensorData} 
                siteName="Barangay Malinao Canal"
                barangay="Malinao"
                riskLevel="warning"
                readings={{ turbidity: 12.8, temperature: 28.2, ph: 6.8 }}
                trend="up"
              />
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4 mt-4">
              <AlertItem {...mockAlert} />
              <AlertItem 
                {...mockAlert}
                id="alert-2"
                level="critical"
                message="Turbidity levels critically high"
                parameter="Turbidity"
                value="18.2 NTU"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop view fallback
  return (
    <div className="min-h-screen bg-schistoguard-light-bg p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">SchistoGuard Desktop</h1>
        <p className="text-muted-foreground mb-8">Full desktop experience with sidebar navigation</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SensorCard {...mockSensorData} />
            <SensorCard 
              {...mockSensorData} 
              siteName="Barangay Malinao Canal"
              barangay="Malinao"
              riskLevel="warning"
              readings={{ turbidity: 12.8, temperature: 28.2, ph: 6.8 }}
              trend="up"
            />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  <AlertItem {...mockAlert} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Breakpoint indicator for development
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