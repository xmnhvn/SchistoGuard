import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertItem } from "./AlertItem";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowLeft, Download, Settings, Bell, Calendar, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { useEffect, useState, useRef } from "react";
import { apiGet } from "../utils/api";
import { loadHtml2Pdf } from "../utils/loadHtml2Pdf";

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
  siteName = "Mang Jose's Fishpond",
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

  // Export handler for chart as PDF
  const handleExportChartPDF = async () => {
    if (!chartRef.current) return;
    // Find the PDF-only explanation element
    const pdfOnlyElem = chartRef.current.querySelector('.sg-pdf-only') as HTMLElement | null;
    let prevDisplay = '';
    if (pdfOnlyElem) {
      prevDisplay = pdfOnlyElem.style.display;
      pdfOnlyElem.style.display = 'block';
    }
    try {
      const html2pdf = await loadHtml2Pdf();
      if (typeof html2pdf !== 'function') throw new Error('PDF export library is unavailable.');
      // Filename: SchistoGuard_TimeseriesGraph_[Risk]_[TimeRange]_dd-mm-yyyy.pdf
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dmy = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      const risk = currentRisk ? (currentRisk.charAt(0).toUpperCase() + currentRisk.slice(1)) : 'AllRisk';
      let time = 'AllTime';
      if (timeRange && timeRange !== 'all') {
        if (timeRange.endsWith('h')) {
          time = timeRange.toUpperCase();
        } else {
          time = timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
        }
      }
      const filename = `SchistoGuard_TimeseriesGraph_${risk}_${time}_${dmy}.pdf`;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(chartRef.current)
        .save();
    } catch (err) {
      alert('Failed to export chart PDF.');
    } finally {
      if (pdfOnlyElem) {
        pdfOnlyElem.style.display = prevDisplay || 'none';
      }
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
        time: timeLabel,
        turbidity: Math.max(0, r.turbidity),
        temperature: r.temperature,
        ph: r.ph ?? 7.2
      };
    });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
    const { cx, cy, stroke } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={stroke} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={12} fill={stroke} fillOpacity={0.15} />
      </g>
    );
  };

  // Save timeRange to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_timeRange', timeRange);
    }
  }, [timeRange]);

  const pad = isMobile ? 16 : isTablet ? 24 : 32;

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
              }}>{siteName}</h1>
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
                }}>{barangay}, Leyte Province</span>
              )}
              {!isMobile && (
                <p style={{
                  fontSize: 14,
                  color: "#7b8a9a",
                  margin: "4px 0 0",
                  fontFamily: POPPINS,
                }}>{barangay}, Leyte Province</p>
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
                onClick={handleExportChartPDF}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col w-full">
            <div style={{
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
                    gap: 18,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#7b8a9a",
                    fontFamily: POPPINS,
                    marginTop: isMobile ? 4 : 0,
                    marginLeft: isMobile ? 2 : 0,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#43c6b6", flexShrink: 0 }} /> Temperature
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#4187d6", flexShrink: 0 }} /> pH Level
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#2c5282", flexShrink: 0 }} /> Turbidity
                  </span>
                </div>
              </div>
              <div className="flex flex-col px-6 pb-6 pt-4 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-[350px] w-full items-center justify-center text-gray-400">No time series data available.</div>
                ) : (
                  <div ref={chartRef} className="w-full" style={{ height: 350, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
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
                          dy={10}
                        />
                        <YAxis hide domain={['dataMin - 1', 'dataMax + 2']} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
                        <Area
                          type="monotone"
                          dataKey="ph"
                          stroke="#4187d6"
                          strokeWidth={1}
                          fill="url(#phGradient)"
                          name="pH Level"
                          activeDot={<CustomActiveDot stroke="#4187d6" />}
                        />
                        <Area
                          type="monotone"
                          dataKey="turbidity"
                          stroke="#2c5282"
                          strokeWidth={1}
                          fill="url(#turbidityGradient)"
                          name="Turbidity (NTU)"
                          activeDot={<CustomActiveDot stroke="#2c5282" />}
                        />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="#43c6b6"
                          strokeWidth={1}
                          fill="url(#temperatureGradient)"
                          name="Temperature (°C)"
                          activeDot={<CustomActiveDot stroke="#43c6b6" />}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {/* PDF-only explanation, always rendered but hidden in UI */}
                    <div
                      className="sg-pdf-only"
                      style={{
                        marginTop: 8,
                        color: '#475569',
                        background: '#f1f5f9',
                        borderRadius: 8,
                        padding: '10px 18px',
                        fontSize: 13,
                        fontFamily: POPPINS,
                        maxWidth: 600,
                        textAlign: 'center',
                        display: 'none',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        margin: 'auto',
                        zIndex: 10,
                      }}
                    >
                      <b>Graph Summary:</b> This chart visualizes the time series trends for Temperature, pH Level, and Turbidity based on the selected time range. Use this summary as a quick reference for water quality monitoring and risk assessment.<br /><br />
                      <b>How to interpret the graph:</b><br />
                      <ul style={{textAlign: 'left', margin: '8px auto', maxWidth: 540, paddingLeft: 18}}>
                        <li><b>Temperature (°C):</b> Indicates the water temperature. Sudden spikes or drops may signal environmental changes or sensor issues. Critical range: 25–30°C.</li>
                        <li><b>pH Level:</b> Shows the acidity or alkalinity of the water. Values outside the safe range (6.5–9.0) may affect aquatic life and water safety.</li>
                        <li><b>Turbidity (NTU):</b> Measures water clarity. Higher turbidity can indicate contamination or sediment disturbance. Critical if below 5 NTU.</li>
                      </ul>
                      <b>Understanding Graph Trends:</b><br />
                      <ul style={{textAlign: 'left', margin: '8px auto', maxWidth: 540, paddingLeft: 18}}>
                        <li><b>Rising Trend:</b> A steady increase in temperature, pH, or turbidity may indicate warming weather, chemical changes, or increased sediment in the water. Monitor for values approaching or exceeding critical thresholds.</li>
                        <li><b>Falling Trend:</b> A consistent decrease could mean cooling, dilution, or improved water clarity. Sudden drops may also signal sensor malfunction or external intervention.</li>
                        <li><b>Flat/Stable Trend:</b> Stable readings within safe ranges suggest normal conditions. Extended flat lines at extreme values may indicate sensor issues.</li>
                        <li><b>Sudden Spikes/Dips:</b> Abrupt changes often signal events like contamination, rainfall, or equipment error. Investigate the cause if these occur.</li>
                      </ul>
                      Observing these trends helps in early detection of water quality issues and supports timely decision-making for site management.
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2 mt-3">
                  <span className="flex-shrink-0 text-sm text-center" style={{ color: "#7b8a9a", fontFamily: POPPINS, alignSelf: 'center' }}>
                    All parameters shown per {getIntervalString()} interval (from time series table)
                  </span>
                  <div
                    className="sg-pdf-only"
                    style={{
                      marginTop: 8,
                      color: '#475569',
                      background: '#f1f5f9',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontFamily: POPPINS,
                      maxWidth: 600,
                      textAlign: 'center',
                      display: 'none', // Hide in UI, show in PDF
                    }}
                  >
                    <b>Graph Summary:</b> This chart visualizes the time series trends for Temperature, pH Level, and Turbidity based on the selected time range. Use this summary as a quick reference for water quality monitoring and risk assessment.<br /><br />
                    <b>How to interpret the graph:</b><br />
                    <ul style={{textAlign: 'left', margin: '8px auto', maxWidth: 540, paddingLeft: 18}}>
                      <li><b>Temperature (°C):</b> Indicates the water temperature. Sudden spikes or drops may signal environmental changes or sensor issues. Critical range: 25–30°C.</li>
                      <li><b>pH Level:</b> Shows the acidity or alkalinity of the water. Values outside the safe range (6.5–9.0) may affect aquatic life and water safety.</li>
                      <li><b>Turbidity (NTU):</b> Measures water clarity. Higher turbidity can indicate contamination or sediment disturbance. Critical if below 5 NTU.</li>
                    </ul>
                    <b>Understanding Graph Trends:</b><br />
                    <ul style={{textAlign: 'left', margin: '8px auto', maxWidth: 540, paddingLeft: 18}}>
                      <li><b>Rising Trend:</b> A steady increase in temperature, pH, or turbidity may indicate warming weather, chemical changes, or increased sediment in the water. Monitor for values approaching or exceeding critical thresholds.</li>
                      <li><b>Falling Trend:</b> A consistent decrease could mean cooling, dilution, or improved water clarity. Sudden drops may also signal sensor malfunction or external intervention.</li>
                      <li><b>Flat/Stable Trend:</b> Stable readings within safe ranges suggest normal conditions. Extended flat lines at extreme values may indicate sensor issues.</li>
                      <li><b>Sudden Spikes/Dips:</b> Abrupt changes often signal events like contamination, rainfall, or equipment error. Investigate the cause if these occur.</li>
                    </ul>
                    Observing these trends helps in early detection of water quality issues and supports timely decision-making for site management.
                  </div>
                      <style>{`
                        .sg-pdf-only { display: none; }
                        @media print {
                          .sg-pdf-only { display: block !important; }
                        }
                      `}</style>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{
          background: "#ffffffc5",
          border: "1px solid #f1f5f9",
          borderRadius: 16,
          padding: "24px",
          marginTop: 12,
          fontFamily: POPPINS,
          width: "100%"
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: "0 0 16px 0", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Threshold Classification Guide
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>

            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#43c6b6" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Temperature (°C)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span>
                  <span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>25 – 30</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span>
                  <span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>20 – 24.99 <span style={{ color: "#cbd5e1", margin: "0 4px" }}>|</span> 30.01 – 32</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span>
                  <span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>Outside ranges</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#4187d6" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>pH Level</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span>
                  <span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>7.0 – 8.5</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span>
                  <span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>6.5 – 6.99 <span style={{ color: "#cbd5e1", margin: "0 4px" }}>|</span> 8.51 – 9.0</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span>
                  <span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>Outside ranges</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", flex: "1 1 300px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#2c5282" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Turbidity (NTU)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Critical</span>
                  <span style={{ fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 6 }}>&lt; 5</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Warning</span>
                  <span style={{ fontWeight: 600, color: "#f59e0b", background: "#fffbeb", padding: "2px 8px", borderRadius: 6 }}>5 – 15</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Safe</span>
                  <span style={{ fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 6 }}>&gt; 15</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}