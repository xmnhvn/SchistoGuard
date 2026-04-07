import React, { useState, useEffect } from 'react';
import { Clock, Filter, Droplets, Thermometer, Download, Calendar, AlertTriangle, CheckCircle2, BarChart3, ChevronRight, X, Trash2, Check, Loader2 } from 'lucide-react';
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
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenReadings, setHiddenReadings] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showMobileViewAll, setShowMobileViewAll] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [dynamicSiteName, setDynamicSiteName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  useEffect(() => {
    // Disable entry animation after it's finished to prevent glitches on re-renders
    const timer = setTimeout(() => setAnimationEnabled(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch metadata for PDF header
  useEffect(() => {
    // 1. Try latest reading
    apiGet("/api/sensors/latest").then(data => {
      if (data) {
        if (data.siteName && data.siteName !== "Site Name") setDynamicSiteName(data.siteName);
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          import('../utils/reverseGeocode').then(({ reverseGeocode }) => {
            reverseGeocode(data.latitude, data.longitude).then(addr => {
              if (addr) setAddress(addr);
            });
          });
        }
      }
    }).catch(() => {});

    // 2. Try history if readings are loaded
    if (readings && readings.length > 0) {
      const latestWithGps = [...readings]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => typeof r.latitude === 'number' && typeof r.longitude === 'number');

      if (latestWithGps) {
        if (latestWithGps.siteName) setDynamicSiteName(latestWithGps.siteName);
        if (!address) {
          import('../utils/reverseGeocode').then(({ reverseGeocode }) => {
            reverseGeocode(latestWithGps.latitude, latestWithGps.longitude).then(addr => {
              if (addr) setAddress(addr);
            });
          });
        }
      }
    }
  }, [readings]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sg_hidden_readings");
      if (stored) setHiddenReadings(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!deleteMode) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredReadings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReadings.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    setHiddenReadings(prev => {
      const updated = [...prev, ...ids];
      localStorage.setItem("sg_hidden_readings", JSON.stringify(updated));
      return updated;
    });
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  // PDF Export handler
  const handleExportPDF = async () => {
    if (!filteredReadings.length) return;
    setIsExporting(true);
    // 250ms delay to ensure the animation is stable and running on its own GPU layer
    // BEFORE hitting the heavy PDF generation script.
    await new Promise(resolve => setTimeout(resolve, 250));
    try {
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const jsPDF = jsPDFModule.default;
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const columns = [
      { header: 'Time', dataKey: 'time' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Turbidity (NTU)', dataKey: 'turbidity' },
      { header: 'Temperature (°C)', dataKey: 'temperature' },
      { header: 'pH Level', dataKey: 'ph' },
      { header: 'Risk Level', dataKey: 'riskLevel' },
    ];
    const rows = filteredReadings.map(r => {
      const t = formatTimestamp(r.timestamp);
      return {
        time: t.time,
        date: t.date,
        turbidity: r.turbidity,
        temperature: r.temperature,
        ph: r.ph,
        riskLevel: r.riskLevel,
      };
    });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dmy = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()}`;
    const risk = filterRisk !== 'all' ? filterRisk.charAt(0).toUpperCase() + filterRisk.slice(1) : 'AllRisk';
    let time = 'AllTime';
    if (filterTimeRange !== 'all') {
      if (filterTimeRange.endsWith('h')) {
        time = filterTimeRange.toUpperCase();
      } else {
        time = filterTimeRange.charAt(0).toUpperCase() + filterTimeRange.slice(1);
      }
    }

    const img = new Image();
    img.src = '/schistoguard.png';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if image fails
    });

    let pdfFont = 'helvetica';
    const bufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    try {
      const [regRes, boldRes] = await Promise.all([
        fetch('/fonts/Poppins-Regular.ttf'),
        fetch('/fonts/Poppins-Bold.ttf')
      ]);
      if (regRes.ok && boldRes.ok) {
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer()
        ]);
        doc.addFileToVFS('Poppins-Regular.ttf', bufferToBase64(regBuf));
        doc.addFileToVFS('Poppins-Bold.ttf', bufferToBase64(boldBuf));
        doc.addFont('Poppins-Regular.ttf', 'poppins', 'normal');
        doc.addFont('Poppins-Bold.ttf', 'poppins', 'bold');
        pdfFont = 'poppins';
      }
    } catch (e) {
      console.warn('Failed to load local Poppins TTF fonts for PDF rendering, falling back to Helvetica.', e);
    }

    const pw = doc.internal.pageSize.getWidth();
    let topStartX = pw / 2;
    let imgWidth = 0;
    
    if (img.complete && img.naturalWidth > 0) {
      const imgHeight = 22;
      imgWidth = imgHeight * (img.naturalWidth / img.naturalHeight);
      
      doc.setFontSize(20);
      doc.setFont(pdfFont, 'bold');
      const titleWidth = doc.getTextWidth('SchistoGuard');
      const totalTopWidth = imgWidth + 5 + titleWidth;
      topStartX = (pw - totalTopWidth) / 2;
      
      doc.addImage(img, 'PNG', topStartX, 30, imgWidth, imgHeight);
      doc.setTextColor(53, 125, 134); // #357d86
      doc.text('SchistoGuard', topStartX + imgWidth + 5, 47.5); 
    } else {
      doc.setFontSize(20);
      doc.setFont(pdfFont, 'bold');
      const titleWidth = doc.getTextWidth('SchistoGuard');
      topStartX = (pw - titleWidth) / 2;
      doc.setTextColor(53, 125, 134);
      doc.text('SchistoGuard', topStartX, 47.5);
    }

    doc.setFontSize(8.5);
    doc.setFont(pdfFont, 'normal');
    doc.setTextColor(107, 114, 128); // #6b7280
    const subtitle = 'ENVIRONMENTAL MONITORING PDF REPORT';
    const charSpacing = 1;
    const baseW = doc.getTextWidth(subtitle);
    const totalSubW = baseW + (subtitle.length - 1) * charSpacing;
    doc.text(subtitle, (pw - totalSubW) / 2, 60, { charSpace: charSpacing });

    doc.setFontSize(9.5);
    doc.setFont(pdfFont, 'bold');
    doc.setTextColor(26, 42, 58); // #1a2a3a
    const sName = dynamicSiteName || 'Matina Site';
    doc.text(sName, (pw - doc.getTextWidth(sName)) / 2, 68);

    doc.setFontSize(7.5);
    doc.setFont(pdfFont, 'normal');
    doc.setTextColor(148, 163, 184); // #94a3b8
    const addr = address || 'Device Address';
    doc.text(addr, (pw - doc.getTextWidth(addr)) / 2, 75);

    doc.setFontSize(7);
    doc.setFont(pdfFont, 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('Date Exported:', pw - 40, 40, { align: 'right' });
    doc.setFont(pdfFont, 'normal');
    const dateFormat = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'});
    const timeFormat = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    doc.text(`${dateFormat} at ${timeFormat}`, pw - 40, 48, { align: 'right' });
    
    doc.setFont(pdfFont, 'bold');
    doc.text(`Time Range: ${time} | Risk: ${risk}`, pw - 40, 58, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, 82, pw - 40, 82);

    autoTable(doc, {
      columns,
      body: rows,
      startY: 84,
      styles: { fontSize: 8.5, cellPadding: 6, font: pdfFont },
      headStyles: { fillColor: [53, 125, 134], textColor: 255, halign: 'left', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 40, right: 40, bottom: 40, left: 40 }
    });

    const filename = `SchistoGuard_Timeseries_${risk}_${time}_${dmy}.pdf`;
    doc.save(filename);
    } finally {
      setIsExporting(false);
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
    const getData = async () => {
      const data = await fetchReadings();
      setReadings(data);
    };

    getData();
    const interval = setInterval(getData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredReadings = readings.filter(reading => {
    if (hiddenReadings.includes(reading.id)) return false;
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

  if (!visible) return null;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* ── Premium Export Overlay ── */}
      {isExporting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          // Removed animation for instant coverage
        }}>
          <div style={{
            background: '#fff',
            padding: '30px 40px',
            borderRadius: 24,
            boxShadow: '0 20px 50px rgba(53, 125, 134, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            border: '1px solid rgba(53, 125, 134, 0.1)'
          }}>
            <Loader2 className="animate-spin" size={40} color="#357d86" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#1a2a3a', fontFamily: POPPINS }}>Preparing Report</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b', fontFamily: POPPINS }}>Please wait while we generate your PDF...</p>
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-6 w-full ${animationEnabled ? 'animate-fade-in' : ''}`} style={{
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.7s ease-out both;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { 
          animation: spin 0.8s linear infinite; 
          will-change: transform;
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
        animation: animationEnabled ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
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
          }}>
            Sites Directory
          </h1>
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
            onClick={handleExportPDF}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: isMobile ? 12 : 16,
        marginBottom: 24,
        animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        {[
          { label: "Total Readings", value: filteredReadings.length * 3, icon: <BarChart3 style={{ width: 20, height: 20, color: "#357D86" }} />, color: "#357D86", bg: "#e6f2f3" },
          { label: "Safe", value: safeCount, icon: <CheckCircle2 style={{ width: 20, height: 20, color: "#23B67E" }} />, color: "#23B67E", bg: "#E9FBF3" },
          { label: "Warning", value: warningCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#F1A11A" }} />, color: "#F1A11A", bg: "#FFF9E6" },
          { label: "Critical", value: criticalCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#D14343" }} />, color: "#D14343", bg: "#FFF1F1" },
        ].map((card, i) => (
          <div key={card.label} style={{
            background: "#fff",
            borderRadius: 20,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            ...(animationEnabled ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.07}s both` } : {}),
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
            <span style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, color: card.color, fontFamily: POPPINS, textAlign: "center" }}>{card.value}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#7b8a9a", fontFamily: POPPINS, textAlign: "center" }}>{card.label}</span>
          </div>
        ))}
      </div>

      {/* Time-Series Data Card */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #e2e5ea",
        overflow: "hidden",
        flex: isMobile ? "0 0 auto" : 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        animation: animationEnabled ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <div 
          onClick={() => (isMobile || isTablet) && setShowMobileViewAll(true)}
          style={{
            padding: (isMobile || isTablet) ? "12px 14px" : "20px 24px 16px",
            background: (isMobile || isTablet) ? "linear-gradient(135deg, #ffffff 0%, #f9fdfd 100%)" : "#fff",
            borderBottom: (isMobile || isTablet) ? "none" : "1px solid #f0f1f3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: (isMobile || isTablet) ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            {isMobile && (
              <div style={{
                width: 38,
                height: 38,
                minWidth: 38,
                borderRadius: 12,
                background: "#f0f8f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <BarChart3 size={18} color="#357D86" strokeWidth={2.5} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <h2 style={{
                fontSize: 15, fontWeight: 700, color: "#1a2a3a",
                margin: 0,
                fontFamily: POPPINS,
                whiteSpace: "nowrap" as const,
              }}>
                Time-Series Data
              </h2>
              {isMobile && (
                <span style={{ 
                  fontSize: 11, 
                  color: "#7b8a9a", 
                  fontWeight: 500, 
                  fontFamily: POPPINS,
                  whiteSpace: "nowrap" as const,
                }}>
                  Recent monitoring trends
                </span>
              )}
            </div>
          </div>
          {(isMobile) && (
            <div style={{
              background: "#f0f8f9",
              padding: "7px 14px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              flexShrink: 0,
              whiteSpace: "nowrap" as const,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#357D86", lineHeight: 1, whiteSpace: "nowrap" as const }}>View Details</span>
              <ChevronRight size={14} color="#357D86" strokeWidth={3} style={{ flexShrink: 0 }} />
            </div>
          )}
          {(!isMobile) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {deleteMode ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleSelectAll(); }} style={{ background: "transparent", border: "1px solid #e2e5ea", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                    Select All
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleCancelDelete(); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                    Cancel
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSelected(); }} disabled={selectedIds.size === 0} style={{ background: selectedIds.size > 0 ? "#ef4444" : "#fca5a5", border: "none", borderRadius: 8, padding: "6px 12px", cursor: selectedIds.size > 0 ? "pointer" : "default", fontSize: 13, fontWeight: 500, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                    <Trash2 size={14} /> Delete ({selectedIds.size})
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteMode(true); }}
                  style={{
                    background: "transparent", border: "none", padding: "4px", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                  title="Select Data to Delete"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
            padding: 0,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: POPPINS }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  {deleteMode && (
                    <th style={{
                      padding: "10px 14px 10px 24px", width: 40, position: "sticky", top: 0, background: "#fff", zIndex: 1
                    }}></th>
                  )}
                  {["Time", "Date", "Turbidity (NTU)", "Temperature (°C)", "pH Level", "Risk Level", ""].map((h, i) => (
                    <th key={h} style={{
                      padding: h === "Time" && !deleteMode ? "10px 14px 10px 24px" : h === "" ? "10px 24px 10px 14px" : "10px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#7b8a9a",
                      textAlign: h === "" ? "right" : (h === "Time" || h === "Date") ? "left" : "center",
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
                    safe: { bg: "#E9FBF3", color: "#23B67E" },
                    warning: { bg: "#FFF9E6", color: "#F1A11A" },
                    critical: { bg: "#FFF1F1", color: "#D14343" },
                  };
                  const rc = riskColors[reading.riskLevel] || riskColors.safe;
                  return (
                    <tr key={reading.id} style={{
                      borderBottom: "1px solid #f5f5f5",
                      animation: animationEnabled ? `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.35 + idx * 0.04}s both` : "none",
                      background: selectedIds.has(reading.id) ? "#fff1f1" : "transparent",
                      transition: "background 0.2s ease",
                      cursor: deleteMode ? "pointer" : "default"
                    }}
                    onClick={() => deleteMode && toggleSelection(reading.id)}
                    >
                      {deleteMode && (
                        <td style={{ padding: "12px 14px 12px 24px", textAlign: "center" }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            border: `2px solid ${selectedIds.has(reading.id) ? "#ef4444" : "#d1d5db"}`,
                            background: selectedIds.has(reading.id) ? "#ef4444" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.15s ease"
                          }}>
                            {selectedIds.has(reading.id) && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                        </td>
                      )}
                      <td style={{ padding: deleteMode ? "12px 14px" : "12px 14px 12px 24px", fontSize: 13, fontWeight: 600, color: "#1a2a3a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.time}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.date}</td>
                      <td style={{ padding: "12px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Droplets style={{ width: 14, height: 14, color: "#357D86" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.turbidity}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Thermometer style={{ width: 14, height: 14, color: "#357D86" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.temperature}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#357D86", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{reading.ph}</td>
                      <td style={{ padding: "12px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
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
                      <td style={{ padding: "12px 24px", textAlign: "right", fontSize: 12, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                        {formatRelativeTime(reading.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ── Mobile View All List Modal ── */}
      {(isMobile) && showMobileViewAll && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
          padding: isMobile ? "92px 20px 20px" : "40px 20px",
          animation: "fadeIn 0.2s ease-out both"
        }} onClick={() => setShowMobileViewAll(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 540,
              maxHeight: isMobile ? "calc(100vh - 120px)" : "85vh",
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
                  width: "32px", height: "32px", 
                  minWidth: "32px", minHeight: "32px",
                  padding: "0px", margin: "0px",
                  borderRadius: "1000px", 
                  border: "none", background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  lineHeight: 0,
                  overflow: "hidden",
                  appearance: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal Scrollable List */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: 20,
              position: "relative",
            } as React.CSSProperties}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredReadings.map((reading) => {
                  const time = formatTimestamp(reading.timestamp);
                  const riskColors: Record<string, { bg: string; color: string; border: string }> = {
                    safe: { bg: "#E9FBF3", color: "#23B67E", border: "#23B67E" },
                    warning: { bg: "#FFF9E6", color: "#F1A11A", border: "#F1A11A" },
                    critical: { bg: "#FFF1F1", color: "#D14343", border: "#D14343" },
                  };
                  const rc = riskColors[reading.riskLevel] || riskColors.safe;
                  return (
                    <div key={reading.id} style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #f0f1f3",
                      display: "flex",
                      flexDirection: "row",
                      minHeight: 110,
                      overflow: "hidden",
                      position: "relative"
                    }}>
                      {/* Premium Folder-Style Side Accent */}
                      <div style={{
                        width: 6,
                        backgroundColor: rc.color,
                        flexShrink: 0
                      }} />

                      <div style={{
                        flex: 1,
                        padding: "16px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                              background: rc.bg, color: rc.color, textTransform: "capitalize", fontFamily: POPPINS,
                            }}>{reading.riskLevel}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                              border: "1px solid #e2e8f0", color: "#64748b", fontFamily: POPPINS,
                            }}>Verified</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Droplets style={{ width: 16, height: 16, color: "#1a2a3a" }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS }}>{reading.turbidity} NTU</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Thermometer style={{ width: 16, height: 16, color: "#1a2a3a" }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS }}>{reading.temperature}°C</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS }}>pH {reading.ph}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: POPPINS, fontWeight: 500 }}>
                          {time.date}, {time.time}
                        </div>
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
    </div>
  );
};