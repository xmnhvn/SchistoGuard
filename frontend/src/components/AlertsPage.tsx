import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { AlertItem } from "./AlertItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Calendar,
  MapPin as MapPinIcon,
  Bell,
  ChevronLeft
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";



export function AlertsPage({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("http://localhost:3001/api/sensors/alerts")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAlerts(data.filter(alert => ["Temperature", "Turbidity", "pH"].includes(alert.parameter)));
          }
        })
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterBarangay, setFilterBarangay] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAlerts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "alerts_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { 
        ...alert, 
        isAcknowledged: true,
        acknowledgedBy: "Current User (LGU)"
      } : alert
    ));
  };


  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.parameter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "acknowledged" && alert.isAcknowledged) ||
                         (filterStatus === "unacknowledged" && !alert.isAcknowledged);
    const matchesLevel = filterLevel === "all" || alert.level === filterLevel;
    const matchesBarangay = filterBarangay === "all" || alert.barangay === filterBarangay;
    
    return matchesSearch && matchesStatus && matchesLevel && matchesBarangay;
  });

  // Count all alerts for summary cards
  const unacknowledgedCount = alerts.filter(alert => !alert.isAcknowledged).length;
  const criticalCount = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

  // Compute average response time for acknowledged alerts
  function getAverageResponseTime(alerts: any[]): string {
    const acknowledged = alerts.filter(a => a.isAcknowledged && a.timestamp && a.acknowledgedAt);
    if (acknowledged.length === 0) return "-";
    const totalMs = acknowledged.reduce((sum, a) => {
      const created = new Date(a.timestamp).getTime();
      const acked = new Date(a.acknowledgedAt).getTime();
      return sum + (acked - created);
    }, 0);
    const avgMs = totalMs / acknowledged.length;
    const avgMin = Math.round(avgMs / 60000);
    return avgMin < 1 ? "<1m" : `${avgMin}m`;
  }
  const avgResponseTime = getAverageResponseTime(alerts);

  return (
    <div className="p-6 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Column 1: Title and Subtitle (stacked) */}
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 p-1"
                aria-label="Back"
                onClick={() => onNavigate && onNavigate('dashboard')}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <h1 className="text-2xl font-semibold text-schistoguard-navy">Alert Management</h1>
            </div>
            <div className="text-muted-foreground text-sm pl-10 md:pl-12">Monitor and manage water quality alerts across all sites</div>
          </div>
          {/* Column 2: Empty for spacing */}
          <div></div>
          {/* Column 3: Filters and Export (stacked, right-aligned) */}
          <div className="flex flex-row items-center gap-3 w-full md:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] border border-gray-300 rounded-lg bg-gray-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterLevel}
              onValueChange={setFilterLevel}
            >
              <SelectTrigger className="w-40 border border-gray-200">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="w-40 flex items-center justify-center gap-2 border border-gray-200"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" /> Export Alerts
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Total Alerts</CardTitle>
            <Bell className="h-7 w-7 text-blue-500" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-blue-700 text-center">{alerts.length}</div>
            <p className="text-xs text-muted-foreground text-center">All alerts (history)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Unacknowledged</CardTitle>
            <AlertTriangle className="h-7 w-7 text-yellow-500" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-yellow-700 text-center">{unacknowledgedCount}</div>
            <p className="text-xs text-muted-foreground text-center">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-red-600 text-center">{criticalCount}</div>
            <p className="text-xs text-muted-foreground text-center">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium">Response Time</CardTitle>
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-green-600 text-center">{avgResponseTime}</div>
            <p className="text-xs text-muted-foreground text-center">Average response (acknowledged alerts)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="font-bold">Alert List</CardTitle>
            {/* Bulk acknowledge button removed as requested */}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Alert List - fixed height, scrollable, styled like SitesDirectory */}
          <div className="rounded-md border overflow-x-auto h-80 overflow-y-auto scrollbar-hide space-y-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <div onClick={() => setSelectedAlert(alert)}>
                          <AlertItem
                            {...alert}
                            onAcknowledge={handleAcknowledgeAlert}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Alert Details</DialogTitle>
                        </DialogHeader>
                        {selectedAlert && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Alert Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Alert ID:</span>
                                    <span className="font-mono">{selectedAlert.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Level:</span>
                                    <Badge 
                                      variant={selectedAlert.level === "critical" ? "destructive" : "secondary"}
                                      className={selectedAlert.level === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                                    >
                                      {selectedAlert.level.charAt(0).toUpperCase() + selectedAlert.level.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Parameter:</span>
                                    <span>{selectedAlert.parameter}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Value:</span>
                                    <span className="font-medium">{selectedAlert.value}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration:</span>
                                    <span>{selectedAlert.duration}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Site Information</h4>
                                <div className="space-y-2 text-sm">
                                <div className="flex flex-col lg:flex-row gap-4">
                                  <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                      placeholder="Search alerts, sites, or parameters..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="pl-10"
                                    />
                                  </div>
                                </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Site:</span>
                                    <span>{selectedAlert.siteName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Barangay:</span>
                                    <span>{selectedAlert.barangay}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Timestamp:</span>
                                    <span>{selectedAlert.timestamp}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={selectedAlert.isAcknowledged ? "default" : "outline"}>
                                      {selectedAlert.isAcknowledged ? "Acknowledged" : "Pending"}
                                    </Badge>
                                  </div>
                                  {selectedAlert.acknowledgedBy && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Acknowledged by:</span>
                                      <span className="text-right">{selectedAlert.acknowledgedBy}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Alert Message</h4>
                              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                                {selectedAlert.message}
                              </p>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              {!selectedAlert.isAcknowledged && (
                                <Button 
                                  onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                                  className="bg-schistoguard-teal hover:bg-schistoguard-teal/90"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Acknowledge Alert
                                </Button>
                              )}
                              <Button variant="outline">
                                <MapPinIcon className="w-4 h-4 mr-2" />
                                View on Map
                              </Button>
                              <Button variant="outline">
                                <Calendar className="w-4 h-4 mr-2" />
                                View Site History
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No alerts found matching your filters.</p>
                <p className="text-sm">Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}