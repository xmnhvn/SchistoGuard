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
      // Replace this with your actual user context or authentication logic
      const userName = "Juan Dela Cruz (LGU)";
    function formatDateTime(dt: string) {
      if (!dt) return '-';
      const d = new Date(dt);
      if (isNaN(d.getTime())) return dt;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
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
    const interval = setInterval(fetchAlerts, 10000);
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
        acknowledgedBy: userName
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

  const unacknowledgedCount = alerts.filter(alert => !alert.isAcknowledged).length;
  const criticalCount = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

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
          
          <div></div>
          
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

      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="font-bold">Alert List</CardTitle>
            
          </div>
        </CardHeader>
        
        <CardContent>
          
          <div className="rounded-md border overflow-x-auto h-80 overflow-y-auto scrollbar-hide space-y-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Dialog>
                      <AlertItem
                        {...alert}
                        onAcknowledge={handleAcknowledgeAlert}
                        onExpand={() => { setSelectedAlert(alert); }}
                        DetailsButtonComponent={({ onClick }) => (
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert); onClick && onClick(e); }}
                              className="py-0.5 px-2 text-xs h-6 min-h-0"
                            >
                              Details
                            </Button>
                          </DialogTrigger>
                        )}
                      />
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-center font-bold mt-6 mb-6">Alert Details</DialogTitle>
                        </DialogHeader>
                        {selectedAlert && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <h4 className="font-semibold text-md mb-4 text-schistoguard-navy">Alert Information</h4>
                                <table className="w-full text-sm">
                                  <tbody>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Alert ID:</td>
                                      <td className="font-mono font-semibold text-base">{selectedAlert.id}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Level:</td>
                                      <td>
                                        <Badge 
                                          variant={selectedAlert.level === "critical" ? "destructive" : "secondary"}
                                          className={selectedAlert.level === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                                        >
                                          {selectedAlert.level.charAt(0).toUpperCase() + selectedAlert.level.slice(1)}
                                        </Badge>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Parameter:</td>
                                      <td className="font-semibold">{selectedAlert.parameter}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Value:</td>
                                      <td className="font-semibold text-md">{selectedAlert.value} <span className="font-normal text-xs">NTU</span></td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Duration:</td>
                                      <td>{selectedAlert.duration || '-'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <h4 className="font-semibold text-md mb-4 text-schistoguard-navy">Site Information</h4>
                                <table className="w-full text-sm">
                                  <tbody>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Site:</td>
                                      <td className="font-semibold">{selectedAlert.siteName}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Barangay:</td>
                                      <td>{selectedAlert.barangay}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Timestamp:</td>
                                      <td className="whitespace-nowrap">{formatDateTime(selectedAlert.timestamp)}</td>
                                    </tr>
                                    <tr>
                                      <td className="pr-2 py-2 text-muted-foreground font-medium">Status:</td>
                                      <td>
                                        <Badge variant={selectedAlert.isAcknowledged ? "default" : "outline"} className={selectedAlert.isAcknowledged ? "bg-schistoguard-teal text-white" : ""}>
                                          {selectedAlert.isAcknowledged ? "Acknowledged" : "Pending"}
                                        </Badge>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-4">Alert Message</h4>
                              <p className="text-sm mb-8 text-muted-foreground bg-muted/50 rounded-md">
                                {selectedAlert.message}
                              </p>
                              {selectedAlert.acknowledgedBy && (
                                <div className="pt-2 flex flex-col items-center">
                                  <span className="text-xs text-muted-foreground">Acknowledged by</span>
                                  <span className="font-medium text-sm text-center">{selectedAlert.acknowledgedBy}</span>
                                </div>
                              )}
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