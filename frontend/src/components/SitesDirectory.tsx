import React, { useState, useEffect } from 'react';
import { Clock, Filter, Droplets, Thermometer, Download, Calendar, AlertTriangle, CheckCircle2, BarChart3, ChevronRight, X, Trash2, Check, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { apiGet } from '../utils/api';
import { PDFHeader } from './PDFHeader';

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
          if (temp >= 22 && temp <= 30) tempRisk = 'critical';
          else if ((temp >= 20 && temp < 22) || (temp > 30 && temp <= 35)) tempRisk = 'warning';

          let turbidityRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if (turbidity < 5) turbidityRisk = 'critical';
          else if (turbidity >= 5 && turbidity <= 15) turbidityRisk = 'warning';

          let phRisk: 'critical' | 'warning' | 'safe' = 'safe';
          if (ph >= 6.5 && ph <= 8.0) phRisk = 'critical';
          else if ((ph >= 6.0 && ph < 6.5) || (ph > 8.0 && ph <= 8.5)) phRisk = 'warning';

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
  const [animationEnabled, setAnimationEnabled] = useState(!_sitesFirstLoadDone);
  const headerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && !_sitesFirstLoadDone) {
      setAnimationEnabled(true);
      const timer = setTimeout(() => {
        setAnimationEnabled(false);
        _sitesFirstLoadDone = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Fetch metadata for PDF header
  useEffect(() => {
    // 0. Load from cache first
    try {
      const cachedName = localStorage.getItem("sg_latest_site_name");
      const cachedAddr = localStorage.getItem("sg_latest_address");
      if (cachedName) setDynamicSiteName(cachedName);
      if (cachedAddr) setAddress(cachedAddr);
    } catch (e) { }

    // 1. Try latest reading
    apiGet("/api/sensors/latest").then(data => {
      if (data) {
        if (data.siteName && data.siteName !== "Site Name") {
          setDynamicSiteName(data.siteName);
          localStorage.setItem("sg_latest_site_name", data.siteName);
        }
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          import('../utils/reverseGeocode').then(({ reverseGeocode }) => {
            reverseGeocode(data.latitude, data.longitude).then(addr => {
              if (addr) {
                setAddress(addr);
                localStorage.setItem("sg_latest_address", addr);
              }
            });
          });
        }
      }
    }).catch(() => { });

    // 2. Try history if readings are loaded
    if (readings && readings.length > 0) {
      const latestWithGps = [...readings]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find(r => typeof r.latitude === 'number' && typeof r.longitude === 'number');

      if (latestWithGps) {
        if (latestWithGps.siteName) {
          setDynamicSiteName(latestWithGps.siteName);
          localStorage.setItem("sg_latest_site_name", latestWithGps.siteName);
        }
        if (!address) {
          import('../utils/reverseGeocode').then(({ reverseGeocode }) => {
            reverseGeocode(latestWithGps.latitude, latestWithGps.longitude).then(addr => {
              if (addr) {
                setAddress(addr);
                localStorage.setItem("sg_latest_address", addr);
              }
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
    } catch (e) { }
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
      const html2canvas = (await import('html2canvas')).default;

      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      // 150ms delay to ensure DOM and address state are fully updated before capture
      await new Promise(resolve => setTimeout(resolve, 150));

      // Capture the high-fidelity HTML header
      if (!headerRef.current) throw new Error("Header reference not found");
      const canvas = await html2canvas(headerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const headerImgData = canvas.toDataURL('image/png');

      const pw = doc.internal.pageSize.getWidth();

      // Calculate header proportions (targeting approx 500pt width in landscape)
      const targetHeaderWidth = 500;
      const targetHeaderHeight = (canvas.height * targetHeaderWidth) / canvas.width;

      // Add the captured header image (centered)
      doc.addImage(headerImgData, 'PNG', (pw - targetHeaderWidth) / 2, 25, targetHeaderWidth, targetHeaderHeight);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dmy = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;

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

      const metadataY = 25 + targetHeaderHeight + 12;
      doc.setFontSize(9.5); // Enlarge from 7.5pt
      const pdfFont = 'helvetica';
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(107, 114, 128);

      const dateFormat = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeFormat = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const risk = filterRisk !== 'all' ? filterRisk.charAt(0).toUpperCase() + filterRisk.slice(1) : 'AllRisk';
      let timeRangeText = 'AllTime';
      if (filterTimeRange !== 'all') {
        if (filterTimeRange.endsWith('h')) timeRangeText = `${filterTimeRange.replace('h', '')} Hours`;
        else if (filterTimeRange === '24') timeRangeText = 'Last 24 Hours';
        else timeRangeText = filterTimeRange;
      }

      const metaStr = `Date Exported: ${dateFormat} at ${timeFormat} | Time Range: ${timeRangeText} | Risk: ${risk}`;
      doc.text(metaStr, pw / 2, metadataY, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(40, metadataY + 12, pw - 40, metadataY + 12);

      // Risk level color map for PDF
      const riskColorMap: Record<string, [number, number, number]> = {
        safe: [35, 182, 126],     // #23B67E
        warning: [241, 161, 26],  // #F1A11A
        critical: [209, 67, 67], // #D14343
      };

      autoTable(doc, {
        columns,
        body: rows,
        startY: metadataY + 18,
        styles: { fontSize: 8.5, cellPadding: 6, font: pdfFont },
        headStyles: { fillColor: [53, 125, 134], textColor: 255, halign: 'left', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.dataKey === 'riskLevel') {
            const val = (data.cell.raw as string || '').toLowerCase();
            const color = riskColorMap[val];
            if (color) {
              data.cell.styles.textColor = color;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // ── Analysis Summary Page ──
      doc.addPage();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      // Recalculate stats for analysis
      const totalReadings = filteredReadings.length;
      const sCount = filteredReadings.filter(r => r.riskLevel === 'safe').length;
      const wCount = filteredReadings.filter(r => r.riskLevel === 'warning').length;
      const cCount = filteredReadings.filter(r => r.riskLevel === 'critical').length;

      // Param-level stats
      const turbVals = filteredReadings.map(r => Number(r.turbidity)).filter(v => !isNaN(v));
      const tempVals = filteredReadings.map(r => Number(r.temperature)).filter(v => !isNaN(v));
      const phVals = filteredReadings.map(r => Number(r.ph)).filter(v => !isNaN(v));
      const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
      const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

      // Title
      doc.setFontSize(18);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(26, 42, 58);
      doc.text('Analysis Summary', pw / 2, y, { align: 'center' });
      y += 8;
      doc.setDrawColor(53, 125, 134);
      doc.setLineWidth(2);
      doc.line(pw / 2 - 80, y, pw / 2 + 80, y);
      y += 28;

      // ── Overall Risk Distribution ──
      doc.setFontSize(12);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(26, 42, 58);
      doc.text('Overall Risk Distribution', margin, y);
      y += 20;

      const barW = pw - margin * 2;
      const barH = 18;
      const sPct = totalReadings ? sCount / totalReadings : 0;
      const wPct = totalReadings ? wCount / totalReadings : 0;
      const cPct = totalReadings ? cCount / totalReadings : 0;

      // Stacked bar
      doc.setFillColor(35, 182, 126);
      doc.roundedRect(margin, y, barW * sPct, barH, 4, 4, 'F');
      doc.setFillColor(241, 161, 26);
      doc.rect(margin + barW * sPct, y, barW * wPct, barH, 'F');
      doc.setFillColor(209, 67, 67);
      if (cPct > 0) {
        doc.roundedRect(margin + barW * sPct + barW * wPct, y, barW * cPct, barH, 4, 4, 'F');
      }
      y += barH + 14;

      // Legend
      const legendItems = [
        { label: `Safe: ${sCount} (${(sPct * 100).toFixed(1)}%)`, color: [35, 182, 126] as [number, number, number] },
        { label: `Warning: ${wCount} (${(wPct * 100).toFixed(1)}%)`, color: [241, 161, 26] as [number, number, number] },
        { label: `Critical: ${cCount} (${(cPct * 100).toFixed(1)}%)`, color: [209, 67, 67] as [number, number, number] },
      ];
      let lx = margin;
      doc.setFontSize(9);
      legendItems.forEach(item => {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(lx, y - 6, 10, 10, 2, 2, 'F');
        doc.setFont(pdfFont, 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(item.label, lx + 14, y + 2);
        lx += 150;
      });
      y += 28;

      // ── Parameter Statistics Table ──
      doc.setFontSize(12);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(26, 42, 58);
      doc.text('Parameter Statistics', margin, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Parameter', 'Min', 'Max', 'Average', 'Status']],
        body: [
          [
            'Turbidity (NTU)',
            min(turbVals).toFixed(2),
            max(turbVals).toFixed(2),
            avg(turbVals).toFixed(2),
            avg(turbVals) > 15 ? 'Critical' : avg(turbVals) > 5 ? 'Warning' : 'Safe',
          ],
          [
            'Temperature (°C)',
            min(tempVals).toFixed(2),
            max(tempVals).toFixed(2),
            avg(tempVals).toFixed(2),
            (avg(tempVals) < 22 || avg(tempVals) > 30) ? 'Critical' : (avg(tempVals) < 24 || avg(tempVals) > 28) ? 'Warning' : 'Safe',
          ],
          [
            'pH Level',
            min(phVals).toFixed(2),
            max(phVals).toFixed(2),
            avg(phVals).toFixed(2),
            (avg(phVals) < 6.5 || avg(phVals) > 8.0) ? 'Critical' : (avg(phVals) < 7.0 || avg(phVals) > 7.5) ? 'Warning' : 'Safe',
          ],
        ],
        styles: { fontSize: 9, cellPadding: 8, font: pdfFont },
        headStyles: { fillColor: [53, 125, 134], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = (data.cell.raw as string || '').toLowerCase();
            const c = riskColorMap[val];
            if (c) {
              data.cell.styles.textColor = c;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // Get Y after the table
      y = (doc as any).lastAutoTable.finalY + 30;

      // ── Recommendations ──
      doc.setFontSize(12);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(26, 42, 58);
      doc.text('Recommendations', margin, y);
      y += 18;

      doc.setFontSize(9.5);
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(55, 65, 81);

      const recommendations: string[] = [];
      if (cCount > 0) {
        recommendations.push(`⚠ ${cCount} reading(s) recorded at CRITICAL risk level. Immediate investigation recommended.`);
      }
      if (avg(turbVals) > 5) {
        recommendations.push(`• Average turbidity is ${avg(turbVals).toFixed(2)} NTU (above 5 NTU threshold). Consider water filtration assessment.`);
      }
      if (avg(tempVals) < 22 || avg(tempVals) > 30) {
        recommendations.push(`• Average temperature is ${avg(tempVals).toFixed(2)}°C (outside optimal 22-30°C range). Monitor environmental conditions.`);
      }
      if (avg(phVals) < 6.5 || avg(phVals) > 8.0) {
        recommendations.push(`• Average pH is ${avg(phVals).toFixed(2)} (outside safe 6.5-8.0 range). Chemical treatment may be needed.`);
      }
      if (wCount > totalReadings * 0.3) {
        recommendations.push(`• ${(wPct * 100).toFixed(0)}% of readings are at WARNING level. Increased monitoring frequency is advised.`);
      }
      if (cCount === 0 && wCount === 0) {
        recommendations.push('✓ All readings are within safe parameters. Continue routine monitoring.');
      }
      if (recommendations.length === 0) {
        recommendations.push('✓ Water quality is generally within acceptable parameters. Continue routine monitoring.');
      }

      recommendations.forEach(rec => {
        const lines = doc.splitTextToSize(rec, pw - margin * 2);
        lines.forEach((line: string) => {
          if (y > ph - 60) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 14;
        });
        y += 4;
      });

      // ── Footer ──
      y = Math.max(y + 20, ph - 60);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 14;
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.setFont(pdfFont, 'italic');
      doc.text(`Generated by SchistoGuard • ${dateFormat} at ${timeFormat}`, pw / 2, y, { align: 'center' });
      y += 12;
      doc.text('This report is auto-generated based on real-time sensor data and should be reviewed by qualified personnel.', pw / 2, y, { align: 'center' });

      const filename = `SchistoGuard_Timeseries_${risk}_${timeRangeText}_${dmy}.pdf`;
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

  const getRiskDisplayLabel = (riskLevel: string) => {
    if (riskLevel === 'critical') return 'High Possible Risk';
    if (riskLevel === 'warning') return 'Moderate Possible Risk';
    return 'Safe';
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
      if (value >= 22 && value <= 30) return 'critical';
      if ((value >= 20 && value < 22) || (value > 30 && value <= 35)) return 'warning';
      return 'safe';
    }
    if (param === 'ph') {
      if (value >= 6.5 && value <= 8.0) return 'critical';
      if ((value >= 6.0 && value < 6.5) || (value > 8.0 && value <= 8.5)) return 'warning';
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

      <div style={{
        width: "100%",
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
        @keyframes cardDataFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
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
                  <SelectItem value="warning">Moderate Possible Risk</SelectItem>
                  <SelectItem value="critical">High Possible Risk</SelectItem>
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
          animation: animationEnabled ? "contentSlideIn 0.7s 0.12s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          {[
            { label: "Total Readings", value: filteredReadings.length * 3, icon: <BarChart3 style={{ width: 20, height: 20, color: "#357D86" }} />, color: "#357D86", bg: "#e6f2f3", sub: "All readings" },
            { label: "Safe", value: safeCount, icon: <CheckCircle2 style={{ width: 20, height: 20, color: "#23B67E" }} />, color: "#23B67E", bg: "#E9FBF3", sub: "In safe range" },
            { label: "Moderate Possible Risk", value: warningCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#F1A11A" }} />, color: "#F1A11A", bg: "#FFF9E6", sub: "Require attention" },
            { label: "High Possible Risk", value: criticalCount, icon: <AlertTriangle style={{ width: 20, height: 20, color: "#D14343" }} />, color: "#D14343", bg: "#FFF1F1", sub: "For immediate verification" },
          ].map((card, i) => (
            <div key={card.label} style={{
              background: "#fff",
              borderRadius: 20,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              border: "1px solid rgba(0,0,0,0.03)",
              ...(animationEnabled ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.12 + i * 0.07}s both` } : {}),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#8E8B8B", fontFamily: POPPINS }}>{card.label}</span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: card.color, fontFamily: POPPINS, lineHeight: 1 }}>{card.value}</div>
              <span style={{ fontSize: 12, color: "#8E8B8B", marginTop: 4, fontWeight: 400, fontFamily: POPPINS }}>{card.sub}</span>
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
          animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
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
              padding: 20, // Match AlertsPage internal padding
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: POPPINS }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                    {deleteMode && (
                      <th style={{
                        padding: "16px 14px 16px 24px", width: 40, position: "sticky", top: 0, background: "#fff", zIndex: 1
                      }}></th>
                    )}
                    {["Time", "Date", "Turbidity (NTU)", "Temperature (°C)", "pH Level", "Risk Level", ""].map((h, i) => (
                      <th key={h} style={{
                        padding: h === "Time" && !deleteMode ? "16px 14px 16px 24px" : h === "" ? "16px 24px 16px 14px" : "16px 14px",
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
                          <td style={{ padding: "16px 14px 16px 24px", textAlign: "center" }}>
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
                        <td style={{ padding: deleteMode ? "16px 14px" : "16px 14px 16px 24px", fontSize: 13, fontWeight: 600, color: "#1a2a3a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.time}</td>
                        <td style={{ padding: "16px 14px", fontSize: 13, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.date}</td>
                        <td style={{ padding: "16px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Droplets style={{ width: 14, height: 14, color: "#357D86" }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.turbidity}</span>
                          </span>
                        </td>
                        <td style={{ padding: "16px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Thermometer style={{ width: 14, height: 14, color: "#357D86" }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.temperature}</span>
                          </span>
                        </td>
                        <td style={{ padding: "16px 14px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#357D86", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{reading.ph}</td>
                        <td style={{ padding: "16px 14px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
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
                        <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 12, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
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
                            }}>{getRiskDisplayLabel(reading.riskLevel)}</span>
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
      <div
        ref={headerRef}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '800px',
          background: 'white',
          padding: '20px',
          fontFamily: POPPINS
        }}
      >
        <PDFHeader
          dynamicSiteName={dynamicSiteName}
          address={address}
          logoNudge={10}
        />
      </div>
    </div>
  );
};