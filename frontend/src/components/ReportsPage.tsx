import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Loader2,
  X,
  AlertTriangle,
  Droplet,
  Thermometer,
  FlaskConical,
  Trash2,
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

export const ReportsPage: React.FC = () => {
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
  const previewDocumentRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    fetchReports();
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
    } catch (err: any) {
      setError(err.message || 'Failed to download report PDF');
    } finally {
      setDownloading(false);
    }
  };

  const filteredReports = reports.filter((report) => selectedType === 'all' || report.type === selectedType);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-100 text-yellow-800">Moderate Risk</Badge>;
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge>{risk}</Badge>;
    }
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
    switch (risk) {
      case 'high':
        return 'from-red-50 to-rose-50';
      case 'moderate':
        return 'from-amber-50 to-yellow-50';
      default:
        return 'from-emerald-50 to-teal-50';
    }
  };

  const formatMetric = (value?: number, decimals = 2) => {
    const numeric = Number(value ?? 0);
    if (Number.isNaN(numeric)) return '0.00';
    return numeric.toFixed(decimals);
  };

  const activeReport = selectedReport;

  return (
    <div className="relative bg-schistoguard-light-bg h-[calc(100vh-88px)] overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-3 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {successMessage && (
          <div className="pointer-events-auto flex min-w-[320px] max-w-[680px] items-start justify-between gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-800 shadow-lg">
            <p className="text-sm font-medium">{successMessage}</p>
            <button
              type="button"
              aria-label="Close success message"
              className="rounded p-1 text-green-700 transition-colors hover:bg-green-100"
              onClick={() => setSuccessMessage(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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

      <div className="mx-auto flex h-full max-w-[1800px] flex-col p-6">
        <div className="grid h-full min-h-[520px] flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reports List Column */}
          <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex-shrink-0 bg-white px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-40 border border-gray-300 bg-gray-50 transition-colors focus:border-schistoguard-teal focus:bg-white">
                      <Calendar className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current-month">Current Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="current-quarter">Current Quarter</SelectItem>
                      <SelectItem value="last-quarter">Last Quarter</SelectItem>
                      <SelectItem value="current-year">Current Year</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-40 shrink-0">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-full border border-gray-300 bg-gray-50 transition-colors focus:border-schistoguard-teal focus:bg-white">
                        <Filter className="mr-2 h-4 w-4 shrink-0" />
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="flex items-center gap-2 bg-schistoguard-teal text-white hover:bg-schistoguard-teal/90"
                    size="sm"
                    onClick={() => setShowCreateReport(true)}
                  >
                    <FileText className="h-4 w-4" />
                    Create Report
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-4">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex h-full items-center justify-center py-8 text-center text-gray-500">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Loading reports...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex h-full items-center justify-center py-8 text-center text-gray-500">No reports available.</div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`cursor-pointer rounded-lg border bg-white p-4 transition-all hover:shadow-md ${
                      selectedReport?.id === report.id ? 'border-schistoguard-teal bg-schistoguard-teal/5 shadow-md' : ''
                    }`}
                    onClick={() => handleViewReport(report)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="mb-1 text-base font-semibold text-schistoguard-navy">{report.title}</h4>
                        <div className="mb-2 text-xs text-gray-600">
                          {report.period} | Generated {new Date(report.generatedDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel Column */}
        <div className="flex h-full min-h-0 flex-col">
          {!selectedReport ? (
            <Card className="flex h-full min-h-0 flex-col items-center justify-center bg-slate-50 p-12 text-center">
              <FileText className="mb-4 h-16 w-16 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-700">No Report Selected</h3>
              <p className="text-sm text-slate-500">Select a report from the list to view its details</p>
            </Card>
          ) : (
            <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
              <div className="flex-shrink-0 border-b bg-white px-6 py-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-semibold text-slate-900">{selectedReport.title}</h4>
                  <div className="flex gap-2">
                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDeleteClick(selectedReport)}
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
                            <strong>{selectedReport.title}</strong>
                            <br />
                            {selectedReport.period}
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
                      onClick={handleDownloadReport}
                      disabled={downloading}
                    >
                      {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex flex-nowrap items-center gap-2 overflow-hidden text-sm">
                  <span className="shrink-0 text-slate-700">
                    Generated {new Date(selectedReport.generatedDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-')}
                  </span>
                  <span className="inline-flex shrink-0">{getRiskBadge(selectedReport.summary.riskLevel)}</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
                <article ref={previewDocumentRef} className="mx-auto w-full max-w-[760px] bg-white p-5 text-[13px] leading-relaxed text-slate-800 sm:p-7">
                  <header className="border-b border-slate-300 pb-3 text-center">
                    <h3 className="text-base font-semibold uppercase tracking-wide text-slate-900">Water Quality Report For SchistoSomiasis Risk</h3>
                    <p className="mt-1 text-sm font-medium text-slate-700">{selectedReport.period}</p>
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
                          <td className="border border-slate-300 px-2 py-1 capitalize">{selectedReport.summary.riskLevel}</td>
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
                      Overall risk classification for this reporting period is <span className="font-semibold capitalize">{selectedReport.summary.riskLevel}</span>.
                      {selectedReport.summary.alertsGenerated > 0
                        ? ' Alerts were observed and should be verified by field teams for immediate corrective action.'
                        : ' No active alerts were observed, indicating stable water quality conditions during this period.'}
                    </p>
                  </section>

                </article>
              </div>
            </Card>
          )}
        </div>
        </div>
      </div>

      {/* Create Report Dialog */}
      <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
        <DialogContent className="w-11/12 max-w-md sm:w-1/2">
          <DialogHeader>
            <DialogTitle className="mb-1 text-center text-2xl font-bold">Create New Report</DialogTitle>
            <p className="mb-2 text-center text-sm text-muted-foreground">
              Select the type of report you want to generate.
            </p>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleCreateReport}>
            <fieldset disabled={creating}>
              <legend className="mb-6 block font-medium">Report Type</legend>
              <div className="flex flex-wrap gap-3">
                {['weekly', 'monthly', 'quarterly', 'annual'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`cursor-pointer rounded-full border px-6 py-1 font-medium transition-colors ${
                      reportType === type
                        ? 'border-schistoguard-teal bg-schistoguard-teal text-white'
                        : 'border-gray-200 bg-gray-50 hover:border-schistoguard-teal'
                    }`}
                    onClick={() => setReportType(type)}
                    disabled={creating}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset disabled={creating} className="space-y-3">
              <legend className="block font-medium">Report Period</legend>

              {reportType === 'weekly' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    Start Date
                    <input
                      type="date"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      max={weeklyEndDate}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    End Date
                    <input
                      type="date"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      min={weeklyStartDate}
                    />
                  </label>
                </div>
              )}

              {reportType === 'monthly' && (
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Month
                  <input
                    type="month"
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={monthlyPeriod}
                    onChange={(e) => setMonthlyPeriod(e.target.value)}
                  />
                </label>
              )}

              {reportType === 'quarterly' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    Year
                    <select
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={quarterlyYear}
                      onChange={(e) => setQuarterlyYear(e.target.value)}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-gray-700">
                    Quarter
                    <select
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={quarterlyQuarter}
                      onChange={(e) => setQuarterlyQuarter(e.target.value)}
                    >
                      <option value="1">Q1 (Jan-Mar)</option>
                      <option value="2">Q2 (Apr-Jun)</option>
                      <option value="3">Q3 (Jul-Sep)</option>
                      <option value="4">Q4 (Oct-Dec)</option>
                    </select>
                  </label>
                </div>
              )}

              {reportType === 'annual' && (
                <p className="text-sm text-gray-600">Annual report uses the current calendar year range.</p>
              )}
            </fieldset>

            <div className="flex justify-center gap-3 pt-6">
              <DialogClose asChild>
                <button type="button" className="rounded border px-8 py-2 hover:bg-gray-100" disabled={creating}>
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                className="flex items-center gap-2 rounded bg-schistoguard-teal px-8 py-2 font-semibold text-white hover:bg-schistoguard-teal/90"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
