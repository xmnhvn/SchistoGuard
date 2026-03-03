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

type Alert = {
  id: string;
  parameter: string;
  level: "critical" | "warning" | "info" | string;
  isAcknowledged: boolean;
  message?: string;
  [key: string]: any;
};

export function Dashboard({ onNavigate, setSystemStatus }: { onNavigate?: (view: string) => void, setSystemStatus?: (status: "operational" | "down") => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [siteData, setSiteData] = useState<any>({
    siteName: "Mang Jose's Fish Pond",
    barangay: "San Miguel",
    municipality: "Tacloban City",
    area: "100 square meters"
  });
  const [backendOk, setBackendOk] = useState(true);
  const [dataOk, setDataOk] = useState(true);
  const waterQualityRef = useRef<HTMLDivElement>(null);
  const alertsStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLatest = () => {
      fetch("http://localhost:3001/api/sensors/latest")
        .then((res) => {
          if (!res.ok) throw new Error("Backend down");
          setBackendOk(true);
          return res.json();
        })
        .then((data) => {
          setLatestReading(data);
          setDataOk(!!data && Object.keys(data).length > 0);
          if (data.siteName) setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
        })
        .catch(() => {
          setBackendOk(false);
          setDataOk(false);
        });
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchReadings = () => {
      fetch("http://localhost:3001/api/sensors/history?interval=5min&range=24h")
        .then((res) => {
          if (!res.ok) throw new Error("Backend down");
          setBackendOk(true);
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) setReadings(data);
        })
        .catch(() => {
          setBackendOk(false);
        });
    };
    fetchReadings();
    const interval = setInterval(fetchReadings, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (setSystemStatus) {
      if (!backendOk || !dataOk) {
        setSystemStatus("down");
      } else {
        setSystemStatus("operational");
      }
    }
  }, [backendOk, dataOk, setSystemStatus]);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("http://localhost:3001/api/sensors/alerts")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAlerts(data.filter(alert => ["Temperature", "Turbidity", "pH"].includes(alert.parameter)));
          }
        })
        .catch(() => { });
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
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

    fetch(`http://localhost:3001/api/sensors/alerts/${alertId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgedBy: "Current User (LGU)" })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.alert) {
          setAlerts(prev => prev.map(alert =>
            alert.id === alertId ? { ...alert, ...data.alert } : alert
          ));
        }
      })
      .catch(() => { });
  };

  const unacknowledgedAlerts = alerts.filter(
    alert =>
      !alert.isAcknowledged &&
      (alert.level === "critical" || alert.level === "warning")
  ).length;
  const criticalAlerts = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

  const avgTurbidity = readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.turbidity || 0), 0) / readings.length).toFixed(1) : "-";
  const avgTemperature = readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.temperature || 0), 0) / readings.length).toFixed(1) : "-";
  const avgPh = readings.length > 0 ? (readings.reduce((sum, r) => sum + (r.ph || 0), 0) / readings.length).toFixed(1) : "-";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">Mang Jose's Fish Pond</h1>
          <p className="text-gray-600 mb-2">100 square meters • San Miguel, Tacloban City</p>
          <p className="text-sm text-gray-500">Last update: {siteData.timestamp ? new Date(siteData.timestamp).toLocaleString() : '-'}</p>
        </div>
        <Button
          size="sm"
          className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 h-10 flex items-center self-start"
          onClick={() => onNavigate?.("alerts")}
        >
          <Bell className="w-4 h-4 mr-2" />
          Alerts
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch animate-fade-up animate-delay-100" style={{ minHeight: 320 }}>
        <div className="flex-1 flex flex-col">
          <div className="mb-6 mt-2 animate-fade-up animate-delay-200">
            <SensorCard readings={latestReading && backendOk && dataOk ? {
              turbidity: latestReading.turbidity,
              temperature: latestReading.temperature,
              ph: latestReading.ph
            } : {
              turbidity: null,
              temperature: null,
              ph: null
            }} offline={!backendOk || !dataOk} />
          </div>
          {(backendOk && dataOk) && (() => {
            const hasRisk = !!latestReading;
            return (
              <div className={`grid gap-4 mb-4 animate-fade-up animate-delay-300 ${hasRisk ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {/* Active Alerts Card */}
                <div className="flex flex-col items-center justify-center p-6" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif", minHeight: '220px' }}>
                  <p className="text-sm font-semibold text-schistoguard-navy mb-3">Active Alerts</p>
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mb-3" />
                  <div className="text-3xl font-bold text-red-500 text-center">{unacknowledgedAlerts}</div>
                  <p className="text-xs text-gray-500 mt-3 text-center">Warning and critical temperature alerts</p>
                </div>

                {/* Total Parameter Readings Card */}
                <div className="flex flex-col items-center justify-center p-6" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif", minHeight: '220px' }}>
                  <p className="text-sm font-semibold text-schistoguard-navy mb-3">Total Parameter Readings</p>
                  <TrendingUp className="h-10 w-10 text-schistoguard-teal mb-3" />
                  <div className="text-3xl font-bold text-schistoguard-navy text-center">{readings.length}</div>
                  <p className="text-xs text-gray-500 mt-3 text-center">Total readings (5 min interval, last 24 hours)</p>
                </div>

                {/* Risk Level Card */}
                {latestReading && (() => {
                  const temp = latestReading.temperature;
                  const turbidity = latestReading.turbidity;
                  const ph = latestReading.ph;
                  let tempRisk: 'critical' | 'warning' | 'safe' = 'safe';
                  if (temp >= 22 && temp <= 28) tempRisk = 'critical';
                  else if ((temp >= 20 && temp < 22) || (temp > 28 && temp <= 32)) tempRisk = 'warning';

                  let turbidityRisk: 'critical' | 'warning' | 'safe' = 'safe';
                  if (turbidity > 15) turbidityRisk = 'critical';
                  else if (turbidity > 5) turbidityRisk = 'warning';

                  let phRisk: 'critical' | 'warning' | 'safe' = 'safe';
                  if (ph < 6.5 || ph > 8.5) phRisk = 'critical';
                  else if ((ph >= 6.5 && ph < 7) || (ph > 8 && ph <= 8.5)) phRisk = 'warning';

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
                      : 'h-10 w-10 text-teal-500';

                  return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif", minHeight: '220px' }}>
                      <p className="text-sm font-semibold text-schistoguard-navy mb-3">Risk Level</p>
                      <Droplets className={iconClass + ' mb-3'} />
                      <Badge className={badgeClass}>{overallRisk.toUpperCase()}</Badge>
                      <p className="text-xs text-gray-500 mt-3 text-center">Based on temperature, turbidity, and pH</p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        <div ref={alertsStreamRef} className="w-full lg:w-[380px] flex-shrink-0 flex flex-col scrollbar-hide mt-2 animate-fade-up animate-delay-400" style={{ maxWidth: 380 }}>
          <div className="flex flex-col overflow-hidden" style={{ height: 545, background: '#ffffff', borderRadius: '24px', border: '1px solid #e8e8e8', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/60">
              <span className="font-bold text-schistoguard-navy text-sm">Alerts Stream</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${unacknowledgedAlerts > 0 ? 'bg-schistoguard-teal text-white' : 'bg-white/70 text-gray-500'
                }`}>{unacknowledgedAlerts} unread</span>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
              {alerts.filter(a => !a.isAcknowledged).length > 0 ? (
                alerts.filter(a => !a.isAcknowledged).map((alert) => {
                  const level: "critical" | "warning" = alert.level === "critical" ? "critical" : "warning";
                  return (
                    <AlertItem
                      key={alert.id}
                      {...alert}
                      level={level}
                      onAcknowledge={handleAcknowledgeAlert}
                      siteName={siteData.siteName}
                      value={alert.value}
                      timestamp={alert.timestamp}
                      message={alert.message ?? ""}
                    />
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Bell className="w-8 h-8 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No alerts</p>
                  <p className="text-xs text-gray-400 mt-1">All clear!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
