import React, { useState, useEffect } from 'react';
import { Clock, Filter, Droplets, Thermometer, Download, Calendar, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
}


export const SitesDirectory: React.FC<SitesDirectoryProps> = ({ onViewSiteDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('all');
  const [readings, setReadings] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const animate = !_sitesFirstLoadDone;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;

  useEffect(() => {
    const getData = async () => {
      const data = await fetchReadings();
      setReadings(data);
      if (!_sitesFirstLoadDone) {
        setTimeout(() => { _sitesFirstLoadDone = true; }, 50);
      }
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

  return (
    <div style={{ background: "#f5f7f9", minHeight: "100vh", fontFamily: POPPINS }}>
      <style>{`
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardDataFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px 100px" : "24px 24px 40px" }}>

        {/* Header */}
        <div style={{
          display: "flex",
          flexDirection: (isMobile || isTablet) ? "column" : "row",
          justifyContent: "space-between",
          alignItems: (isMobile || isTablet) ? "flex-start" : "center",
          gap: 12,
          marginBottom: 20,
          ...(animate ? { animation: "contentSlideIn 0.7s cubic-bezier(.22,1,.36,1) 0.05s both" } : {}),
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Sites Directory
            </h1>
            <p style={{ fontSize: 14, color: "#7b8a9a", margin: "4px 0 0 0", fontFamily: POPPINS }}>
              Real-time water quality readings & risk assessment
            </p>
          </div>
          <div style={{
            display: "flex",
            flexWrap: isMobile ? "nowrap" : "wrap",
            gap: 8,
            width: isMobile ? "100%" : "auto",
          }}>
            <div style={{ flex: isMobile ? 1 : "unset" }}>
              <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                <SelectTrigger style={{
                  background: "#fff",
                  border: "1px solid #d1d9e0",
                  borderRadius: 8,
                  fontFamily: POPPINS,
                  fontSize: 13,
                  height: 36,
                  width: isMobile ? "100%" : 150,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 10px",
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
            <div style={{ flex: isMobile ? 1 : "unset" }}>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger style={{
                  background: "#fff",
                  border: "1px solid #d1d9e0",
                  borderRadius: 8,
                  fontFamily: POPPINS,
                  fontSize: 13,
                  height: 36,
                  width: isMobile ? "100%" : 150,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 10px",
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
            <button style={{
              flex: isMobile ? 1 : "unset",
              background: "#fff",
              border: "1px solid #d1d9e0",
              borderRadius: 8,
              fontFamily: POPPINS,
              fontSize: 13,
              height: 36,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "0 14px",
              color: "#1a2a3a",
            }}>
              <Download style={{ width: 14, height: 14 }} />
              Export
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 16,
          marginBottom: 20,
          ...(animate ? { animation: "contentSlideIn 0.7s cubic-bezier(.22,1,.36,1) 0.2s both" } : {}),
        }}>
          {[
            { label: "Total Readings", value: filteredReadings.length * 3, icon: <BarChart3 style={{ width: 20, height: 20, color: "#357D86" }} />, color: "#357D86", bg: "#e6f2f3" },
            { label: "Safe", value: safeCount, icon: <CheckCircle2 style={{ width: 20, height: 20, color: "#22c55e" }} />, color: "#22c55e", bg: "#f0fdf4" },
            { label: "Warning", value: warningCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#eab308" }} />, color: "#a16207", bg: "#fefce8" },
            { label: "Critical", value: criticalCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#ef4444" }} />, color: "#dc2626", bg: "#fef2f2" },
          ].map((card, i) => (
            <div key={card.label} style={{
              background: "#fff",
              borderRadius: 14,
              padding: isMobile ? "14px 10px" : "18px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
              <span style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: card.color, fontFamily: POPPINS }}>{card.value}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#7b8a9a", fontFamily: POPPINS }}>{card.label}</span>
            </div>
          ))}
        </div>

        {/* Time-Series Data Card */}
        <div style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
          ...(animate ? { animation: "contentSlideIn 0.7s cubic-bezier(.22,1,.36,1) 0.35s both" } : {}),
        }}>
          <div style={{
            padding: isMobile ? "14px 12px 10px" : "18px 20px 12px",
            borderBottom: "1px solid #f0f0f0",
          }}>
            <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Time-Series Data
            </h2>
          </div>

          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: isMobile ? 400 : 420 }}>
            {filteredReadings.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <Calendar style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No readings found</h3>
                <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>Try adjusting your search or filter criteria</p>
              </div>
            ) : isMobile ? (
              /* Mobile: Card-style list */
              <div style={{ padding: "8px 12px 12px" }}>
                {filteredReadings.map((reading, idx) => {
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
                      borderBottom: idx < filteredReadings.length - 1 ? "1px solid #f0f0f0" : "none",
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
      </div>
    </div>
  );
};