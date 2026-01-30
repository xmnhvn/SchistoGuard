import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Users, MapPin, Activity, Droplets, Thermometer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';

interface Report {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'incident';
  period: string;
  generatedDate: string;
  status: 'draft' | 'published' | 'archived';
  summary: {
    totalSites: number;
    alertsGenerated: number;
    avgTurbidity: number;
    riskLevel: 'low' | 'moderate' | 'high';
  };
  downloadUrl?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

export const ReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedType, setSelectedType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 });
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [reportType, setReportType] = useState('monthly');

  React.useEffect(() => {
    fetch("http://localhost:3001/api/sensors/history")
      .then(res => res.json())
      .then(data => {
        // Remove dummy report, leave reports empty
        setReports([]);
      });
  }, []);

  const filteredReports = reports.filter(report => {
    return selectedType === 'all' || report.type === selectedType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'moderate':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Moderate Risk</Badge>;
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge>{risk}</Badge>;
    }
  };

  const getTrendIcon = (trend: string, change: number, sizeClass = 'w-4 h-4') => {
    // Only show up or down arrow, remove gray circle for neutral
    if (trend === 'up') {
      return <TrendingUp className={`${sizeClass} text-green-500`} strokeWidth={3} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`${sizeClass} text-red-500`} strokeWidth={3} />;
    } else {
      return null;
    }
  };

  return (
    <div className="bg-schistoguard-light-bg min-h-0 overflow-visible">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="col-span-1">
            <h1 className="text-3xl font-bold text-schistoguard-navy mb-4">Reports & Analytics</h1>
            <p className="text-gray-600 leading-tight mb-1">Water quality monitoring reports and trend analysis</p>
          </div>
          {activeTab === 'reports' && (
            <div className="col-span-1 lg:col-span-2 relative">
              <div className="flex gap-3 absolute right-0 top-0">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48 border border-gray-300 bg-gray-50 focus:bg-white focus:border-schistoguard-teal transition-colors">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Current Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="current-quarter">Current Quarter</SelectItem>
                    <SelectItem value="last-quarter">Last Quarter</SelectItem>
                    <SelectItem value="current-year">Current Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48 border border-gray-300 bg-gray-50 focus:bg-white focus:border-schistoguard-teal transition-colors">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6 mb-4">
          <TabsList className="text-lg font-medium flex border-b border-gray-200 mb-4 bg-transparent">
            <TabsTrigger
              value="overview"
              className={`text-lg font-medium px-6 pb-2 pt-2 bg-transparent border-b-4 transition-colors duration-200 ${activeTab === 'overview' ? 'border-schistoguard-teal text-schistoguard-teal' : 'border-transparent text-schistoguard-navy hover:text-schistoguard-teal'}`}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className={`text-lg font-medium px-6 pb-2 pt-2 bg-transparent border-b-4 transition-colors duration-200 ${activeTab === 'reports' ? 'border-schistoguard-teal text-schistoguard-teal' : 'border-transparent text-schistoguard-navy hover:text-schistoguard-teal'}`}
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className={`text-lg font-medium px-6 pb-2 pt-2 bg-transparent border-b-4 transition-colors duration-200 ${activeTab === 'analytics' ? 'border-schistoguard-teal text-schistoguard-teal' : 'border-transparent text-schistoguard-navy hover:text-schistoguard-teal'}`}
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-12">No overview data available.</div>
              ) : (
                <>
                  {metrics.map((metric, idx) => {
                    let units = "";
                    let subtitle = "";
                    let valueClass = "text-2xl font-bold ";
                    if (metric.title === "Avg Turbidity") {
                      valueClass += "text-blue-600";
                    } else if (metric.title === "Avg Temperature") {
                      valueClass += "text-red-600";
                    } else if (metric.title === "Avg pH") {
                      valueClass += "text-green-600";
                    } else if (metric.title === "Average Warning Alerts") {
                      valueClass += "text-yellow-600";
                    } else if (metric.title === "Average Critical Alerts") {
                      valueClass += "text-red-600";
                    } else if (metric.title === "Number Registered Counts") {
                      valueClass += "text-schistoguard-navy";
                    }
                    let titleClass = "font-bold text-schistoguard-navy mt-1";
                    let subtitleClass = "text-sm text-gray-500 mt-1";
                    if (metric.title === "Avg Turbidity") {
                      units = "NTU";
                      subtitle = "+15% from last period";
                    } else if (metric.title === "Avg pH") {
                      units = "";
                      subtitle = "+2% from last period";
                    } else if (metric.title === "Avg Temperature") {
                      units = "°C";
                      subtitle = "+1% from last period";
                    } else if (metric.title === "Total Readings") {
                      units = "";
                      subtitle = "+5% from last period";
                    } else if (metric.title === "Active Alerts") {
                      units = "";
                      subtitle = "-3% from last period";
                    } else if (metric.title === "Number Registered Counts") {
                      units = "";
                      subtitle = "+5% from last period";
                    }
                    return (
                      <Card key={idx} className="h-44 flex flex-col justify-between p-6 bg-white rounded-xl shadow-sm">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            {metric.icon}
                          </div>
                          {getTrendIcon(metric.trend, metric.change, 'w-6 h-6')}
                        </div>
                        <div className="mt-2 mb-6 flex flex-col items-center justify-center text-center">
                          <div className={valueClass}>{metric.value} {units}</div>
                          <div className={titleClass}>{metric.title}</div>
                          <div className={subtitleClass}>{subtitle}</div>
                        </div>
                      </Card>
                    );
                  })}
                  {metrics.length < 6 && Array.from({ length: 6 - metrics.length }).map((_, i) => (
                    <Card key={`blank-${i}`} className="h-44 flex flex-col justify-center items-center bg-gray-50 border-dashed border-2 border-gray-200 rounded-xl"> 
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-lg font-medium">
                  <FileText className="w-5 h-5 mr-2" />
                  Reports
                </CardTitle>
                <Button
                  className="ml-auto flex items-center gap-2 bg-schistoguard-teal text-white hover:bg-schistoguard-teal/90"
                  size="sm"
                  onClick={() => setShowCreateReport(true)}
                >
                  <FileText className="w-4 h-4" />
                  Create Report
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col h-80">
                <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
                  <DialogContent className="max-w-md w-1/2">
                    <DialogHeader>
                      <DialogTitle className="text-2xl text-center font-bold mb-1">Create New Report</DialogTitle>
                      <p className="text-sm text-center text-muted-foreground mb-2">Select the type of report you want to generate.</p>
                    </DialogHeader>
                    <form className="space-y-6">
                      <fieldset>
                        <legend className="block mb-6 font-medium">Report Type</legend>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            className={`flex items-center gap-2 px-6 py-1 rounded-full border cursor-pointer transition-colors font-medium ${reportType === 'weekly' ? 'bg-schistoguard-teal text-white border-schistoguard-teal' : 'bg-gray-50 border-gray-200 hover:border-schistoguard-teal'}`}
                            onClick={() => setReportType('weekly')}
                          >
                            Weekly
                          </button>
                          <button
                            type="button"
                            className={`flex items-center gap-2 px-6 py-1 rounded-full border cursor-pointer transition-colors font-medium ${reportType === 'monthly' ? 'bg-schistoguard-teal text-white border-schistoguard-teal' : 'bg-gray-50 border-gray-200 hover:border-schistoguard-teal'}`}
                            onClick={() => setReportType('monthly')}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            className={`flex items-center gap-2 px-6 py-1 rounded-full border cursor-pointer transition-colors font-medium ${reportType === 'annual' ? 'bg-schistoguard-teal text-white border-schistoguard-teal' : 'bg-gray-50 border-gray-200 hover:border-schistoguard-teal'}`}
                            onClick={() => setReportType('annual')}
                          >
                            Annual
                          </button>
                        </div>
                      </fieldset>
                      <div className="flex justify-center gap-3 pt-6">
                        <DialogClose asChild>
                          <button type="button" className="px-8 py-2 rounded border bg-white-100 hover:bg-gray-300">Cancel</button>
                        </DialogClose>
                        <button type="submit" className="px-8 py-2 rounded bg-schistoguard-teal text-white hover:bg-schistoguard-teal/90 font-semibold">Create</button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {reports.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 flex items-center justify-center h-60">No reports available.</div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-6 border rounded-lg bg-white">
                        <div className="flex-1">
                          <h4 className="font-semibold text-schistoguard-navy text-lg mb-1">{report.title}</h4>
                          <div className="text-sm text-gray-600 mb-2">
                            {report.period} &nbsp;•&nbsp; Generated {new Date(report.generatedDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">Total Sites: {report.summary.totalSites} &nbsp;|&nbsp; Alerts: {report.summary.alertsGenerated} &nbsp;|&nbsp; Avg Turbidity: {report.summary.avgTurbidity}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild disabled={!report.downloadUrl}>
                            <a href={report.downloadUrl} download>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}