import React, { useState, useEffect } from 'react';
import { Clock, Filter, Droplets, Thermometer, Download, Calendar, AlertTriangle, CheckCircle2, BarChart3, ChevronRight, X, Trash2, Check, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { apiGet } from '../utils/api';
import { reverseGeocode } from '../utils/reverseGeocode';
import { PDFHeader } from './PDFHeader';
import { useResponsiveScale } from '../utils/useResponsiveScale';
import { getOverallRiskFromReading, type SiteRiskThresholds } from '../utils/siteRiskConfig';

const POPPINS = "'Poppins', sans-serif";

let _sitesFirstLoadDone = false;

interface SiteOption {
  siteKey: string;
  siteName: string;
  thresholds?: SiteRiskThresholds | null;
}

const fetchReadings = async (selectedSite: string = 'all', thresholds?: SiteRiskThresholds | null) => {
  try {
    const query = selectedSite === 'all'
      ? '?site=all'
      : `?siteKey=${encodeURIComponent(selectedSite)}`;
    const data = await apiGet(`/api/sensors/history${query}`);
    return Array.isArray(data)
      ? data
        .map((r, idx) => {
          return {
            ...r,
            id: r.timestamp || idx,
            riskLevel: getOverallRiskFromReading(r, thresholds),
            ph: r.ph ?? 7.2
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
  const [showMobileViewAll, setShowMobileViewAll] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [dynamicSiteName, setDynamicSiteName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(!_sitesFirstLoadDone);
  const [availableSites, setAvailableSites] = useState<SiteOption[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const headerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sites = await apiGet('/api/sensors/sites');
        if (Array.isArray(sites)) {
          const uniqueSites = new Map<string, SiteOption>();
          sites.forEach((s: any) => {
            const siteKey = (s.site_key || '').toString().trim();
            const siteName = (s.site_name || s.address || s.site_key || '').toString().trim();
            if (siteKey && siteName && !uniqueSites.has(siteKey)) {
              uniqueSites.set(siteKey, { siteKey, siteName, thresholds: s.thresholds || null });
            }
          });
          setAvailableSites(
            Array.from(uniqueSites.values()).sort((a, b) => a.siteName.localeCompare(b.siteName))
          );
        } else {
          setAvailableSites([]);
        }
      } catch {
        setAvailableSites([]);
      }
    };

    fetchSites();
  }, []);

  // Validate selectedSite against availableSites to prevent Select rendering blank
  useEffect(() => {
    if (availableSites.length > 0) {
      if (selectedSite !== 'all') {
        // Check if selectedSite exists in availableSites
        const siteExists = availableSites.some((site) => site.siteKey === selectedSite);
        if (!siteExists) {
          // Site does not exist, reset to 'all'
          console.warn(`Selected site "${selectedSite}" not found in available sites, resetting to "all"`);
          setSelectedSite('all');
        }
      }
    }
  }, [availableSites, selectedSite]);

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
          reverseGeocode(data.latitude, data.longitude).then(addr => {
            if (addr) {
              setAddress(addr);
              localStorage.setItem("sg_latest_address", addr);
            }
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
          reverseGeocode(latestWithGps.latitude, latestWithGps.longitude).then(addr => {
            if (addr) {
              setAddress(addr);
              localStorage.setItem("sg_latest_address", addr);
            }
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
      const sanitizeFileNamePart = (value: string) =>
        value
          .normalize('NFKD')
          .replace(/[^\x20-\x7E]/g, '')
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
          .replace(/\s+/g, '_')
          .trim()
          .replace(/[._-]+$/g, '')
          .slice(0, 80);

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

      // ── Analysis Summary Page (Premium Redesign) ──
      doc.addPage();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      // Restoring statistical logic for the new layout
      const totalReadings = filteredReadings.length;
      const sCount = filteredReadings.filter(r => r.riskLevel === 'safe').length;
      const wCount = filteredReadings.filter(r => r.riskLevel === 'warning').length;
      const cCount = filteredReadings.filter(r => r.riskLevel === 'critical').length;

      const totalRiskBase = filteredReadings.length;
      const sPct = totalRiskBase ? sCount / totalRiskBase : 0;
      const wPct = totalRiskBase ? wCount / totalRiskBase : 0;
      const cPct = totalRiskBase ? cCount / totalRiskBase : 0;

      const turbVals = filteredReadings.map(r => Number(r.turbidity)).filter(v => !isNaN(v) && v !== -999 && v !== 0);
      const tempVals = filteredReadings.map(r => Number(r.temperature)).filter(v => !isNaN(v) && v !== -999 && v !== 0);
      const phVals = filteredReadings.map(r => Number(r.ph)).filter(v => !isNaN(v) && v !== -999 && v !== 0);
      
      const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
      const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

      // 1. Data Extent & Report Metadata
      // Using existing dateFormat / timeFormat from outer scope
      
      const formatLongDate = (ts: string) => {
        if (!ts) return "--";
        const d = new Date(ts);
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      };
      
      const fetchedStart = filteredReadings.length > 0 ? formatLongDate(filteredReadings[filteredReadings.length - 1].timestamp) : "--";
      const fetchedEnd = filteredReadings.length > 0 ? formatLongDate(filteredReadings[0].timestamp) : "--";

      // Header Columns
      doc.setFontSize(9);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('REPORT DETAILS', margin, y);
      doc.text('DATA EXTENT', margin + 220, y);
      doc.text('EXPORTED ON', pw - margin, y, { align: 'right' });
      
      y += 14;
      doc.setFontSize(11);
      doc.setTextColor(26, 42, 58);
      doc.text('Sites Directory Summary', margin, y);
      doc.setFontSize(10);
      doc.text(`Start: ${fetchedStart}`, margin + 220, y);
      doc.setFontSize(12);
      doc.setFont(pdfFont, 'bold');
      doc.text(`${dateFormat}`, pw - margin, y, { align: 'right' });
      
      y += 14;
      doc.setFontSize(10);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(67, 198, 182); // #43c6b6
      doc.text('Data sourced from IoT sensors', margin, y);
      doc.setFontSize(10);
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(26, 42, 58);
      doc.text(`Latest: ${fetchedEnd}`, margin + 220, y);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`${timeFormat}`, pw - margin, y, { align: 'right' });

      y += 12;
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Time Range Filter: ${timeRangeText}`, margin, y);

      y += 20;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pw - margin, y);
      y += 24;

      // 2. Automated Interpretation Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, pw - margin * 2, 65, 12, 12, 'FD');
      
      // Icon Circle
      doc.setFillColor(53, 125, 134);
      doc.circle(margin + 20, y + 20, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont(pdfFont, 'bold');
      doc.text('i', margin + 20, y + 23, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('AUTOMATED INTERPRETATION', margin + 38, y + 23);
      
      doc.setFontSize(11);
      doc.setFont(pdfFont, 'normal');
      doc.setTextColor(51, 65, 85);
      const interpretationText = totalReadings ? 
        `Early-warning system analysis: Water conditions across monitored sites show a mean of ${avg(tempVals).toFixed(1)}°C, pH ${avg(phVals).toFixed(1)}, and ${avg(turbVals).toFixed(1)} NTU. ${cCount > 0 ? "Potential risk detected in one or more parameters." : "No significant hazards detected."}` : 
        "Insufficient data for interpretation.";
      const wrappedInterpretation = doc.splitTextToSize(interpretationText, pw - margin * 2 - 40);
      doc.text(wrappedInterpretation, margin + 40, y + 42);
      
      y += 85;

      // 3. Parameter Cards (3 Columns)
      const cardW = (pw - margin * 2 - 32) / 3;
      const cardH = 120;
      
      const params = [
        { label: 'TEMPERATURE', color: [67, 198, 182], vals: tempVals, unit: '°C' },
        { label: 'PH LEVEL', color: [65, 135, 214], vals: phVals, unit: '' },
        { label: 'TURBIDITY', color: [44, 82, 130], vals: turbVals, unit: 'NTU' },
      ];

      params.forEach((p, idx) => {
        const cx = margin + idx * (cardW + 16);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cx, y, cardW, cardH, 8, 8, 'FD');
        
        // Card Title
        doc.setFillColor(p.color[0], p.color[1], p.color[2]);
        doc.circle(cx + 12, y + 15, 4, 'F');
        doc.setFontSize(9);
        doc.setFont(pdfFont, 'bold');
        doc.setTextColor(26, 42, 58);
        doc.text(p.label, cx + 22, y + 18);
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240);
        doc.line(cx + 12, y + 26, cx + cardW - 12, y + 26);
        
        const cardAvg = avg(p.vals);
        const cardMin = min(p.vals);
        const cardMax = max(p.vals);
        
        const rowY = y + 44;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('HIGHEST', cx + 12, rowY);
        doc.setTextColor(26, 42, 58);
        doc.setFontSize(10);
        doc.text(`${cardMax.toFixed(2)}${p.unit ? ' ' + p.unit : ''}`, cx + cardW - 12, rowY, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('LOWEST', cx + 12, rowY + 22);
        doc.setTextColor(26, 42, 58);
        doc.setFontSize(10);
        doc.text(`${cardMin.toFixed(2)}${p.unit ? ' ' + p.unit : ''}`, cx + cardW - 12, rowY + 22, { align: 'right' });
        
        doc.setLineDashPattern([3, 3], 0);
        doc.setLineWidth(0.3);
        doc.line(cx + 12, rowY + 36, cx + cardW - 12, rowY + 36);
        doc.setLineDashPattern([], 0);
        
        doc.setFontSize(10);
        doc.setFont(pdfFont, 'bold');
        doc.setTextColor(p.color[0], p.color[1], p.color[2]);
        doc.text('LATEST (AVG)', cx + 12, rowY + 52);
        doc.setFontSize(18); // Increased from 14 to match premium inspiration
        doc.text(`${cardAvg.toFixed(2)}${p.unit ? ' ' + p.unit : ''}`, cx + cardW - 12, rowY + 52, { align: 'right' });
      });

      y += cardH + 20;

      // 4. Distribution Bar (Compact)
      doc.setFontSize(10);
      doc.setFont(pdfFont, 'bold');
      doc.setTextColor(53, 125, 134);
      doc.text('Overall Risk Distribution', margin, y);
      y += 12;
      
      const barW = pw - margin * 2;
      const barH = 10;
      const segmentGap = 1.5;
      const segments = [
        { pct: sPct, color: [35, 182, 126] as [number, number, number] },
        { pct: wPct, color: [241, 161, 26] as [number, number, number] },
        { pct: cPct, color: [209, 67, 67] as [number, number, number] },
      ].filter((segment) => segment.pct > 0);

      const totalGapWidth = Math.max(0, segments.length - 1) * segmentGap;
      const usableBarWidth = Math.max(0, barW - totalGapWidth);
      let curX = margin;
      segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        const width = isLast
          ? margin + barW - curX
          : usableBarWidth * segment.pct;

        doc.setFillColor(segment.color[0], segment.color[1], segment.color[2]);
        doc.roundedRect(curX, y, width, barH, 4, 4, 'F');
        curX += width + segmentGap;
      });
      
      y += barH + 16;
      doc.setFontSize(8);
      
      // Safe
      doc.setFillColor(35, 182, 126);
      doc.roundedRect(margin, y - 6, 8, 8, 2, 2, 'F');
      doc.setTextColor(100, 116, 139);
      doc.text(`Safe: ${sCount} (${(sPct * 100).toFixed(1)}%)`, margin + 12, y);
      
      // Warning
      doc.setFillColor(241, 161, 26);
      doc.roundedRect(margin + 140, y - 6, 8, 8, 2, 2, 'F');
      doc.text(`Warning: ${wCount} (${(wPct * 100).toFixed(1)}%)`, margin + 152, y);
      
      // Critical
      doc.setFillColor(209, 67, 67);
      doc.roundedRect(margin + 280, y - 6, 8, 8, 2, 2, 'F');
      doc.text(`Critical: ${cCount} (${(cPct * 100).toFixed(1)}%)`, margin + 292, y);

      // (Footer removed per user request)
      
      y += 12;
      // Removed generation info text to keep the report clean and focused on data.

      const selectedSiteLabel = selectedSite === 'all'
        ? 'All_Sites'
        : (availableSites.find((site) => site.siteKey === selectedSite)?.siteName || dynamicSiteName || selectedSite || 'Unknown_Site');
      const siteForFile = sanitizeFileNamePart(selectedSiteLabel) || 'Unknown_Site';
      const riskForFile = sanitizeFileNamePart(risk) || 'AllRisk';
      const timeRangeForFile = sanitizeFileNamePart(timeRangeText) || 'AllTime';
      const filename = `SchistoGuard_Timeseries_${siteForFile}_${riskForFile}_${timeRangeForFile}_${dmy}.pdf`;
      doc.save(filename);
    } finally {
      setIsExporting(false);
    }
  };

  const {
    isMobile,
    isTablet,
    isCompact,
    isNarrowDesktop,
    pad,
    controlFontSize,
    controlHeight,
    subtitleSize,
  } = useResponsiveScale();

  // PDF Export stability variables: Force desktop-caliber layout during captures
  const mobileResponsive = isMobile && !isExporting;
  const tabletResponsive = isTablet && !isExporting;
  const compactFilterLayout = mobileResponsive || tabletResponsive;



  useEffect(() => {
    const getData = async () => {
      const selectedThresholds = selectedSite === 'all'
        ? null
        : (availableSites.find((site) => site.siteKey === selectedSite)?.thresholds || null);
      const data = await fetchReadings(selectedSite, selectedThresholds);
      setReadings(data);
    };

    getData();
    const interval = setInterval(getData, 5000);
    return () => clearInterval(interval);
  }, [availableSites, selectedSite]);

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
            padding: '48px 40px',
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
        .sg-ts-scroll::-webkit-scrollbar {
          display: block !important;
          width: 8px;
        }
        .sg-ts-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sg-ts-scroll::-webkit-scrollbar-thumb {
          background: #c2ccd8;
          border-radius: 999px;
        }
        .sg-ts-scroll::-webkit-scrollbar-thumb:hover {
          background: #aab7c6;
        }
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
          flexDirection: (mobileResponsive || tabletResponsive) ? "column" : "row",
          justifyContent: "space-between",
          alignItems: (mobileResponsive || tabletResponsive) ? "flex-start" : "center",
          gap: 16,
          marginBottom: 24,
          animation: animationEnabled ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
            <h1 style={{
              fontSize: mobileResponsive ? 18 : (isNarrowDesktop ? 24 : 26),
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              whiteSpace: mobileResponsive ? "normal" : "nowrap",
              overflow: mobileResponsive ? undefined : "hidden",
              textOverflow: mobileResponsive ? undefined : "ellipsis",
              letterSpacing: mobileResponsive ? 0.1 : undefined,
            }}>
              Sites Directory
            </h1>
            {mobileResponsive && (
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
            {!mobileResponsive && (
              <p style={{ fontSize: subtitleSize, color: "#7b8a9a", margin: "2px 0 0 0", fontFamily: POPPINS }}>
                Real-time water quality readings & risk assessment
              </p>
            )}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: mobileResponsive ? 8 : 10,
            flexWrap: compactFilterLayout ? "wrap" as const : "nowrap",
            ...(compactFilterLayout ? { width: "100%" } : {}),
          }}>
            <div style={{ flex: compactFilterLayout ? "1 1 calc(50% - 5px)" : undefined, minWidth: compactFilterLayout ? 0 : undefined }}>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger style={{
                  width: compactFilterLayout ? undefined : (isNarrowDesktop ? 180 : 190), flex: compactFilterLayout ? 1 : undefined,
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS, fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff", height: controlHeight,
                }}>
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {availableSites.map((site) => (
                    <SelectItem key={site.siteKey} value={site.siteKey}>{site.siteName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: compactFilterLayout ? "1 1 calc(50% - 5px)" : undefined, minWidth: compactFilterLayout ? 0 : undefined }}>
              <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                <SelectTrigger style={{
                  width: compactFilterLayout ? undefined : (isNarrowDesktop ? 130 : 148), flex: compactFilterLayout ? 1 : undefined,
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS, fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff", height: controlHeight,
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
            <div style={{ flex: compactFilterLayout ? "1 1 calc(50% - 5px)" : undefined, minWidth: compactFilterLayout ? 0 : undefined }}>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger style={{
                  width: compactFilterLayout ? undefined : (isNarrowDesktop ? 130 : 148), flex: compactFilterLayout ? 1 : undefined,
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS, fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff", height: controlHeight,
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
                padding: isNarrowDesktop ? "0 12px" : "0 16px", height: controlHeight, borderRadius: 100,
                border: "1px solid #e2e5ea",
                background: "#fff", cursor: "pointer", fontSize: controlFontSize,
                fontFamily: POPPINS, fontWeight: 500, color: "#374151",
                ...(compactFilterLayout ? { flex: "1 1 calc(50% - 5px)", minWidth: 0, width: "100%", padding: "0 10px" } : {}),
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
          gridTemplateColumns: isCompact ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isCompact ? 12 : 16,
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
              borderRadius: 16,
              padding: isNarrowDesktop ? 12 : 14,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              border: "1px solid rgba(0,0,0,0.03)",
              ...(animationEnabled ? { animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.12 + i * 0.07}s both` } : {}),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isNarrowDesktop ? 8 : 10 }}>
                <span style={{ fontSize: isNarrowDesktop ? 12 : 13, fontWeight: 500, color: "#8E8B8B", fontFamily: POPPINS }}>{card.label}</span>
                <div style={{
                  width: isNarrowDesktop ? 30 : 36,
                  height: isNarrowDesktop ? 30 : 36,
                  borderRadius: 100,
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: isNarrowDesktop ? 22 : 24, fontWeight: 700, color: card.color, fontFamily: POPPINS, lineHeight: 1 }}>{card.value}</div>
              <span style={{ fontSize: isNarrowDesktop ? 9 : 10, color: "#8E8B8B", marginTop: 3, fontWeight: 400, fontFamily: POPPINS }}>{card.sub}</span>
            </div>
          ))}
        </div>

        {/* Time-Series Data Card */}
        <div style={{
          background: "#fff",
          borderRadius: 28,
          border: "1px solid #e2e5ea",
          overflow: "hidden",
          flex: isMobile ? "0 0 auto" : 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          <div
            onClick={() => (isMobile) && setShowMobileViewAll(true)}
            style={{
              padding: isMobile ? "12px 14px" : (isNarrowDesktop ? "12px 16px 10px" : "14px 20px 12px"),
              minHeight: isMobile ? undefined : (isNarrowDesktop ? 62 : 66),
              background: isMobile ? "linear-gradient(135deg, #ffffff 0%, #f9fdfd 100%)" : "#fff",
              borderBottom: isMobile ? "none" : "1px solid #f0f1f3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: isMobile ? "pointer" : "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              {isMobile && (
                <div style={{
                  width: 38,
                  height: 38,
                  minWidth: 38,
                  borderRadius: 100,
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
                  fontSize: isNarrowDesktop ? 12 : 13, fontWeight: 700, color: "#1a2a3a",
                  margin: 0,
                  fontFamily: POPPINS,
                  lineHeight: 1.2,
                }}>
                  {isMobile ? "Time-Series Summary" : "Time-Series Data"}
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
                    <button onClick={(e) => { e.stopPropagation(); handleSelectAll(); }} style={{ background: "transparent", border: "1px solid #e2e5ea", borderRadius: 100, padding: isNarrowDesktop ? "4px 10px" : "6px 16px", cursor: "pointer", fontSize: isNarrowDesktop ? 12 : 13, fontWeight: 500, color: "#374151" }}>
                      Select All
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleCancelDelete(); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 100, padding: isNarrowDesktop ? "4px 10px" : "6px 16px", cursor: "pointer", fontSize: isNarrowDesktop ? 12 : 13, fontWeight: 500, color: "#374151" }}>
                      Cancel
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSelected(); }} disabled={selectedIds.size === 0} style={{ background: selectedIds.size > 0 ? "#ef4444" : "#fca5a5", border: "none", borderRadius: 100, padding: isNarrowDesktop ? "4px 10px" : "6px 16px", cursor: selectedIds.size > 0 ? "pointer" : "default", fontSize: isNarrowDesktop ? 12 : 13, fontWeight: 500, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                      <Trash2 size={13} /> Delete ({selectedIds.size})
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
              overflow: "hidden",
              // No top padding: prevents rows from appearing "above" the sticky header while scrolling.
              padding: "0 20px 20px",
              background: "#fff",
            }}>
              {/* Fixed column header (no sticky overlay) */}
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: POPPINS, tableLayout: "fixed" }}>
                <colgroup>
                  {deleteMode && <col style={{ width: "4%" }} />}
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead style={{ background: "#fff" }}>
                  <tr style={{ borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
                    {deleteMode && (
                      <th style={{
                        padding: "16px 14px 16px 24px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#7b8a9a",
                        textAlign: "center",
                        background: "#fff",
                        fontFamily: POPPINS,
                      }}></th>
                    )}
                    {["Time", "Date", "Turbidity (NTU)", "Temperature (°C)", "pH Level", "Risk Level", ""].map((h) => (
                      <th key={h} style={{
                        padding: h === "Time" && !deleteMode ? "14px 10px 14px 12px" : h === "" ? "14px 12px 14px 10px" : "14px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#7b8a9a",
                        textAlign: h === "" ? "right" : (h === "Time" || h === "Date") ? "left" : "center",
                        background: "#fff",
                        fontFamily: POPPINS,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
              </table>

              {/* Body (inner-scroll only) */}
              <div
                className="sg-ts-scroll"
                style={{
                  overflowY: "auto",
                  overflowX: "hidden",
                  maxHeight: "100%",
                  paddingBottom: 16,
                  scrollbarWidth: "thin",
                  msOverflowStyle: "auto"
                }}
              >
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: POPPINS, tableLayout: "fixed" }}>
                  <colgroup>
                    {deleteMode && <col style={{ width: "4%" }} />}
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
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
                        <td style={{ padding: deleteMode ? "14px 10px" : "14px 10px 14px 12px", fontSize: 13, fontWeight: 600, color: "#1a2a3a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.time}</td>
                        <td style={{ padding: "14px 10px", fontSize: 13, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{time.date}</td>
                        <td style={{ padding: "14px 10px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Droplets style={{ width: 14, height: 14, color: "#357D86" }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.turbidity}</span>
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Thermometer style={{ width: 14, height: 14, color: "#357D86" }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#357D86" }}>{reading.temperature}</span>
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#357D86", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>{reading.ph}</td>
                        <td style={{ padding: "14px 10px", textAlign: "center", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
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
                        <td style={{ padding: "14px 12px 14px 10px", textAlign: "right", fontSize: 12, color: "#7b8a9a", opacity: deleteMode && !selectedIds.has(reading.id) ? 0.7 : 1 }}>
                          {formatRelativeTime(reading.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
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
                      borderRadius: 16,
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#94a3b8", fontFamily: POPPINS, fontWeight: 500 }}>
                          <span>{time.date}, {time.time}</span>
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
