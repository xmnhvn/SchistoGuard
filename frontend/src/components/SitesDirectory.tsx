import React, { useState, useEffect } from 'react';
import { Clock, Filter, Droplets, Thermometer, Download, Calendar, AlertTriangle, CheckCircle2, BarChart3, ChevronRight, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { apiGet } from '../utils/api';

const POPPINS = "'Poppins', sans-serif";

let _sitesFirstLoadDone = false;

const fetchReadings = async () => {
  try {
    const data = await apiGet('/api/sensors/history');
    return Array.isArray(data)
      ? data
        .map((r, idx) => {
          // Calculate risk for each parameter (schistosomiasis thresholds)
          const temp = r.temperature ?? 0;
          const turbidity = r.turbidity ?? 0;
          const ph = r.ph ?? 7.2;

          let tempRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if (temp >= 25 && temp <= 30) tempRisk = 'critical';
          else if ((temp >= 20 && temp < 25) || (temp > 30 && temp <= 32)) tempRisk = 'warning';

          let turbidityRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if (turbidity < 5) turbidityRisk = 'critical';
          else if (turbidity >= 5 && turbidity <= 15) turbidityRisk = 'warning';

          let phRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if (ph >= 7.0 && ph <= 8.5) phRisk = 'critical';
          else if ((ph >= 6.5 && ph < 7.0) || (ph > 8.5 && ph <= 9.0)) phRisk = 'warning';

          // Overall risk: critical if any is critical, warning if any is warning, else safe
          let overallRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if ([tempRisk, turbidityRisk, phRisk].includes('critical')) overallRisk = 'critical';
          else if ([tempRisk, turbidityRisk, phRisk].includes('warning')) overallRisk = 'warning';

          return {
            ...r,
            id: r.timestamp || idx,
            riskLevel: overallRisk,
            ph: ph
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      : [];
  } catch {
    return [];
  }
};

interface SitesDirectoryProps {
  onViewSiteDetail: (siteId: string) => void;
  visible?: boolean;
}

export const SitesDirectory: React.FC<SitesDirectoryProps> = ({ onViewSiteDetail, visible = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('all');
  const [readings, setReadings] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showMobileViewAll, setShowMobileViewAll] = useState(false);
  const animate = !_sitesFirstLoadDone;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;

  useEffect(() => {
    if (visible && !_sitesFirstLoadDone) {
      setTimeout(() => { _sitesFirstLoadDone = true; }, 50);
    }
  }, [visible]);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchReadings();
      setReadings(data);
    };

    getData();
    const interval = setInterval(getData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredReadings = readings.filter(reading => {
    const timestamp = new Date(reading.timestamp);
    const searchMatch = timestamp.toLocaleString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.turbidity?.toString().includes(searchQuery) ||
      reading.temperature?.toString().includes(searchQuery);

    const matchesRisk = filterRisk === 'all' || reading.riskLevel === filterRisk;
    const now = new Date();
    const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    let matchesTime = true;

    if (filterTimeRange === '6h') matchesTime = hoursDiff <= 6;
    else if (filterTimeRange === '12h') matchesTime = hoursDiff <= 12;
    else if (filterTimeRange === '24h') matchesTime = hoursDiff <= 24;

    return searchMatch && matchesRisk && matchesTime;
  });

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return 'bg-status-safe hover:bg-status-safe/80 text-white';
      case 'warning': return 'bg-status-warning hover:bg-status-warning/80 text-black';
      case 'critical': return 'bg-status-critical hover:bg-status-critical/80 text-white';
      default: return '';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  };

  function getRiskLevel(param: string, value: number) {
    if (param === 'turbidity') {
      if (value > 15) return 'critical';
      if (value > 5) return 'warning';
      return 'safe';
    }
    if (param === 'temperature') {
      if (value < 22 || value > 30) return 'critical';
      if ((value >= 22 && value < 24) || (value > 28 && value <= 30)) return 'warning';
      return 'safe';
    }
    if (param === 'ph') {
      if (value < 6.5 || value > 8.0) return 'critical';
      if ((value >= 6.5 && value < 7.0) || (value > 7.5 && value <= 8.0)) return 'warning';
      return 'safe';
    }
    return 'safe';
  }

  let safeCount = 0, warningCount = 0, criticalCount = 0;
  filteredReadings.forEach(r => {
    ['turbidity', 'temperature', 'ph'].forEach(param => {
      const risk = getRiskLevel(param, r[param]);
      if (risk === 'safe') safeCount++;
      else if (risk === 'warning') warningCount++;
      else if (risk === 'critical') criticalCount++;
    });
  });

  const pad = isMobile ? 16 : isTablet ? 24 : 32;

  return (
    <div style={{
      fontFamily: POPPINS,
      height: "100%",
      overflow: "hidden",
      background: "#f5f7f9",
      padding: pad,
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        *::-webkit-scrollbar { display: none; }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardDataFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex",
        flexDirection: (isMobile || isTablet) ? "column" : "row",
        justifyContent: "space-between",
        alignItems: (isMobile || isTablet) ? "flex-start" : "center",
        gap: 16,
        marginBottom: 24,
        animation: animate ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 22 : 26,
            fontWeight: 700,
            color: "#1a2a3a",
            margin: 0,
            fontFamily: POPPINS,
            whiteSpace: isMobile ? "normal" : "nowrap",
            overflow: isMobile ? undefined : "hidden",
            textOverflow: isMobile ? undefined : "ellipsis",
            letterSpacing: isMobile ? 0.1 : undefined,
          }}>
            Sites Directory
          </h1>
          {isMobile && (
            <span style={{
              fontSize: 14,
              color: "#7b8a9a",
              fontWeight: 400,
              marginTop: 2,
              fontFamily: POPPINS,
              lineHeight: 1.3,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>Real-time water quality readings & risk assessment</span>
          )}
          {!isMobile && (
            <p style={{ fontSize: 14, color: "#7b8a9a", margin: "4px 0 0 0", fontFamily: POPPINS }}>
              Real-time water quality readings & risk assessment
            </p>
          )}
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 10,
          flexWrap: isMobile ? "nowrap" as const : "wrap",
          ...(isMobile ? { width: "100%" } : {}),
        }}>
          <div style={{ flex: isMobile ? 1 : undefined }}>
            <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
              <SelectTrigger style={{
                width: isMobile ? undefined : 148, flex: isMobile ? 1 : undefined,
                minWidth: 0, borderRadius: 12, fontFamily: POPPINS, fontSize: 13,
                border: "1px solid #e2e5ea", background: "#fff", height: 38,
              }}>
                <Clock style={{ width: 14, height: 14, color: "#357D86" }} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="12h">Last 12 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div style={{ flex: isMobile ? 1 : undefined }}>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger style={{
                width: isMobile ? undefined : 148, flex: isMobile ? 1 : undefined,
                minWidth: 0, borderRadius: 12, fontFamily: POPPINS, fontSize: 13,
                border: "1px solid #e2e5ea", background: "#fff", height: 38,
              }}>
                <Filter style={{ width: 14, height: 14, color: "#357D86" }} />
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="safe">Safe</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "0 16px", height: 38, borderRadius: 12,
              border: "1px solid #e2e5ea",
              background: "#fff", cursor: "pointer", fontSize: 13,
              fontFamily: POPPINS, fontWeight: 500, color: "#374151",
              ...(isMobile ? { flex: 1, minWidth: 0, padding: "0 10px" } : {}),
            }}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
        gap: 16,
        marginBottom: 24,
        animation: animate ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        {[
          { label: "Total Readings", value: filteredReadings.length * 3, icon: <BarChart3 style={{ width: 20, height: 20, color: "#357D86" }} />, color: "#357D86", bg: "#e6f2f3" },
          { label: "Safe", value: safeCount, icon: <CheckCircle2 style={{ width: 20, height: 20, color: "#22c55e" }} />, color: "#22c55e", bg: "#f0fdf4" },
          { label: "Warning", value: warningCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#eab308" }} />, color: "#eab308", bg: "#fefce8" },
          { label: "Critical", value: criticalCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#ef4444" }} />, color: "#dc2626", bg: "#fef2f2" },
        ].map((card, i) => (
          <div key={card.label} style={{
            background: "#fff",
            borderRadius: 20,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            ...(animate ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.07}s both` } : {}),
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: card.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {card.icon}
            </div>
            <span style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, color: card.color, fontFamily: POPPINS }}>{card.value}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#7b8a9a", fontFamily: POPPINS }}>{card.label}</span>
          </div>
        ))}
      </div>

      {/* Time-Series Data Card */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        animation: animate ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <div style={{
          padding: isMobile ? "16px 16px 12px" : "20px 24px 16px",
          borderBottom: "1px solid #f0f1f3",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
            Time-Series Data
          </h2>
          {isMobile && filteredReadings.length > 5 && (
            <button
              onClick={() => setShowMobileViewAll(true)}
              style={{
                background: "none", border: "none", color: "#357D86", fontSize: 13,
                fontWeight: 600, fontFamily: POPPINS, display: "flex", alignItems: "center",
                gap: 2, padding: 0, cursor: "pointer"
              }}>
              View All <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          overflowX: "auto",
          overflowY: "auto",
          padding: isMobile ? 12 : 0,
        }}>
          {filteredReadings.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <Calendar style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No readings found</h3>
              <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>Try adjusting your search or filter criteria</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card-style list (Preview up to 5 items) */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredReadings.slice(0, 5).map((reading, idx) => {
                const time = formatTimestamp(reading.timestamp);
                const riskColors: Record<string, { bg: string; color: string }> = {
                  safe: { bg: "#f0fdf4", color: "#22c55e" },
                  warning: { bg: "#fefce8", color: "#a16207" },
                  critical: { bg: "#fef2f2", color: "#dc2626" },
                };
                const rc = riskColors[reading.riskLevel] || riskColors.safe;
                return (
                  <div key={reading.id} style={{
                    padding: "12px 0",
                    borderBottom: idx < Math.min(filteredReadings.length, 5) - 1 ? "1px solid #f0f0f0" : "none",
                    ...(animate ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.35 + idx * 0.05}s both` } : {}),
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>{time.time} · {time.date}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: rc.bg,
                        color: rc.color,
                        textTransform: "capitalize",
                        fontFamily: POPPINS,
                      }}>{reading.riskLevel}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Droplets style={{ width: 14, height: 14, color: "#357D86" }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#357D86", fontFamily: POPPINS }}>{reading.turbidity}</span>
                        <span style={{ fontSize: 11, color: "#7b8a9a" }}>NTU</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Thermometer style={{ width: 14, height: 14, color: "#357D86" }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#357D86", fontFamily: POPPINS }}>{reading.temperature}</span>
                        <span style={{ fontSize: 11, color: "#7b8a9a" }}>°C</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#357D86", fontFamily: POPPINS }}>{reading.ph}</span>
                        <span style={{ fontSize: 11, color: "#7b8a9a" }}>pH</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop/Tablet: Table */
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: POPPINS }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  {["Time", "Date", "Turbidity (NTU)", "Temperature (°C)", "pH Level", "Risk Level", ""].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#7b8a9a",
                      textAlign: h === "" ? "right" : h === "Time" || h === "Date" ? "left" : "center",
                      position: "sticky",
                      top: 0,
                      background: "#fff",
                      zIndex: 1,
                      fontFamily: POPPINS,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReadings.map((reading, idx) => {
                  const time = formatTimestamp(reading.timestamp);
                  const riskColors: Record<string, { bg: string; color: string }> = {
                    safe: { bg: "#f0fdf4", color: "#22c55e" },
                    warning: { bg: "#fefce8", color: "#a16207" },
                    critical: { bg: "#fef2f2", color: "#dc2626" },
                  };
                  const rc = riskColors[reading.riskLevel] || riskColors.safe;
                  return (
                    <tr key={reading.id} style={{
                      borderBottom: "1px solid #f5f5f5",
                      ...(animate ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.35 + idx * 0.04}s both` } : {}),
                    }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1a2a3a" }}>{time.time}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#7b8a9a" }}>{time.date}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Droplets style={{ width: 14, height: 14, color: "#357D86" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.turbidity}</span>
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Thermometer style={{ width: 14, height: 14, color: "#357D86" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.temperature}</span>
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.ph}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 12px",
                          borderRadius: 20,
                          background: rc.bg,
                          color: rc.color,
                          textTransform: "capitalize",
                          fontFamily: POPPINS,
                        }}>{reading.riskLevel}</span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "#7b8a9a" }}>
                        {formatRelativeTime(reading.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Mobile View All List Modal ── */}
      {isMobile && showMobileViewAll && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "92px 20px 20px",
        }} onClick={() => setShowMobileViewAll(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "calc(100vh - 108px)",
              background: "#fff",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              animation: "contentSlideIn 0.25s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #eef0f2",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                All Data Readings
              </h2>
              <button
                onClick={() => setShowMobileViewAll(false)}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: "none", background: "#f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} color="#6b7280" />
              </button>
            </div>
            {/* Modal Scrollable List */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: 20,
              scrollbarWidth: "none",
            } as React.CSSProperties}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredReadings.map((reading) => {
                  const time = formatTimestamp(reading.timestamp);
                  const riskColors: Record<string, { bg: string; color: string; border: string }> = {
                    safe: { bg: "#f0fdf4", color: "#22c55e", border: "#22c55e" },
                    warning: { bg: "#fefce8", color: "#a16207", border: "#eab308" },
                    critical: { bg: "#fef2f2", color: "#dc2626", border: "#ef4444" },
                  };
                  const rc = riskColors[reading.riskLevel] || riskColors.safe;
                  return (
                    <div key={reading.id} style={{
                      background: "#fff",
                      padding: "16px",
                      borderRadius: 12,
                      border: "1px solid #f0f1f3",
                      borderLeft: `4px solid ${rc.border}`,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                            background: rc.bg, color: rc.color, textTransform: "capitalize", fontFamily: POPPINS,
                          }}>{reading.riskLevel}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                            border: "1px solid #e2e8f0", color: "#64748b", fontFamily: POPPINS,
                          }}>Verified</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Droplets style={{ width: 14, height: 14, color: "#1a2a3a" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>{reading.turbidity} NTU</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Thermometer style={{ width: 14, height: 14, color: "#1a2a3a" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>{reading.temperature}°C</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>pH {reading.ph}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#7b8a9a", fontFamily: POPPINS }}>
                        {time.date}, {time.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};