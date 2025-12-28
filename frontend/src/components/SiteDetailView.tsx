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
  console.log("SiteDetailView mounted");
  const [timeRange, setTimeRange] = useState("24h");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // Fetch 5-min interval readings from backend
    fetch("http://localhost:3001/api/sensors/history")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch time series data");
        return res.json();
      })
      .then(data => {
        console.log("Site Details time series data:", data);
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Error fetching time series data:", err);
      });
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
        {/* New Real-Time Monitoring Graph based on time series table */}
        <div className="min-w-0 lg:col-span-2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Real-Time Monitoring (5mins intervals)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-gray-400">No time series data available.</div>
              ) : (
                <div style={{ minHeight: 400, minWidth: 300, width: '100%', height: 475 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="turbidityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007E88" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#007E88" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#28A745" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#28A745" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip labelFormatter={(time) => `Time: ${time}`} />
                      <Area 
                        type="monotone" 
                        dataKey="turbidity" 
                        stroke="#FF6B6B" 
                        strokeWidth={2}
                        fill="url(#turbidityGradient)" 
                        name="Turbidity (NTU)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#007E88" 
                        strokeWidth={2}
                        fill="url(#temperatureGradient)" 
                        name="Temperature (°C)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ph" 
                        stroke="#28A745" 
                        strokeWidth={2}
                        fill="url(#phGradient)" 
                        name="pH Level"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-2 text-center">
                <p>All parameters shown per 5-min interval (from time series table)</p>
                <div className="flex gap-4 mt-2 justify-center">
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 16, height: 4, background: '#FF6B6B', borderRadius: 2 }}></span>
                    Turbidity
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 16, height: 4, background: '#007E88', borderRadius: 2 }}></span>
                    Temperature
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 16, height: 4, background: '#28A745', borderRadius: 2 }}></span>
                    pH Level
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Subscription Panel and Site Info stacked in 3rd column */}
        <div className="space-y-6 w-full max-w-full lg:col-span-1 h-full flex flex-col">
          <SubscriptionPanel 
            siteName={siteName}
            onSave={(settings: any) => console.log('Subscription settings saved:', settings)}
          />
          <Card style={{ flex: 1, height: '100%' }}>
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