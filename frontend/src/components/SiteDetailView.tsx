import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { AlertItem } from "./AlertItem";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowLeft, Download, Settings, Bell, Calendar, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { useEffect } from "react";
// TODO: Fetch real time series, history, and alerts from backend


export interface SiteDetailViewProps {
  siteId: string;
  siteName?: string;
  barangay?: string;
  currentRisk?: "safe" | "warning" | "critical";
  onBack?: () => void;
}

// Alerts will be fetched from backend in the future

export function SiteDetailView({ 
  siteId,
  siteName = "Mang Jose's Fishpond",
  barangay = "Riverside", 
  currentRisk = "critical",
  onBack
}: SiteDetailViewProps) {
  const [timeRange, setTimeRange] = useState("24h");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // Fetch 5-min interval readings from backend
    fetch("http://localhost:3001/api/sensors/history")
      .then(res => res.json())
      .then(data => setHistory(Array.isArray(data) ? data : []));
  }, []);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
    ));
  };

  function getRiskBadgeStyle(risk: string) {
    switch (risk) {
      case "safe": return "bg-status-safe hover:bg-status-safe/80 text-white";
      case "warning": return "bg-status-warning hover:bg-status-warning/80 text-black";
      case "critical": return "bg-status-critical hover:bg-status-critical/80 text-white";
      default: return "";
    }
  }

  const [infoOpen, setInfoOpen] = useState(false);
  // Prepare chart data for recharts
  const chartData = history.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    turbidity: r.turbidity,
    temperature: r.temperature,
    ph: r.ph ?? 7.2
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Removed Back to Dashboard button */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-schistoguard-navy">{siteName}</h1>
              <Badge className={getRiskBadgeStyle(currentRisk)}>
                {currentRisk.charAt(0).toUpperCase() + currentRisk.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 min-w-[260px]">
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="72h">Last 72h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="default">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts Area (span 2 columns) */}
        <div className="min-w-0 lg:col-span-2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Real-time Monitoring ({timeRange})</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="turbidity" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="turbidity">Turbidity</TabsTrigger>
                  <TabsTrigger value="temperature">Temperature</TabsTrigger>
                  <TabsTrigger value="ph">pH Level</TabsTrigger>
                </TabsList>
                
                <TabsContent value="turbidity" className="space-y-4 min-h-96">
                  {chartData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center text-gray-400">No turbidity data available.</div>
                  ) : (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="turbidityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => [`${value} NTU`, "Turbidity"]}
                            labelFormatter={(time) => `Time: ${time}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="turbidity" 
                            stroke="#FF6B6B" 
                            strokeWidth={2}
                            fill="url(#turbidityGradient)" 
                          />
                          {/* Threshold lines */}
                          <Line type="monotone" dataKey={() => 5} stroke="#28A745" strokeDasharray="5 5" />
                          <Line type="monotone" dataKey={() => 15} stroke="#ffc107" strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>• Safe: ≤5 NTU (Green line) • Warning: 6-15 NTU (Yellow line) • Critical: &gt;15 NTU</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="temperature" className="space-y-4 min-h-96">
                  {chartData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center text-gray-400">No temperature data available.</div>
                  ) : (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => [`${value}°C`, "Temperature"]}
                            labelFormatter={(time) => `Time: ${time}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="temperature" 
                            stroke="#007E88" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>• Normal range: 22-30°C</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="ph" className="space-y-4 min-h-96">
                  {chartData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center text-gray-400">No pH data available.</div>
                  ) : (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis domain={[6, 8]} />
                          <Tooltip 
                            formatter={(value) => [value, "pH Level"]}
                            labelFormatter={(time) => `Time: ${time}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="ph" 
                            stroke="#28A745" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>• Normal range: 6.5-8.0</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Subscription Panel and Site Info stacked in 3rd column */}
        <div className="space-y-6 w-full max-w-full lg:col-span-1">
          <SubscriptionPanel 
            siteName={siteName}
            onSave={(settings: any) => console.log('Subscription settings saved:', settings)}
          />
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Location:</span>
                  <p className="text-muted-foreground">{barangay}, Leyte Province</p>
                </div>
                <div>
                  <span className="font-medium">Coordinates:</span>
                  <p className="text-muted-foreground">11.2436° N, 124.9936° E</p>
                </div>
                <div>
                  <span className="font-medium">Installation Date:</span>
                  <p className="text-muted-foreground">March 15, 2025</p>
                </div>
                <div>
                  <span className="font-medium">Last Maintenance:</span>
                  <p className="text-muted-foreground">September 10, 2025</p>
                </div>
                <div>
                  <span className="font-medium">Sensor Type:</span>
                  <p className="text-muted-foreground">Multi-parameter Water Quality</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}