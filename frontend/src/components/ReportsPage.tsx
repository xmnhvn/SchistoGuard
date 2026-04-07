import React, { useState } from 'react';
import {
  FileText,
  Download,
  Loader2,
  X,
  AlertTriangle,
  Droplet,
  Thermometer,
  FlaskConical,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { loadHtml2Pdf } from '../utils/loadHtml2Pdf';
import { reverseGeocode } from '../utils/reverseGeocode';
import { PDFHeader } from './PDFHeader';

let _reportsFirstLoadDone = false;

interface Report {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  period: string;
  generatedDate: string;
  status: 'draft' | 'published' | 'archived';
  summary: {
    totalSites: number;
    alertsGenerated: number;
    avgTurbidity: number;
    avgTemperature?: number;
    avgPh?: number;
    riskLevel: 'low' | 'moderate' | 'high';
  };
  downloadUrl?: string;
}

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const POPPINS = "'Poppins', sans-serif";
const SCHISTO_TEAL = "#357D86";
const SCHISTO_NAVY = "#1a2b3c";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'published': return 'bg-green-100 text-green-700 border-green-200';
    case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'archived': return 'bg-gray-100 text-gray-700 border-gray-200';
    default: return 'bg-blue-100 text-blue-700 border-blue-200';
  }
};

export const ReportsPage: React.FC = () => {
  const animate = !_reportsFirstLoadDone;
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedType, setSelectedType] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showViewReport, setShowViewReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportType, setReportType] = useState('monthly');
  const [weeklyStartDate, setWeeklyStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return formatDateInputValue(date);
  });
  const [weeklyEndDate, setWeeklyEndDate] = useState(() => formatDateInputValue(new Date()));
  const [monthlyPeriod, setMonthlyPeriod] = useState(() => formatMonthInputValue(new Date()));
  const [quarterlyYear, setQuarterlyYear] = useState(() => String(new Date().getFullYear()));
  const [quarterlyQuarter, setQuarterlyQuarter] = useState(() => String(Math.floor(new Date().getMonth() / 3) + 1));
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMobileReportList, setShowMobileReportList] = useState(false);
  
  // Persistent Global Cache for Header Metadata
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sg_global_latest_address');
    return null;
  });
  const [dynamicSiteName, setDynamicSiteName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sg_global_latest_siteName');
    return null;
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1024;
  const isWeb = windowWidth >= 1024;

  const previewDocumentRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    fetchReports();
    if (!_reportsFirstLoadDone) {
      setTimeout(() => { _reportsFirstLoadDone = true; }, 50);
    }
  }, []);

  React.useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  React.useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  // Fetch metadata for PDF header
  React.useEffect(() => {
    apiGet("/api/sensors/latest").then(data => {
      if (data) {
        if (data.siteName && data.siteName !== "Site Name") {
          setDynamicSiteName(data.siteName);
          localStorage.setItem('sg_global_latest_siteName', data.siteName);
        }
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          reverseGeocode(data.latitude, data.longitude).then(addr => {
            if (addr) {
              setAddress(addr);
              localStorage.setItem('sg_global_latest_address', addr);
            }
          });
        }
      }
    }).catch(() => {});
  }, []);

  // Smart Discovery: If global cache is empty, hunt for any site-specific address in localStorage
  React.useEffect(() => {
    if (!address && typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      const addressKey = keys.find(k => k.startsWith('sg_') && k.endsWith('_address'));
      if (addressKey) {
        const cached = localStorage.getItem(addressKey);
        if (cached) {
          setAddress(cached);
          localStorage.setItem('sg_global_latest_address', cached);
        }
      }
      
      const siteNameKey = keys.find(k => k.startsWith('sg_') && k.endsWith('_siteName'));
      if (siteNameKey && !dynamicSiteName) {
        const cachedName = localStorage.getItem(siteNameKey);
        if (cachedName) {
          setDynamicSiteName(cachedName);
          localStorage.setItem('sg_global_latest_siteName', cachedName);
        }
      }
    }
  }, [address, dynamicSiteName]);

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => String(currentYear - 3 + index));
  }, []);

  const resetCreateForm = () => {
    const now = new Date();
    const weeklyStart = new Date(now);
    weeklyStart.setDate(now.getDate() - 6);

    setReportType('monthly');
    setWeeklyStartDate(formatDateInputValue(weeklyStart));
    setWeeklyEndDate(formatDateInputValue(now));
    setMonthlyPeriod(formatMonthInputValue(now));
    setQuarterlyYear(String(now.getFullYear()));
    setQuarterlyQuarter(String(Math.floor(now.getMonth() / 3) + 1));
  };

  const buildCreatePeriodValue = () => {
    if (reportType === 'weekly') {
      if (!weeklyStartDate || !weeklyEndDate) {
        throw new Error('Please choose both start date and end date for weekly report.');
      }
      if (weeklyStartDate > weeklyEndDate) {
        throw new Error('Weekly start date should not be after end date.');
      }
      return `range:${weeklyStartDate}:${weeklyEndDate}`;
    }

    if (reportType === 'monthly') {
      if (!monthlyPeriod) {
        throw new Error('Please choose a month for monthly report.');
      }
      return `month:${monthlyPeriod}`;
    }

    if (reportType === 'quarterly') {
      if (!quarterlyYear || !quarterlyQuarter) {
        throw new Error('Please choose year and quarter for quarterly report.');
      }
      return `quarter:${quarterlyYear}-Q${quarterlyQuarter}`;
    }

    return selectedPeriod;
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet('/api/reports');
      if (response.success) {
        setReports(response.reports || []);
      } else {
        setError(response.message || 'Failed to fetch reports');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const createPeriod = buildCreatePeriodValue();

      const response = await apiPost('/api/reports', {
        type: reportType,
        period: createPeriod,
      });

      if (response.success || response.report) {
        setSuccessMessage('Report generated successfully!');
        setShowCreateReport(false);
        resetCreateForm();
        await fetchReports();
      } else {
        setError(response.message || 'Failed to create report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowViewReport(true);
  };

  const handleDeleteClick = (report: Report) => {
    setSelectedReport(report);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReport) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await apiDelete(`/api/reports/${selectedReport.id}`);
      if (response.success) {
        setSuccessMessage('Report deleted successfully!');
        setShowDeleteConfirm(false);
        setShowViewReport(false);
        setSelectedReport(null);
        await fetchReports();
      } else {
        setError(response.message || 'Failed to delete report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete report');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedReport) return;

    setError(null);
    setDownloading(true);

    try {
      const previewElement = previewDocumentRef.current;
      if (!previewElement) {
        throw new Error('Report preview is not ready yet. Please try again.');
      }

      const formattedDate = new Date(selectedReport.generatedDate)
        .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replaceAll('/', '-');
      const sanitizeFileNamePart = (value: string) =>
        value
          .normalize('NFKD')
          .replace(/[^\x20-\x7E]/g, '')
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[. ]+$/g, '');

      const readableTitle = sanitizeFileNamePart(selectedReport.title);
      const readablePeriod = sanitizeFileNamePart(selectedReport.period);
      const descriptor = [readableTitle, readablePeriod].filter(Boolean).join(' - ');
      const truncatedDescriptor = descriptor.slice(0, 120).trim();
      const fileName = `${truncatedDescriptor || 'Water Quality Report'} - ${formattedDate}.pdf`;

      const loadHtml2Pdf = async () => {
        if (typeof (window as any).html2pdf === 'function') {
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[data-html2pdf="true"]') as HTMLScriptElement | null;

          if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF export library.')), { once: true });
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.async = true;
          script.dataset.html2pdf = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF export library.'));
          document.body.appendChild(script);
        });
      };

      await loadHtml2Pdf();
      const html2pdf = (window as any).html2pdf;

      if (typeof html2pdf !== 'function') {
        throw new Error('PDF export library is unavailable. Please try again.');
      }

      // Force desktop-width layout so the PDF always matches the desktop version
      const needsDesktopOverride = window.innerWidth < 1100;
      const origWidth = previewElement.style.width;
      const origMinWidth = previewElement.style.minWidth;
      const origMaxWidth = previewElement.style.maxWidth;
      if (needsDesktopOverride) {
        previewElement.style.width = '760px';
        previewElement.style.minWidth = '760px';
        previewElement.style.maxWidth = '760px';
        // Allow a reflow for the desktop layout to take effect
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      try {
        await html2pdf()
          .set({
            margin: [15, 15, 15, 15],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] },
          })
          .from(previewElement)
          .save();
      } finally {
        previewElement.style.width = origWidth;
        previewElement.style.minWidth = origMinWidth;
        previewElement.style.maxWidth = origMaxWidth;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download report PDF');
    } finally {
      setDownloading(false);
    }
  };

  const filteredReports = reports.filter((report) => selectedType === 'all' || report.type === selectedType);

  const getRiskBadge = (risk: string) => {
    const r = risk.toLowerCase();
    const bg = r === 'high' ? "#FFF1F0" : r === 'moderate' ? "#FFF8ED" : "#E6F7EF";
    const color = r === 'high' ? "#EB5757" : r === 'moderate' ? "#F2994A" : "#27AE60";
    return <Badge style={{
      backgroundColor: bg,
      color: color,
      border: "none",
      fontWeight: 700,
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: "11px",
      fontFamily: POPPINS
    }}>{risk.charAt(0).toUpperCase() + risk.slice(1)} Risk</Badge>;
  };

  const getTurbidityRemark = (value: number) => {
    if (value > 25) return { label: 'Attention needed', className: 'text-red-700' };
    return { label: 'Within safe range', className: 'text-green-700' };
  };

  const getTemperatureRemark = (value: number) => {
    if (value > 35 || value < 15) return { label: 'Outside optimal range', className: 'text-red-700' };
    return { label: 'Within optimal range', className: 'text-green-700' };
  };

  const getPhRemark = (value: number) => {
    if (value > 8.5 || value < 6.5) return { label: 'Outside optimal range', className: 'text-red-700' };
    return { label: 'Within optimal range', className: 'text-green-700' };
  };

  const getRiskHeaderTheme = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'from-[#FFF1F1] to-[#FFF5F5]';
      case 'moderate':
      case 'warning':
        return 'from-[#FFF9E6] to-[#FFFEF0]';
      default:
        return 'from-[#E9FBF3] to-[#F2FDF9]';
    }
  };

  const formatMetric = (value?: number, decimals = 2) => {
    const numeric = Number(value ?? 0);
    if (Number.isNaN(numeric)) return '0.00';
    return numeric.toFixed(decimals);
  };

  const activeReport = selectedReport;

  return (
    <div className="relative h-full overflow-hidden bg-schistoguard-light-bg">
      <style>{`
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes successOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes successCardPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          60% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes checkCircleFill {
          0% { background: rgba(255,255,255,0.85); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          50% { background: rgba(255,255,255,0.4); box-shadow: 0 0 20px 8px rgba(34,197,94,0.15); }
          100% { background: #22c55e; box-shadow: 0 0 30px 10px rgba(34,197,94,0.15); }
        }
        @keyframes checkDraw {
          0% { stroke-dashoffset: 30; opacity: 0; }
          40% { opacity: 0; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes successTextIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Success Overlay ── */}
      {successMessage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(4px)",
            animation: "successOverlayIn 0.3s ease both",
          }}
          onClick={() => setSuccessMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              borderRadius: 24,
              padding: "36px 40px 32px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minWidth: 260,
              maxWidth: "85vw",
              animation: "successCardPop 0.5s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Animated Check Circle */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "checkCircleFill 0.8s 0.15s cubic-bezier(0.22,1,0.36,1) both",
                background: "rgba(255,255,255,0.85)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 30,
                    animation: "checkDraw 0.6s 0.55s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                />
              </svg>
            </div>

            {/* Success Text */}
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#1a2a3a",
                fontFamily: POPPINS,
                textAlign: "center",
                lineHeight: 1.4,
                animation: "successTextIn 0.5s 0.4s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {successMessage}
            </p>

            {/* Close button */}
            <button
              onClick={() => setSuccessMessage(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "absolute",
                top: 14,
                right: 14,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                transition: "all 0.2s",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Error Toast ── */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {error && (
          <div className="pointer-events-auto flex min-w-[320px] max-w-[680px] items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-lg">
            <p className="text-sm font-medium">{error}</p>
            <button
              type="button"
              aria-label="Close error message"
              className="rounded p-1 text-red-700 transition-colors hover:bg-red-100"
              onClick={() => setError(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col" style={{
        animation: animate ? 'pageSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both' : 'none',
        padding: "24px"
      }}>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reports List Column */}
          <div className="flex h-full min-h-0 flex-col">
            <Card
              className="flex h-full min-h-0 flex-col overflow-hidden"
              style={{
                borderRadius: isMobile ? 0 : 28,
                border: isMobile ? "none" : "1px solid #eef0f2",
                background: isMobile ? "transparent" : "#fff",
                boxShadow: isMobile ? "none" : "0 4px 20px rgba(0,0,0,0.03)"
              }}
            >
              <div className="flex-shrink-0 bg-white" style={{
                padding: isMobile ? "24px" : "24px 24px 4px",
                borderRadius: isMobile ? 24 : 0,
                border: isMobile ? "1px solid #f1f5f9" : "none",
                marginBottom: isMobile ? 12 : 0
              }}>
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={
                      isMobile
                        ? 'flex flex-col w-full gap-3'
                        : 'flex items-center gap-4 w-full'
                    }
                  >
                    <div className={isMobile ? 'flex gap-3 w-full' : 'flex flex-1 items-center gap-3'}>
                      <div className="flex-1 min-w-0">
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                          <SelectTrigger
                            className="border transition-colors focus:border-schistoguard-teal focus:bg-white w-full"
                            style={{
                              height: 38,
                              borderRadius: 12,
                              fontFamily: POPPINS,
                              fontSize: 13,
                              fontWeight: 500,
                              border: "1px solid #e2e5ea",
                              background: "#fff",
                              flexShrink: 0
                            }}
                          >
                            <SelectValue placeholder="Period" />
                          </SelectTrigger>
                          <SelectContent style={{ fontFamily: POPPINS, fontSize: 13 }}>
                            <SelectItem value="current-month">Current Month</SelectItem>
                            <SelectItem value="last-month">Last Month</SelectItem>
                            <SelectItem value="current-quarter">Current Quarter</SelectItem>
                            <SelectItem value="last-quarter">Last Quarter</SelectItem>
                            <SelectItem value="current-year">Current Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger
                            className="border transition-colors focus:border-schistoguard-teal focus:bg-white w-full"
                            style={{
                              height: 38,
                              borderRadius: 12,
                              fontFamily: POPPINS,
                              fontSize: 13,
                              fontWeight: 500,
                              border: "1px solid #e2e5ea",
                              background: "#fff",
                              flexShrink: 0
                            }}
                          >
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent style={{ fontFamily: POPPINS, fontSize: 13 }}>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className={isMobile ? 'w-full' : 'flex-shrink-0'}>
                      <Button
                        className="flex items-center gap-2 border-none px-4 hover:opacity-90 transition-opacity w-full"
                        style={{
                          height: 38,
                          borderRadius: 12,
                          fontFamily: POPPINS,
                          fontSize: 13,
                          fontWeight: 500,
                          backgroundColor: "#357D86",
                          color: "#ffffff",
                          flexShrink: 0
                        }}
                        size="sm"
                        onClick={() => setShowCreateReport(true)}
                      >
                        <FileText className="h-4 w-4" />
                        Create Report
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {isMobile && (
                <div
                  onClick={() => setShowMobileReportList(true)}
                  style={{
                    padding: "12px 14px",
                    background: "linear-gradient(135deg, #ffffff 0%, #f9fdfd 100%)",
                    borderRadius: 20,
                    border: "1px solid #e2e5ea",
                    display: "flex",
                    overflow: "hidden",
                    cursor: "pointer",
                    marginBottom: 12,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#f0f8f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <FileText size={18} color="#357D86" strokeWidth={2.5} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <h2 style={{
                        fontSize: 15, fontWeight: 700, color: "#1a2a3a",
                        margin: 0,
                        fontFamily: POPPINS,
                        lineHeight: "1.2"
                      }}>
                        Reports Directory
                      </h2>
                      <span style={{
                        fontSize: 11,
                        color: "#7b8a9a",
                        fontWeight: 500,
                        fontFamily: POPPINS,
                        marginTop: 2
                      }}>
                        View and manage water quality reports
                      </span>
                    </div>
                  </div>
                  <div style={{
                    background: "#f0f8f9",
                    padding: "7px 14px",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    flexShrink: 0,
                    marginLeft: 8
                  }}>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 700, color: "#357D86",
                        fontFamily: POPPINS,
                        whiteSpace: "nowrap",
                        lineHeight: 1
                      }}
                    >
                      View All
                    </span>
                    <ChevronRight size={14} color="#357D86" strokeWidth={3} />
                  </div>
                </div>
              )}

              {!isMobile && (
                <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-0">
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-1 pb-2">
                    {loading ? (
                      <div className="flex h-full items-center justify-center py-8 text-center text-gray-500">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Loading reports...
                      </div>
                    ) : filteredReports.length === 0 ? (
                      <div className="flex h-full items-center justify-center py-8 text-center text-gray-500">No reports available.</div>
                    ) : (
                      filteredReports.map((report) => {
                        const riskLevel = report.summary?.riskLevel || 'low';
                        const riskColors: Record<string, { bg: string; color: string; border: string }> = {
                          low: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                          moderate: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                          high: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                        };
                        const rc = riskColors[riskLevel.toLowerCase()] || riskColors.low;

                        return (
                          <div
                            key={report.id}
                            style={{
                              marginBottom: 16,
                              position: "relative"
                            }}
                          >
                            <div
                              className={`group cursor-pointer transition-all ${selectedReport?.id === report.id ? 'bg-[#F5FBFB]' : 'bg-white'
                                }`}
                              onClick={() => handleViewReport(report)}
                              style={{
                                display: "flex",
                                overflow: "hidden",
                                position: "relative",
                                minHeight: 100,
                                borderRadius: 15,
                                border: selectedReport?.id === report.id ? "1px solid #357D86" : "1px solid #f1f5f9",
                                boxShadow: selectedReport?.id === report.id ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                              }}
                            >
                              {/* Premium Folder-Style Side Accent — color based on report risk level */}
                              <div style={{
                                width: 6,
                                backgroundColor: "#357D86",
                                flexShrink: 0
                              }} />

                              <div className="flex w-full items-center justify-between px-6 py-4">
                                <div className="flex flex-1 flex-col justify-center overflow-hidden">
                                  <div className="mb-1 flex items-center justify-between">
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "4px 10px",
                                      borderRadius: 6,
                                      background: rc.bg,
                                      color: rc.color,
                                      textTransform: "uppercase",
                                      fontFamily: POPPINS,
                                      letterSpacing: "0.05em"
                                    }}>
                                      {riskLevel} Risk
                                    </span>
                                    <span style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: "#1a2a3a",
                                      fontFamily: POPPINS
                                    }}>
                                      {report.period.split(' ')[0]} {report.period.split(' ')[1]}
                                    </span>
                                  </div>
                                  <h4
                                    className="truncate text-[15.5px]"
                                    style={{
                                      fontFamily: POPPINS,
                                      fontWeight: selectedReport?.id === report.id ? 700 : 500,
                                      color: "#1a2a3a",
                                      letterSpacing: "-0.01em",
                                      lineHeight: "1.4"
                                    }}
                                  >
                                    {report.title}
                                  </h4>
                                  <div
                                    className="mt-1"
                                    style={{
                                      fontFamily: POPPINS,
                                      fontWeight: 500,
                                      color: "#64748b",
                                      fontSize: "12px",
                                      letterSpacing: "0.01em"
                                    }}
                                  >
                                    Generated on {new Date(report.generatedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                  </div>
                                </div>

                                <div className="flex items-center pl-4">
                                  <ChevronRight
                                    size={18}
                                    strokeWidth={2.5}
                                    style={{ color: "#94a3b8" }}
                                    className="shrink-0 transition-transform group-hover:translate-x-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Column 2: Preview Panel (Desktop/Tablet Only) */}
          {!(isMobile || isTablet) && (
            <div className="flex h-full min-h-0 flex-col lg:flex">
              {!selectedReport ? (
                <Card className="flex h-full min-h-0 flex-col items-center justify-center bg-white p-12 text-center" style={{ borderRadius: 28, border: "1px solid #e2e5ea" }}>
                  <FileText className="mb-4 h-16 w-16 text-slate-300" />
                  <h3 className="mb-2 text-lg font-semibold text-slate-700">No Report Selected</h3>
                  <p className="text-sm text-slate-500">Select a report from the list to view its details</p>
                </Card>
              ) : (
                <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0" style={{ borderRadius: 28 }}>
                  <div className="flex-shrink-0 border-b bg-white px-6 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-xl font-semibold text-slate-900">{selectedReport.title}</h4>
                      <div className="flex gap-2">
                        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteClick(selectedReport!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-600">Delete Report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this report? This action cannot be undone.
                              </AlertDialogDescription>
                              <div className="rounded bg-gray-50 p-3 text-sm text-gray-600">
                                <strong>{selectedReport?.title}</strong>
                                <br />
                                {selectedReport?.period}
                              </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-2">
                              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={handleDeleteConfirm}
                                  disabled={deleting}
                                >
                                  {deleting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          className="bg-white/90 text-slate-700 hover:bg-white"
                          size="sm"
                          onClick={() => handleDownloadReport()}
                          disabled={downloading}
                        >
                          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button
                          className="bg-gray-100/80 text-slate-500 hover:bg-gray-200 hover:text-slate-700"
                          size="sm"
                          onClick={() => setSelectedReport(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-nowrap items-center gap-2 overflow-hidden text-sm">
                      <span className="shrink-0 text-slate-700">
                        Generated {new Date(selectedReport!.generatedDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-')}
                      </span>
                      <span className="inline-flex shrink-0">{getRiskBadge(selectedReport!.summary.riskLevel)}</span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
                    <article ref={previewDocumentRef} className="mx-auto w-full max-w-[760px] bg-white p-5 text-[13px] leading-relaxed text-slate-800 sm:p-7">
                      <header className="mb-6 border-b border-slate-200 pb-6 text-center">
                        <PDFHeader 
                          dynamicSiteName={dynamicSiteName || 'System Summary Report'} 
                          address={address || "Riverside, Leyte Province"} 
                        />
                      </header>

                      <section className="mt-4 overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Report Title</td>
                              <td className="border border-slate-300 px-2 py-1">{selectedReport.title}</td>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Report Type</td>
                              <td className="border border-slate-300 px-2 py-1 capitalize">{selectedReport.type}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Generated</td>
                              <td className="border border-slate-300 px-2 py-1">
                                {new Date(selectedReport.generatedDate)
                                  .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                  .replaceAll('/', '-')}
                              </td>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Risk Level</td>
                              <td className="border border-slate-300 px-2 py-1 capitalize" style={{
                                color: selectedReport.summary.riskLevel === 'high' ? "#EB5757" :
                                  selectedReport.summary.riskLevel === 'moderate' ? "#F2994A" : "#27AE60",
                                fontWeight: 700
                              }}>
                                {selectedReport.summary.riskLevel}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Total Sites</td>
                              <td className="border border-slate-300 px-2 py-1">{selectedReport.summary.totalSites}</td>
                              <td className="border border-slate-300 px-2 py-1 font-semibold">Alerts</td>
                              <td className="border border-slate-300 px-2 py-1">{selectedReport.summary.alertsGenerated}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="mt-4">
                        <h4 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-900">Summary</h4>
                        <p className="mt-2 text-xs text-slate-700">
                          This {selectedReport.type} report covers monitoring data for {selectedReport.period}. A total of {selectedReport.summary.totalSites}{' '}
                          monitoring sites were reviewed, and {selectedReport.summary.alertsGenerated} alerts were logged for follow-up.
                        </p>
                      </section>

                      <section className="mt-4 overflow-x-auto">
                        <h4 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-900">
                          Key Actions And Metrics
                        </h4>
                        <table className="mt-2 w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Metric</th>
                              <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Average</th>
                              <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Status</th>
                              <th className="border border-slate-300 px-2 py-1 text-left font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1">Turbidity</td>
                              <td className="border border-slate-300 px-2 py-1">{formatMetric(selectedReport.summary.avgTurbidity)} NTU</td>
                              <td className="border border-slate-300 px-2 py-1">{getTurbidityRemark(selectedReport.summary.avgTurbidity).label}</td>
                              <td className="border border-slate-300 px-2 py-1">Track suspended particles and clarity trends.</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1">Temperature</td>
                              <td className="border border-slate-300 px-2 py-1">{formatMetric(selectedReport.summary.avgTemperature)} C</td>
                              <td className="border border-slate-300 px-2 py-1">{getTemperatureRemark(selectedReport.summary.avgTemperature || 0).label}</td>
                              <td className="border border-slate-300 px-2 py-1">Review thermal conditions affecting parasite viability.</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 px-2 py-1">pH Level</td>
                              <td className="border border-slate-300 px-2 py-1">{formatMetric(selectedReport.summary.avgPh)} pH</td>
                              <td className="border border-slate-300 px-2 py-1">{getPhRemark(selectedReport.summary.avgPh || 0).label}</td>
                              <td className="border border-slate-300 px-2 py-1">Check acidity/alkalinity drift versus target range.</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="mt-4">
                        <h4 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-900">
                          Findings And Observations
                        </h4>
                        <p className="mt-2 text-xs text-slate-700">
                          Overall risk classification for this reporting period is <span className="font-semibold capitalize" style={{
                            color: selectedReport.summary.riskLevel === 'high' ? "#D14343" :
                              selectedReport.summary.riskLevel === 'moderate' ? "#F1A11A" : "#23B67E"
                          }}>{selectedReport.summary.riskLevel}</span>.
                          {selectedReport.summary.alertsGenerated > 0
                            ? ' Alerts were observed and should be verified by field teams for immediate corrective action.'
                            : ' No active alerts were observed, indicating stable water quality conditions during this period.'}
                        </p>
                      </section>

                    </article>
                  </div>
                </Card >
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Report Dialog */}
      <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
        <DialogContent
          hideCloseButton={true}
          style={{
            width: isMobile ? "90vw" : 420,
            maxWidth: isMobile ? "90vw" : 420,
            borderRadius: 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Create New Report
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setShowCreateReport(false)}
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  padding: 0,
                  aspectRatio: "1/1",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: "20px", overflowY: "auto", maxHeight: "80vh" }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24, fontFamily: POPPINS }}>
              Select the type of report you want to generate.
            </p>

            <form className="space-y-6" onSubmit={handleCreateReport}>
              <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>Report Type</div>
              <div className="flex flex-wrap gap-2">
                {['weekly', 'monthly', 'quarterly', 'annual'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    style={{
                      height: 50,
                      padding: "0 20px",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: POPPINS,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: reportType === type ? "none" : "1px solid #e2e8f0",
                      background: reportType === type ? "#357D86" : "#ffffff",
                      color: reportType === type ? "#fff" : "#64748b",
                      boxShadow: reportType === type ? "0 4px 12px rgba(53, 125, 134, 0.3)" : "none"
                    }}
                    onClick={() => setReportType(type)}
                    disabled={creating}
                    className="active:scale-95 outline-none hover:border-[#357D86] hover:text-[#357D86]"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS, marginTop: 24 }}>Report Period</div>

              {reportType === 'weekly' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS }}>Start Date</label>
                    <input
                      type="date"
                      style={{
                        height: 50, borderRadius: 12, border: "1px solid #e2e5ea", background: "#fff",
                        padding: "0 14px", fontSize: 14, fontFamily: POPPINS, outline: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}
                      className="focus:border-[#357D86] focus:ring-1 focus:ring-[#357D86]/20 transition-all font-medium"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      max={weeklyEndDate}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS }}>End Date</label>
                    <input
                      type="date"
                      style={{
                        height: 50, borderRadius: 12, border: "1px solid #e2e5ea", background: "#fff",
                        padding: "0 14px", fontSize: 14, fontFamily: POPPINS, outline: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}
                      className="focus:border-[#357D86] focus:ring-1 focus:ring-[#357D86]/20 transition-all font-medium"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      min={weeklyStartDate}
                    />
                  </div>
                </div>
              )}

              {reportType === 'monthly' && (
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS }}>Month</label>
                  <input
                    type="month"
                    style={{
                      height: 50, borderRadius: 12, border: "1px solid #e2e5ea", background: "#fff",
                      padding: "0 14px", fontSize: 14, fontFamily: POPPINS, outline: "none",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                    }}
                    className="focus:border-[#357D86] focus:ring-1 focus:ring-[#357D86]/20 transition-all font-semibold"
                    value={monthlyPeriod}
                    onChange={(e) => setMonthlyPeriod(e.target.value)}
                  />
                </div>
              )}

              {reportType === 'quarterly' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS }}>Year</label>
                    <select
                      style={{
                        height: 50, borderRadius: 12, border: "1px solid #e2e5ea", background: "#fff",
                        padding: "0 14px", fontSize: 14, fontFamily: POPPINS, outline: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}
                      className="focus:border-[#357D86] focus:ring-1 focus:ring-[#357D86]/20 transition-all font-medium"
                      value={quarterlyYear}
                      onChange={(e) => setQuarterlyYear(e.target.value)}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS }}>Quarter</label>
                    <select
                      style={{
                        height: 42, borderRadius: 12, border: "1px solid #e2e5ea", background: "#fff",
                        padding: "0 14px", fontSize: 13, fontFamily: POPPINS, outline: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}
                      className="focus:border-[#357D86] focus:ring-1 focus:ring-[#357D86]/20 transition-all font-medium"
                      value={quarterlyQuarter}
                      onChange={(e) => setQuarterlyQuarter(e.target.value)}
                    >
                      <option value="1">Q1 (Jan-Mar)</option>
                      <option value="2">Q2 (Apr-Jun)</option>
                      <option value="3">Q3 (Jul-Sep)</option>
                      <option value="4">Q4 (Oct-Dec)</option>
                    </select>
                  </div>
                </div>
              )}

              {reportType === 'annual' && (
                <p style={{ fontSize: 12, color: "#7b8a9a", fontFamily: POPPINS }}>Annual report uses the current calendar year range.</p>
              )}

              <div style={{ 
                marginTop: 24, 
                display: "flex", 
                flexDirection: "column", 
                gap: 12 
              }}>
                <button
                  type="submit"
                  style={{
                    height: 50, width: "100%", padding: "0 24px", borderRadius: 12,
                    fontSize: 16, fontWeight: 600, fontFamily: POPPINS,
                    background: "#357D86", color: "#fff", border: "none",
                    flexShrink: 0,
                    boxShadow: "0 4px 14px rgba(53, 125, 134, 0.25)"
                  }}
                  className="hover:opacity-95 transition-all active:scale-95 flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Create Report
                    </>
                  )}
                </button>
                <DialogClose asChild>
                  <button
                    type="button"
                    style={{
                      height: 50, width: "100%", padding: "0 24px", borderRadius: 12,
                      fontSize: 16, fontWeight: 500, fontFamily: POPPINS,
                      background: "#ffffff", color: "#64748b", 
                      border: "1px solid #e2e8f0",
                      flexShrink: 0
                    }}
                    className="hover:bg-slate-50 hover:text-slate-700 transition-colors active:scale-95"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </DialogClose>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* Mobile/Tablet Report Details Modal */}
      <Dialog open={(isMobile || isTablet) && showViewReport && !!selectedReport} onOpenChange={(open) => { if (!open) { setShowViewReport(false); setSelectedReport(null); } }}>
        <DialogContent
          hideCloseButton={true}
          style={{
            fontFamily: POPPINS,
            maxWidth: isMobile ? "90vw" : 540,
            padding: 0,
            overflow: "hidden",
            borderRadius: 24,
            border: "none",
            zIndex: 10100
          }}
          className="p-0"
        >
          {selectedReport && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "85vh" }}>
              {/* Modal Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #eef0f2",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0,
              }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                  Report Details
                </h2>
                <DialogClose asChild>
                  <button
                    onClick={() => setShowViewReport(false)}
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      minHeight: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: "#f3f4f6",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0,
                      padding: 0,
                      aspectRatio: "1/1",
                      boxSizing: "border-box",
                      overflow: "hidden"
                    }}
                    className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
                  >
                    <X size={18} />
                  </button>
                </DialogClose>
              </div>

              {/* Modal Content */}
              <div style={{
                flex: 1, overflowY: "auto",
                padding: "20px",
                display: "flex", flexDirection: "column", gap: 16
              }}>
                {/* Title & Status Card */}
                <div style={{
                  background: "#fff",
                  borderRadius: 15,
                  border: "1px solid #f0f1f3",
                  display: "flex",
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 110
                }}>
                  <div style={{ width: 6, backgroundColor: "#357D86", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {(() => {
                        const r = selectedReport.summary.riskLevel.toLowerCase();
                        const bg = r === 'high' ? "#FFF1F0" : r === 'moderate' ? "#FFF8ED" : "#E6F7EF";
                        const color = r === 'high' ? "#EB5757" : r === 'moderate' ? "#F2994A" : "#27AE60";
                        return (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 6,
                            background: bg, color: color,
                            textTransform: "uppercase", fontFamily: POPPINS, letterSpacing: "0.05em"
                          }}>{selectedReport.summary.riskLevel} Risk</span>
                        );
                      })()}
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS }}>
                        {selectedReport.period}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS, lineHeight: "1.4" }}>
                      {selectedReport.title}
                    </h3>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ padding: "16px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 6px 0", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.02em" }}>Total Sites</p>
                    <p style={{ fontSize: 24, color: "#1a2a3a", margin: 0, fontWeight: 800, fontFamily: POPPINS }}>{selectedReport.summary.totalSites}</p>
                  </div>
                  <div style={{ padding: "16px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 6px 0", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.02em" }}>Alerts Logged</p>
                    <p style={{ fontSize: 24, color: "#1a2a3a", margin: 0, fontWeight: 800, fontFamily: POPPINS }}>{selectedReport.summary.alertsGenerated}</p>
                  </div>
                </div>

                {/* Parameters Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#64748b", margin: 0, textTransform: "uppercase" }}>Key Parameters</h4>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff", border: "1px solid #f0f1f3", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Droplet size={14} color="#357D86" />
                      <span style={{ fontSize: 13, color: "#1a2a3a", fontWeight: 600 }}>Turbidity</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#357D86" }}>{formatMetric(selectedReport.summary.avgTurbidity)} NTU</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff", border: "1px solid #f0f1f3", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Thermometer size={14} color="#357D86" />
                      <span style={{ fontSize: 13, color: "#1a2a3a", fontWeight: 600 }}>Temperature</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#357D86" }}>{formatMetric(selectedReport.summary.avgTemperature)} °C</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ffffff", border: "1px solid #f0f1f3", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FlaskConical size={14} color="#357D86" />
                      <span style={{ fontSize: 13, color: "#1a2a3a", fontWeight: 600 }}>pH Level</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#357D86" }}>{formatMetric(selectedReport.summary.avgPh)} pH</span>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: "#357D86", color: "#fff", borderRadius: 12, height: 44, fontSize: 14, fontWeight: 600 }}
                    onClick={() => handleDownloadReport()}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Mobile/Tablet Report List Modal ── */}
      {(isMobile || isTablet) && showMobileReportList && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
          padding: isMobile ? "92px 20px 20px" : "40px 20px",
          animation: "fadeIn 0.2s ease-out both"
        }} onClick={() => setShowMobileReportList(false)}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: "#f0f8f9",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <FileText size={16} color="#357D86" />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                  All Reports
                </h2>
              </div>
              <button
                onClick={() => setShowMobileReportList(false)}
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

            {/* Modal Content */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: "20px",
              display: "flex", flexDirection: "column"
            }}>
              {loading ? (
                <div className="flex h-full items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-schistoguard-teal" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex h-full items-center justify-center py-20 text-gray-500 font-medium text-center">No reports found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredReports.map((report) => {
                    const riskLevel = report.summary?.riskLevel || 'low';
                    const riskColors: Record<string, { bg: string; color: string; border: string }> = {
                      low: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                      moderate: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                      high: { bg: "#f1f5f9", color: "#64748b", border: "#f1f5f9" },
                    };
                    const rc = riskColors[riskLevel.toLowerCase()] || riskColors.low;

                    return (
                      <div
                        key={report.id}
                        onClick={() => {
                          handleViewReport(report);
                        }}
                        style={{ position: "relative" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            overflow: "hidden",
                            position: "relative",
                            minHeight: 110,
                            borderRadius: 15,
                            background: selectedReport?.id === report.id ? "#F5FBFB" : "#fff",
                            border: selectedReport?.id === report.id ? "1px solid #357D86" : "1px solid #f1f5f9",
                            cursor: "pointer",
                            boxShadow: selectedReport?.id === report.id ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                          }}
                          className={`${selectedReport?.id === report.id ? '' : 'hover:border-schistoguard-teal/30'} transition-all active:scale-[0.98] group`}
                        >
                          {/* Premium Folder-Style Side Accent */}
                          <div style={{
                            width: 6,
                            backgroundColor: "#357D86",
                            flexShrink: 0
                          }} />

                          <div className="flex w-full items-center justify-between px-4 py-4">
                            <div className="flex flex-1 flex-col justify-center overflow-hidden pr-2">
                              <div className="mb-2 flex items-center justify-between gap-1">
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  background: rc.bg,
                                  color: rc.color,
                                  textTransform: "uppercase",
                                  fontFamily: POPPINS,
                                  letterSpacing: "0.05em",
                                  flexShrink: 0
                                }}>
                                  {riskLevel} Risk
                                </span>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1a2a3a",
                                  fontFamily: POPPINS,
                                  textAlign: "right",
                                  marginLeft: 4,
                                  flexShrink: 0
                                }}>
                                  {report.period.split(' ')[0]} {report.period.split(' ')[1]}
                                </span>
                              </div>
                              <h4
                                style={{
                                  fontFamily: POPPINS,
                                  fontWeight: selectedReport?.id === report.id ? 700 : 500,
                                  color: "#1a2a3a",
                                  letterSpacing: "-0.01em",
                                  lineHeight: "1.3",
                                  fontSize: "14.5px"
                                }}
                                className="line-clamp-2"
                              >
                                {report.title}
                              </h4>
                              <div
                                className="mt-2"
                                style={{
                                  fontFamily: POPPINS,
                                  fontWeight: 500,
                                  color: "#64748b",
                                  fontSize: "11px",
                                  letterSpacing: "0.01em"
                                }}
                              >
                                Generated on {new Date(report.generatedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </div>
                            </div>

                            <div className="flex items-center">
                              <ChevronRight
                                size={16}
                                strokeWidth={3}
                                style={{ color: "#94a3b8" }}
                                className="shrink-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
