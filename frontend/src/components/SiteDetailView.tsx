import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertItem } from "./AlertItem";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowLeft, Download, Settings, Bell, Calendar, Info, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { useEffect, useState, useRef } from "react";
import { apiGet } from "../utils/api";
import { loadHtml2Pdf } from "../utils/loadHtml2Pdf";
import { reverseGeocode } from "../utils/reverseGeocode";

const POPPINS = "'Poppins', sans-serif";

let _siteDetailFirstLoadDone = false;



export interface SiteDetailViewProps {
  siteId: string;
  siteName?: string;
  barangay?: string;
  currentRisk?: "safe" | "warning" | "critical";
  onBack?: () => void;
  visible?: boolean;
}

export function SiteDetailView({
  siteId,
  siteName = "SchistoGuard Device 1",
  barangay = "Riverside",
  currentRisk,
  onBack,
  visible = true
}: SiteDetailViewProps) {
  console.log("SiteDetailView mounted");
  const animate = !_siteDetailFirstLoadDone;
  // Load last selected timeRange from localStorage if available
  const getInitialTimeRange = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sg_timeRange') || "24h";
    }
    return "24h";
  };
  const [timeRange, setTimeRange] = useState(getInitialTimeRange());
  const [alerts, setAlerts] = useState<any[]>([]);
  // Cache history in memory and localStorage
  const [history, setHistory] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sg_history');
      if (cached) {
        try { return JSON.parse(cached); } catch { return []; }
      }
    }
    return [];
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Ref for chart container
  const chartRef = useRef<HTMLDivElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [dynamicSiteName, setDynamicSiteName] = useState<string | null>(null);

  // Fetch address based on GPS from the latest history reading
  useEffect(() => {
    if (history && history.length > 0) {
      // Find latest valid GPS in history
      const latestWithGps = [...history]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => typeof r.latitude === 'number' && typeof r.longitude === 'number');

      if (latestWithGps) {
        if (latestWithGps.siteName) setDynamicSiteName(latestWithGps.siteName);
        reverseGeocode(latestWithGps.latitude, latestWithGps.longitude).then(addr => {
          if (addr) setAddress(addr);
        });
      }
    }
  }, [history]);

  // Also try to get site name from interval config or latest
  useEffect(() => {
    apiGet("/api/sensors/latest").then(data => {
      if (data) {
        if (data.siteName) setDynamicSiteName(data.siteName);
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          reverseGeocode(data.latitude, data.longitude).then(addr => {
            if (addr) setAddress(addr);
          });
        }
      }
    }).catch(() => {});
  }, []);

  // Export handler for chart as PDF
  const handleExportChartPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    const originalTransform = chartRef.current.style.transform;
    const originalHeight = chartRef.current.style.height;
    
    // Add layout class for PDF to handle margins/gaps
    chartRef.current.classList.add('sg-exporting-pdf');
    
    // Find the PDF-only explanation elements
    const pdfOnlyElems = chartRef.current.querySelectorAll('.sg-pdf-only');
    const prevDisplays: string[] = [];
    pdfOnlyElems.forEach((el: any) => {
      prevDisplays.push(el.style.display);
      el.style.display = 'block';
    });

    try {
      const html2pdf = await loadHtml2Pdf();
      let time = 'AllTime';
      if (timeRange && timeRange !== 'all') {
        if (timeRange.endsWith('h')) {
          time = timeRange.toUpperCase();
        } else {
          time = timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
        }
      }
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dmy = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      
      const sanitizedName = siteName?.replace(/\s+/g, '_') || 'Site';
      const filename = `${sanitizedName}_Real_Time_Monitoring_${time}_${dmy}.pdf`;
      
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .from(chartRef.current)
        .save();
    } catch (err) {
      console.error('Failed to export chart PDF.', err);
    } finally {
      if (originalTransform) chartRef.current.style.transform = originalTransform;
      chartRef.current.style.height = originalHeight;
      pdfOnlyElems.forEach((el: any, index: number) => {
        el.style.display = prevDisplays[index] || 'none';
      });
      chartRef.current.classList.remove('sg-exporting-pdf');
      setExporting(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;

  useEffect(() => {
    if (visible && !_siteDetailFirstLoadDone) {
      setTimeout(() => { _siteDetailFirstLoadDone = true; }, 50);
    }
  }, [visible]);

  // Interval config state
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState("min");
  // Load interval config from backend
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/sensors/interval-config");
        let ms = data.intervalMs || 300000;
        if (ms % 3600000 === 0) {
          setIntervalValue(ms / 3600000);
          setIntervalUnit("hr");
        } else if (ms % 60000 === 0) {
          setIntervalValue(ms / 60000);
          setIntervalUnit("min");
        } else {
          setIntervalValue(ms / 1000);
          setIntervalUnit("sec");
        }
      } catch {
        setIntervalValue(5);
        setIntervalUnit("min");
      }
    })();
  }, []);
  // Helper to get interval string for label
  const getIntervalString = () => `${intervalValue} ${intervalUnit}`;

  // Auto-refresh readings every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      apiGet("/api/sensors/history")
        .then(data => {
          if (Array.isArray(data)) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('sg_history', JSON.stringify(data));
            }
          }
        })
        .catch(err => {
          console.error("Auto-refresh error fetching time series data:", err);
        });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Only fetch if not already cached
  useEffect(() => {
    if (history && history.length > 0) return;
    apiGet("/api/sensors/history")
      .then(data => {
        console.log("Site Details time series data:", data);
        if (Array.isArray(data)) {
          setHistory(data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('sg_history', JSON.stringify(data));
          }
        } else {
          setHistory([]);
        }
      })
      .catch(err => {
        console.error("Error fetching time series data:", err);
      });
  }, [history]);

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
  const getCutoffTime = () => {
    if (!history || history.length === 0) return 0;

    // Find the latest timestamp in the data to use as our "now" anchor
    // This allows the filter to work smoothly even if the mock database is old
    const maxTime = Math.max(...history.map(r => new Date(r.timestamp).getTime()));

    switch (timeRange) {
      case "24h": return maxTime - 24 * 60 * 60 * 1000;
      case "72h": return maxTime - 72 * 60 * 60 * 1000;
      case "7d": return maxTime - 7 * 24 * 60 * 60 * 1000;
      case "30d": return maxTime - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const chartData = history
    .filter(r => new Date(r.timestamp).getTime() >= getCutoffTime())
    .filter(r => r.temperature > -50 && r.turbidity > -50 && (r.ph === undefined || r.ph > -10))
    .map(r => {
      const d = new Date(r.timestamp);
      let timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (timeRange === '7d' || timeRange === '30d') {
        timeLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else if (timeRange === '72h') {
        timeLabel = d.toLocaleDateString([], { weekday: 'short' }) + ' ' + timeLabel;
      }

      return {
        originalTime: r.timestamp,
        time: timeLabel,
        turbidity: Math.max(0, r.turbidity),
        temperature: r.temperature,
        ph: r.ph ?? 7.2
      };
    });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (payload[0].payload.time === "Initial reading" || payload[0].payload.time === "Latest reading") return null;
      return (
        <div style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          padding: "12px 16px",
          border: "none",
          minWidth: 100,
          textAlign: "center",
          fontFamily: POPPINS,
          position: "relative",
          zIndex: 100
        }}>
          <p style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 600, color: "#7b8a9a", borderBottom: "1px solid #f0f1f3", paddingBottom: 8 }}>
            {label}
          </p>
          {[...payload].sort((a: any, b: any) => b.value - a.value).map((entry: any, index: number) => (
            <div key={index} style={{ marginBottom: index !== payload.length - 1 ? 8 : 0 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: entry.color, lineHeight: 1.2 }}>
                {entry.value}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a0aec0", fontWeight: 500 }}>
                {entry.name === "Turbidity (NTU)" ? "Turbidity" : entry.name === "Temperature (°C)" ? "Temperature" : "pH"}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomActiveDot = (props: any) => {
    const { cx, cy, stroke, payload } = props;
    if (payload && (payload.time === "Initial reading" || payload.time === "Latest reading")) {
      return <g key={`empty-${cx}-${cy}`} />;
    }
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={stroke} stroke="#fff" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={12} fill={stroke} fillOpacity={0.25} />
      </g>
    );
  };

  const CustomCursor = (props: any) => {
    const { payload, points, height } = props;
    if (payload && payload.length) {
      const t = payload[0].payload.time;
      if (t === "Initial reading" || t === "Latest reading") return <g />;
    }
    if (!points || !points.length) return <g />;
    return <line x1={points[0].x} y1={0} x2={points[0].x} y2={height} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 4" />;
  };



  // Save timeRange to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_timeRange', timeRange);
    }
  }, [timeRange]);

  const pad = isMobile ? 16 : isTablet ? 24 : 32;

  const getInterpretation = () => {
    if (!chartData || chartData.length === 0) return "No data available.";
    const filterData = chartData.filter(d => d.time !== "Initial reading" && d.time !== "Latest reading");
    if (filterData.length === 0) return "Not enough data.";

    const avgTemp = (filterData.reduce((acc, c) => acc + c.temperature, 0) / filterData.length).toFixed(1);
    const avgPh = (filterData.reduce((acc, c) => acc + c.ph, 0) / filterData.length).toFixed(2);
    const avgTurb = (filterData.reduce((acc, c) => acc + c.turbidity, 0) / filterData.length).toFixed(1);

    let tempStatus = "Safe";
    if (filterData.some(c => c.temperature >= 25 && c.temperature <= 30)) tempStatus = "Critical";
    else if (filterData.some(c => (c.temperature >= 20 && c.temperature < 25) || (c.temperature > 30 && c.temperature <= 32))) tempStatus = "Warning";

    let phStatus = "Safe";
    if (filterData.some(c => c.ph >= 7.0 && c.ph <= 8.5)) phStatus = "Critical";
    else if (filterData.some(c => (c.ph >= 6.5 && c.ph < 7.0) || (c.ph > 8.5 && c.ph <= 9.0))) phStatus = "Warning";

    let turbStatus = "Safe";
    if (filterData.some(c => c.turbidity < 5)) turbStatus = "Critical";
    else if (filterData.some(c => c.turbidity >= 5 && c.turbidity <= 15)) turbStatus = "Warning";

    if (tempStatus === "Safe" && phStatus === "Safe" && turbStatus === "Safe") {
      return `Water conditions are NORMAL (Avg: ${avgTemp}°C, pH ${avgPh}, ${avgTurb} NTU). The environment is currently unfavorable for schistosomiasis transmission.`;
    } else {
      let issues = [];
      if (tempStatus !== "Safe") issues.push(`Temperature: ${tempStatus.toUpperCase()}`);
      if (phStatus !== "Safe") issues.push(`pH: ${phStatus.toUpperCase()}`);
      if (turbStatus !== "Safe") issues.push(`Turbidity: ${turbStatus.toUpperCase()}`);
      
      return `ALERT: Anomalies detected in ${issues.join(', ')} (Avg: ${avgTemp}°C, pH ${avgPh}, ${avgTurb} NTU). The current conditions present an elevated risk for schistosomiasis transmission.`;
    }
  };

  const filterDataObj = chartData.filter(d => d.time !== "Initial reading" && d.time !== "Latest reading");
  const safeFormat = (dateStr: string) => {
    if (!dateStr) return "--";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch(e) { return dateStr; }
  };
  const fetchedStart = filterDataObj.length > 0 ? safeFormat((filterDataObj[0] as any).originalTime) : "--";
  const fetchedEnd = filterDataObj.length > 0 ? safeFormat((filterDataObj[filterDataObj.length-1] as any).originalTime) : "--";

  const getStat = (key: 'temperature' | 'ph' | 'turbidity') => {
    if (filterDataObj.length === 0) return { highest: '--', lowest: '--', latest: '--', hDate: '--', lDate: '--', date: '--' };
    const latestObj = filterDataObj[filterDataObj.length - 1];
    let maxObj = filterDataObj[0];
    let minObj = filterDataObj[0];
    
    filterDataObj.forEach((d: any) => {
      if (d[key] > maxObj[key]) maxObj = d;
      if (d[key] < minObj[key]) minObj = d;
    });

    const formatShortTime = (dateStr: string) => {
      if (!dateStr) return "--";
      try {
        const d = new Date(dateStr);
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      } catch { return "--"; }
    };
    
    return {
      highest: Number(maxObj[key]).toFixed(2),
      lowest: Number(minObj[key]).toFixed(2),
      latest: Number(latestObj[key]).toFixed(2),
      hDate: formatShortTime((maxObj as any).originalTime),
      lDate: formatShortTime((minObj as any).originalTime),
      date: formatShortTime((latestObj as any).originalTime)
    };
  };

  const tempStats = getStat('temperature');
  const phStats = getStat('ph');
  const turbStats = getStat('turbidity');

  return (
    <div style={{
      fontFamily: POPPINS,
      height: "100%",
      overflowY: "auto",
      background: "#f5f7f9",
      padding: pad,
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        *::-webkit-scrollbar { display: none; }
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", animation: animate ? 'pageSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both' : 'none' }}>
        <div style={{
          display: "flex",
          flexDirection: (isMobile || isTablet) ? "column" : "row",
          justifyContent: "space-between",
          alignItems: (isMobile || isTablet) ? "flex-start" : "center",
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{ minWidth: 0, width: (isMobile || isTablet) ? "100%" : "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? 20 : 26,
                fontWeight: 700,
                color: "#1a2a3a",
                margin: 0,
                fontFamily: POPPINS,
                whiteSpace: isMobile ? "normal" : "nowrap",
                overflow: isMobile ? undefined : "hidden",
                textOverflow: isMobile ? undefined : "ellipsis",
                letterSpacing: isMobile ? 0.1 : undefined,
              }}>{dynamicSiteName || siteName}</h1>
              {isMobile && (
                <span style={{
                  fontSize: 12.5,
                  color: "#7b8a9a",
                  fontWeight: 400,
                  marginTop: 2,
                  fontFamily: POPPINS,
                  lineHeight: 1.3,
                  display: "block",
                  whiteSpace: "normal",
                }}>{address || (barangay ? barangay + ", Leyte Province" : "Riverside, Leyte Province")}</span>
              )}
              {!isMobile && (
                <p style={{
                  fontSize: 14,
                  color: "#7b8a9a",
                  margin: "4px 0 0",
                  fontFamily: POPPINS,
                }}>{address || (barangay ? barangay + ", Leyte Province" : "Riverside, Leyte Province")}</p>
              )}
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 10,
            flexWrap: isMobile ? "nowrap" : "wrap",
            ...(isMobile ? { width: "100%" } : {}),
          }}>
            <div style={{ flex: isMobile ? 1 : undefined }}>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger style={{
                  width: isMobile ? undefined : 148, flex: isMobile ? 1 : undefined,
                  minWidth: 0, borderRadius: 12, fontFamily: POPPINS, fontSize: 13,
                  border: "1px solid #e2e5ea", background: "#fff", height: 38,
                }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="72h">Last 72h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: isMobile ? 1 : undefined }}>
              <button
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "0 16px", height: 38, borderRadius: 12,
                  border: "1px solid #e2e5ea",
                  background: "#fff", cursor: "pointer", fontSize: 13,
                  fontFamily: POPPINS, fontWeight: 500, color: "#374151",
                  whiteSpace: "nowrap",
                  width: isMobile ? "100%" : undefined
                }}
                onClick={() => setShowExportModal(true)}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        </div>

        <div ref={chartRef} className="flex flex-col gap-6 w-full sg-pdf-bg-patch" style={{ background: '#ffffff' }}>
          <div className="sg-pdf-only top-header-gap" style={{ display: 'none', padding: '10px 0px 0px 0px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src="/schistoguard.png" alt="SchistoGuard Logo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                <h2 style={{ margin: 0, fontSize: 26, color: '#357d86', fontFamily: POPPINS, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>SchistoGuard</h2>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#6b7280', fontFamily: POPPINS, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, lineHeight: 1 }}>Environmental Monitoring PDF Report</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#1a2a3a', fontFamily: POPPINS, fontWeight: 700, lineHeight: 1.2 }}>{dynamicSiteName || siteName}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: 10, color: '#94a3b8', fontFamily: POPPINS, fontWeight: 500, lineHeight: 1 }}>{address || (barangay ? barangay + ", Leyte Province" : "Riverside, Leyte Province")}</p>
            </div>
          </div>
          <div className="flex flex-col w-full">
            <div 
              style={{
              background: "#fff",
              borderRadius: 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              marginBottom: 20
            }}>
              <div
                style={{
                  padding: "20px 24px 16px",
                  borderBottom: "1px solid #f0f1f3",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: isMobile ? "flex-start" : "space-between",
                  alignItems: isMobile ? "flex-start" : "center"
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#1a2a3a",
                    margin: 0,
                    fontFamily: POPPINS,
                    marginBottom: isMobile ? 10 : 0,
                  }}
                >
                  Real-Time Monitoring
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: isMobile ? 12 : 18,
                    justifyContent: isMobile ? "center" : "flex-start",
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 500,
                    color: "#7b8a9a",
                    fontFamily: POPPINS,
                    marginTop: isMobile ? 12 : 0,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#43c6b6", flexShrink: 0 }} /> Temperature
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4187d6", flexShrink: 0 }} /> pH Level
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2c5282", flexShrink: 0 }} /> Turbidity
                  </span>
                </div>
              </div>
              <div className="flex flex-col px-6 pb-6 pt-4 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-[350px] w-full items-center justify-center text-gray-400">No time series data available.</div>
                ) : (
                  <div className="w-full chart-inner-wrap" style={{ height: 350, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.length === 1 ? [
                        { ...chartData[0], time: "Initial reading" },
                        chartData[0],
                        { ...chartData[0], time: "Latest reading" }
                      ] : chartData}>
                        <defs>
                          <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4187d6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4187d6" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="turbidityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2c5282" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2c5282" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43c6b6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#43c6b6" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#cbd5e1", fontSize: 11, fontFamily: POPPINS }}
                          tickFormatter={(val) => (val === "Initial reading" || val === "Latest reading" ? "" : val)}
                          dy={10}
                        />
                        <YAxis hide domain={['dataMin - 1', 'dataMax + 2']} />
                        <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
                        <Area
                          type="monotone"
                          dataKey="ph"
                          stroke="#4187d6"
                          strokeWidth={2}
                          fill="url(#phGradient)"
                          name="pH Level"
                          isAnimationActive={chartData.length > 1}
                          activeDot={<CustomActiveDot stroke="#4187d6" />}
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="turbidity"
                          stroke="#2c5282"
                          strokeWidth={2}
                          fill="url(#turbidityGradient)"
                          name="Turbidity (NTU)"
                          isAnimationActive={chartData.length > 1}
                          activeDot={<CustomActiveDot stroke="#2c5282" />}
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="#43c6b6"
                          strokeWidth={2}
                          fill="url(#temperatureGradient)"
                          name="Temperature (°C)"
                          isAnimationActive={chartData.length > 1}
                          activeDot={<CustomActiveDot stroke="#43c6b6" />}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <div className="threshold-container" style={{ background: "#ffffffc5", border: "1px solid #f1f5f9", borderRadius: 16, padding: "24px", marginTop: 12, fontFamily: POPPINS, width: "100%" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: "0 0 16px 0", letterSpacing: "0.02em", textTransform: "uppercase" }}>Threshold Classification Guide</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: isMobile ? "12px 16px" : "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 10 : 14 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#43c6b6" }} />
                        <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: "#1e293b" }}>Temperature (°C)</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8, fontSize: isMobile ? 12 : 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span><span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>25 – 30</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span><span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>20 – 24.99 <span style={{ color: "#cbd5e1", margin: "0 4px" }}>|</span> 30.01 – 32</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span><span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>Outside ranges</span></div>
                      </div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 12, padding: isMobile ? "12px 16px" : "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 10 : 14 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4187d6" }} />
                        <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: "#1e293b" }}>pH Level</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8, fontSize: isMobile ? 12 : 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span><span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>7.0 – 8.5</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span><span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>6.5 – 6.99 <span style={{ color: "#cbd5e1", margin: "0 4px" }}>|</span> 8.51 – 9.0</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span><span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>Outside ranges</span></div>
                      </div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 12, padding: isMobile ? "12px 16px" : "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 10 : 14 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2c5282" }} />
                        <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: "#1e293b" }}>Turbidity (NTU)</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8, fontSize: isMobile ? 12 : 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span><span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>&lt; 5</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span><span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>5 – 15</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span><span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>&gt; 15</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="sg-pdf-only pdf-summary-container" style={{ display: 'none', padding: '16px 0 0 0', marginTop: '10px' }}>
                    <div style={{ padding: '0 0 16px 0', marginBottom: 16, borderBottom: '1px solid #f0f1f3', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Report Details</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2a3a', marginTop: 4, fontFamily: POPPINS }}>Site: {siteName} ({barangay})</div>
                        <div style={{ fontSize: 13, color: '#43c6b6', marginTop: 4, fontFamily: POPPINS, fontWeight: 600, fontStyle: 'italic' }}>Data sourced from IoT sensors</div>

                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontFamily: POPPINS }}>Time Range Filter: {timeRange}</div>
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Data Extent</div>
                        <div style={{ fontSize: 12, color: '#1a2a3a', marginTop: 4, fontFamily: POPPINS }}><strong style={{color:'#64748b'}}>Start:</strong> {fetchedStart}</div>
                        <div style={{ fontSize: 12, color: '#1a2a3a', marginTop: 2, fontFamily: POPPINS }}><strong style={{color:'#64748b'}}>Latest:</strong> {fetchedEnd}</div>
                      </div>
                      <div style={{ textAlign: 'right', flex: 0.8 }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Exported On</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2a3a', marginTop: 4, fontFamily: POPPINS }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'})}</div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontFamily: POPPINS }}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 24, padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#357d86', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                        <div style={{ fontSize: 12, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Automated Interpretation</div>
                      </div>
                      <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, fontFamily: POPPINS, fontWeight: 500 }}>
                        {getInterpretation()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', borderTop: '1px solid #f0f1f3', paddingTop: 20 }}>
                      <div style={{ flex: 1, background: '#f8fafc', padding: '16px', borderRadius: 12 }}>
                        <div style={{ fontSize: 12, color: '#1a2a3a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#43c6b6" }} /> Temperature
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Highest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{tempStats.hDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{tempStats.highest !== '--' ? tempStats.highest : '--'} <span style={{fontSize: 10, color: '#94a3b8', fontWeight: 500}}>°C</span></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Lowest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{tempStats.lDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{tempStats.lowest !== '--' ? tempStats.lowest : '--'} <span style={{fontSize: 10, color: '#94a3b8', fontWeight: 500}}>°C</span></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 12, color: '#43c6b6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Latest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{tempStats.date}</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#43c6b6', fontFamily: POPPINS, marginTop: -4 }}>{tempStats.latest !== '--' ? tempStats.latest : '--'} <span style={{fontSize: 12, opacity: 0.8, fontWeight: 600}}>°C</span></span>
                          </div>
                        </div>
                      </div>

                      <div style={{ flex: 1, background: '#f8fafc', padding: '16px', borderRadius: 12 }}>
                        <div style={{ fontSize: 12, color: '#1a2a3a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4187d6" }} /> pH Level
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Highest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{phStats.hDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{phStats.highest !== '--' ? phStats.highest : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Lowest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{phStats.lDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{phStats.lowest !== '--' ? phStats.lowest : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 12, color: '#4187d6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Latest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{phStats.date}</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#4187d6', fontFamily: POPPINS, marginTop: -4 }}>{phStats.latest !== '--' ? phStats.latest : '--'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ flex: 1, background: '#f8fafc', padding: '16px', borderRadius: 12 }}>
                        <div style={{ fontSize: 12, color: '#1a2a3a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2c5282" }} /> Turbidity
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Highest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{turbStats.hDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{turbStats.highest !== '--' ? turbStats.highest : '--'} <span style={{fontSize: 10, color: '#94a3b8', fontWeight: 500}}>NTU</span></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Lowest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{turbStats.lDate}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', fontFamily: POPPINS, marginTop: -2 }}>{turbStats.lowest !== '--' ? turbStats.lowest : '--'} <span style={{fontSize: 10, color: '#94a3b8', fontWeight: 500}}>NTU</span></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 12, color: '#2c5282', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Latest</span>
                              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{turbStats.date}</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#2c5282', fontFamily: POPPINS, marginTop: -4 }}>{turbStats.latest !== '--' ? turbStats.latest : '--'} <span style={{fontSize: 12, opacity: 0.8, fontWeight: 600}}>NTU</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2 mt-3">
                  <span className="flex-shrink-0 text-sm text-center" style={{ color: "#7b8a9a", fontFamily: POPPINS, alignSelf: 'center' }}>
                    All parameters shown per {getIntervalString()} interval (from time series table)
                  </span>
                  
                  {/* Export Info Modal */}
                  {showExportModal && (
                    <div
                      style={{
                        position: "fixed", inset: 0, zIndex: 10002,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex", 
                        alignItems: isMobile ? "flex-start" : "center", 
                        justifyContent: "center",
                        padding: isMobile ? "92px 20px 20px" : "40px 20px",
                        animation: "fadeIn 0.2s ease-out both"
                      }}
                      onClick={() => setShowExportModal(false)}
                    >
                      <style>{`
                        @keyframes modalPopIn {
                          from { opacity: 0; transform: scale(0.95) translateY(10px); }
                          to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                      `}</style>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          maxWidth: 540,
                          maxHeight: isMobile ? "calc(100vh - 120px)" : "85vh",
                          background: "#fff",
                          borderRadius: isMobile ? 16 : 24,
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                          animation: "modalPopIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
                        }}
                      >
                        <div style={{ 
                          padding: isMobile ? "16px 20px" : "20px 24px", 
                          borderBottom: "1px solid #f1f5f9", 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          flexShrink: 0
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Download size={18} color="#1a2a3a" />
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>Export Report</h2>
                          </div>
                          <button 
                            onClick={() => setShowExportModal(false)} 
                            style={{ 
                              width: 32, height: 32, borderRadius: "50%", 
                              border: "none", background: "#f3f4f6", 
                              color: "#64748b",
                              display: "flex", alignItems: "center", justifyContent: "center", 
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div style={{ 
                          padding: isMobile ? "20px" : "24px", 
                          display: "flex", 
                          flexDirection: "column", 
                          gap: 20,
                          flex: 1,
                          overflowY: "auto",
                          minHeight: 0
                        }}>
                          <div style={{ 
                            background: "#f8fafc", 
                            borderRadius: 16, 
                            padding: "16px 18px", 
                            border: "1px solid #f1f5f9", 
                            position: "relative",
                            height: "auto",
                            display: "block"
                          }}>
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#1a2a3a" }} />
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a2a3a", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 6 }}>
                              <Info size={14} color="#1a2a3a" /> Graph Summary
                            </h4>
                            <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: "1.5" }}>
                              This chart visualizes the time series trends for Temperature, pH Level, and Turbidity based on the selected time range.
                            </p>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                            <div style={{ background: "#fff", borderRadius: 16, padding: "16px", border: "1px solid #f1f5f9" }}>
                              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>How to interpret the graph</h5>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12.5, color: "#475569", fontWeight: 500 }}>Temperature</span><span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>25 – 30 °C</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12.5, color: "#475569", fontWeight: 500 }}>pH Level</span><span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>6.5 – 9.0</span></div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12.5, color: "#475569", fontWeight: 500 }}>Turbidity (NTU)</span><span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>Risk if &lt; 5</span></div>
                              </div>
                            </div>
                            <div style={{ background: "#fff", borderRadius: 16, padding: "16px", border: "1px solid #f1f5f9" }}>
                              <h5 style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px 0" }}>Understanding Trends</h5>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Rising/Falling</span><span style={{ fontSize: 11, color: "#64748b" }}>Steady conditions</span></div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Sudden Spikes</span><span style={{ fontSize: 11, color: "#64748b" }}>Sensor error/Issue</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ 
                          padding: isMobile ? "16px 20px" : "20px 24px", 
                          background: "#f8fafc", 
                          borderTop: "1px solid #f1f5f9", 
                          display: "flex", 
                          gap: 12,
                          flexShrink: 0
                        }}>
                          <button onClick={() => setShowExportModal(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: POPPINS }}>Cancel</button>
                          <button onClick={() => { setShowExportModal(false); handleExportChartPDF(); }} style={{ flex: 2, height: 44, borderRadius: 12, border: "none", background: "#357D86", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: POPPINS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(53,125,134,0.25)" }}>
                            <Download size={18} /> Confirm & Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <style>{`
                  @media print {
                    .sg-print-only { display: block !important; }
                  }
                  .sg-exporting-pdf {
                    gap: 4px !important;
                  }
                  .sg-exporting-pdf .chart-inner-wrap {
                    height: 240px !important;
                  }
                  .sg-exporting-pdf .threshold-container { 
                    margin-top: 4px !important; 
                    padding: 12px 16px !important; 
                    break-inside: avoid;
                  }
                  .sg-exporting-pdf .pdf-summary-container { 
                    padding-top: 4px !important; 
                    margin-top: 4px !important; 
                    break-inside: avoid;
                  }
                  .sg-exporting-pdf .top-header-gap { padding-top: 0px !important; }
                  .sg-exporting-pdf .mb-20, .sg-exporting-pdf [style*="margin-bottom: 20px"] { margin-bottom: 8px !important; }
                `}</style>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}