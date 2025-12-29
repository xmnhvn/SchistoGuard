import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import SensorCard from "./SensorCard";
import { AlertItem } from "./AlertItem";
import { MapPin, MapPinDetailed } from "./MapPin";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { Shield, Home, AlertTriangle, Settings, Bell, Download, Search, Mail, Lock } from "lucide-react";

const mockSensorData = {
  readings: {
    turbidity: 18.2,
    temperature: 29.5,
    ph: 7.2
  },
  summary: {
    avgTurbidity: 18.2,
    avgTemperature: 29.5,
    avgPh: 7.2,
    totalReadings: 1
  }
};

const mockAlert = {
  id: "1",
  level: "critical" as "critical" | "warning",
  message: "Turbidity levels have exceeded safe thresholds at Barangay San Miguel River.",
  siteName: "Barangay San Miguel River",
  parameter: "Turbidity",
  value: "18.2 NTU",
  timestamp: new Date().toISOString(),
  isAcknowledged: false
};

export function DesignSystem() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 bg-schistoguard-teal rounded-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-schistoguard-navy">SchistoGuard</h1>
            <p className="text-sm text-muted-foreground">Design System & Component Library</p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A comprehensive UI kit for water quality monitoring applications with responsive components, 
          accessibility features, and real-time data visualization capabilities.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Brand Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-16 bg-schistoguard-teal rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Primary Teal</p>
                <p className="text-muted-foreground">#007E88</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-16 bg-schistoguard-green rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Secondary Green</p>
                <p className="text-muted-foreground">#28A745</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-16 bg-schistoguard-coral rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Accent Coral</p>
                <p className="text-muted-foreground">#FF6B6B</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-16 bg-schistoguard-navy rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Dark Navy</p>
                <p className="text-muted-foreground">#0F2135</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-16 bg-schistoguard-light-bg rounded-md mb-2 border"></div>
              <div className="text-sm">
                <p className="font-medium">Light Gray BG</p>
                <p className="text-muted-foreground">#F8F9FA</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Status Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-12 bg-status-safe rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Safe Status</p>
                <p className="text-muted-foreground">#28A745</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-12 bg-status-warning rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Warning Status</p>
                <p className="text-muted-foreground">#FFC107</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-full h-12 bg-status-critical rounded-md mb-2"></div>
              <div className="text-sm">
                <p className="font-medium">Critical Status</p>
                <p className="text-muted-foreground">#FF6B6B</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Typography</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-schistoguard-navy">H1 Heading - Main page titles</h1>
              <h2 className="text-schistoguard-navy">H2 Heading - Section headers</h2>
              <h3 className="text-schistoguard-navy">H3 Heading - Component titles</h3>
              <p>Body text - Regular content and descriptions</p>
              <p className="text-sm text-muted-foreground">Small text - Secondary information and captions</p>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>Font Family: Inter (system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")</p>
              <p>Base Size: 16px • Line Height: 1.5 • Weight: 400 normal, 500 medium</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Button Components</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium">Primary Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-schistoguard-teal hover:bg-schistoguard-teal/90">
                  Primary Button
                </Button>
                <Button className="bg-schistoguard-teal hover:bg-schistoguard-teal/90" disabled>
                  Disabled Primary
                </Button>
                <Button size="sm" className="bg-schistoguard-teal hover:bg-schistoguard-teal/90">
                  Small Primary
                </Button>
                <Button size="lg" className="bg-schistoguard-teal hover:bg-schistoguard-teal/90">
                  Large Primary
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Secondary Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive Button</Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Icon Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-schistoguard-teal hover:bg-schistoguard-teal/90">
                  <Bell className="w-4 h-4 mr-2" />
                  With Icon
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Input Components</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Basic Input</label>
                <Input placeholder="Enter text here..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Input</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search sites..." className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Input</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="email" placeholder="email@example.com" className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password Input</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="password" placeholder="Password" className="pl-10" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Badge Components</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium">Status Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-status-safe hover:bg-status-safe/80 text-white">Safe</Badge>
                <Badge className="bg-status-warning hover:bg-status-warning/80 text-black">Warning</Badge>
                <Badge className="bg-status-critical hover:bg-status-critical/80 text-white">Critical</Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Standard Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Icon Set</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4">
              {[
                { icon: Home, name: "Home" },
                { icon: AlertTriangle, name: "Alert" },
                { icon: Bell, name: "Bell" },
                { icon: Settings, name: "Settings" },
                { icon: Download, name: "Download" },
                { icon: Search, name: "Search" },
                { icon: Mail, name: "Mail" },
                { icon: Lock, name: "Lock" },
                { icon: Shield, name: "Shield" }
              ].map(({ icon: Icon, name }) => (
                <div key={name} className="text-center space-y-2">
                  <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-md">
                    <Icon className="w-5 h-5 text-schistoguard-navy" />
                  </div>
                  <p className="text-xs text-muted-foreground">{name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Map Pin Components</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium">Basic Map Pins</h3>
              <div className="flex items-center gap-8 p-4 bg-gray-50 rounded-md">
                <div className="text-center space-y-2">
                  <MapPin riskLevel="safe" />
                  <p className="text-xs text-muted-foreground">Safe</p>
                </div>
                <div className="text-center space-y-2">
                  <MapPin riskLevel="warning" />
                  <p className="text-xs text-muted-foreground">Warning</p>
                </div>
                <div className="text-center space-y-2">
                  <MapPin riskLevel="critical" />
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Detailed Map Pins</h3>
              <div className="flex items-end gap-8 p-4 bg-gray-50 rounded-md">
                <MapPinDetailed riskLevel="safe" siteName="Site A" value="3.2" />
                <MapPinDetailed riskLevel="warning" siteName="Site B" value="12.8" />
                <MapPinDetailed riskLevel="critical" siteName="Site C" value="18.2" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Pin Sizes</h3>
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-md">
                <div className="text-center space-y-2">
                  <MapPin riskLevel="safe" size="sm" />
                  <p className="text-xs text-muted-foreground">Small</p>
                </div>
                <div className="text-center space-y-2">
                  <MapPin riskLevel="safe" size="md" />
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
                <div className="text-center space-y-2">
                  <MapPin riskLevel="safe" size="lg" />
                  <p className="text-xs text-muted-foreground">Large</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Complex Components</h2>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sensor Card Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <SensorCard {...mockSensorData} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Alert Item Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                <AlertItem {...mockAlert} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Subscription Panel Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <SubscriptionPanel siteName="Barangay San Miguel River" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Responsive Design</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="font-medium text-green-800">Mobile</h3>
                  <p className="text-green-600">375px minimum</p>
                  <p className="text-xs text-green-600 mt-1">Single column layout, stacked components</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-blue-800">Tablet</h3>
                  <p className="text-blue-600">1024px breakpoint</p>
                  <p className="text-xs text-blue-600 mt-1">Two-column layout, condensed sidebar</p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h3 className="font-medium text-purple-800">Desktop</h3>
                  <p className="text-purple-600">1440px optimal</p>
                  <p className="text-xs text-purple-600 mt-1">Full sidebar, three-column dashboard</p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground border-t pt-4">
                <p>All components use responsive design patterns with Tailwind CSS breakpoints.</p>
                <p>Accessibility: Focus states, keyboard navigation, and &gt;4.5:1 contrast ratios maintained across all components.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-schistoguard-navy">Usage Guidelines</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Water Quality Thresholds</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• <strong>Turbidity:</strong> Safe ≤5 NTU, Warning 6–15 NTU, Critical &gt;15 NTU</p>
                  <p>• <strong>Temperature:</strong> Normal 22–30°C</p>
                  <p>• <strong>pH:</strong> Normal 6.5–8.0</p>
                  <p>• <strong>UV Index:</strong> Low risk &lt;3, High risk &gt;6</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Component Usage</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• Use SensorCard for displaying real-time monitoring data</p>
                  <p>• AlertItem components should have clear acknowledge actions</p>
                  <p>• MapPin variants should match risk levels consistently</p>
                  <p>• Subscription panels should be contextual to specific sites</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Accessibility</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• All interactive elements have focus indicators</p>
                  <p>• Color coding is supplemented with text labels</p>
                  <p>• Keyboard navigation supported throughout</p>
                  <p>• Screen reader compatible with ARIA labels</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}