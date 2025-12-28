import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Users, MapPin, Activity, Droplets, Thermometer } from 'lucide-react';
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

  // Real data state
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Fetch real data from backend
  React.useEffect(() => {
    // Fetch readings for metrics and analytics
    fetch("http://localhost:3001/api/sensors/history")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Metrics: average turbidity, total readings, etc.
          const totalSites = 1; // If you have multiple sites, update accordingly
          const alertsGenerated = data.length;
          const avgTurbidity = data.length > 0 ? (data.reduce((sum, r) => sum + (r.turbidity || 0), 0) / data.length).toFixed(2) : "-";
          const avgTemperature = data.length > 0 ? (data.reduce((sum, r) => sum + (r.temperature || 0), 0) / data.length).toFixed(2) : "-";
          const avgPh = data.length > 0 ? (data.reduce((sum, r) => sum + (r.ph || 0), 0) / data.length).toFixed(2) : "-";
          // Fetch alerts for average critical alerts
          fetch("http://localhost:3001/api/sensors/alerts")
            .then(res => res.json())
            .then(alertsData => {
              let avgCritical = 0;
              let avgWarning = 0;
              if (Array.isArray(alertsData) && alertsData.length > 0) {
                const criticalAlerts = alertsData.filter(a => a.level === "critical");
                const warningAlerts = alertsData.filter(a => a.level === "warning");
                avgCritical = parseFloat((criticalAlerts.length / alertsData.length * 100).toFixed(1)); // percent
                avgWarning = parseFloat((warningAlerts.length / alertsData.length * 100).toFixed(1)); // percent
              }
              setMetrics([
                { title: "Avg Turbidity", value: avgTurbidity, change: 0, trend: "stable", icon: <Droplets className="w-6 h-6 text-blue-500" /> },
                { title: "Avg Temperature", value: avgTemperature, change: 0, trend: "stable", icon: <Thermometer className="w-6 h-6 text-red-500" /> },
                { title: "Avg pH", value: avgPh, change: 0, trend: "stable", icon: <Activity className="w-6 h-6 text-green-500" /> },
                { title: "Average Warning Alerts", value: avgWarning + "%", change: 0, trend: avgWarning > 0 ? "up" : "stable", icon: <AlertTriangle className="w-6 h-6 text-yellow-500" /> },
                { title: "Average Critical Alerts", value: avgCritical + "%", change: 0, trend: avgCritical > 0 ? "up" : "stable", icon: <AlertTriangle className="w-6 h-6 text-red-500" /> },
                { title: "Number Registered Counts", value: "1,234", change: 5, trend: "up", icon: <Users className="w-6 h-6 text-schistoguard-navy" /> },
              ]);
            });
          setAnalytics({ avgTurbidity, avgTemperature, avgPh, totalReadings: data.length });
        }
      });
    // Fetch alerts for reports
    fetch("http://localhost:3001/api/sensors/alerts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // For demo, treat each alert as a report
          setReports(data.map((alert, idx) => ({
            id: alert.id,
            title: `${alert.parameter} Alert`,
            type: "incident",
            period: new Date(alert.timestamp).toLocaleDateString(),
            generatedDate: alert.timestamp,
            status: alert.isAcknowledged ? "published" : "draft",
            summary: {
              totalSites: 1,
              alertsGenerated: 1,
              avgTurbidity: alert.parameter === "Turbidity" ? alert.value : 0,
              riskLevel: alert.level === "critical" ? "high" : alert.level === "warning" ? "moderate" : "low"
            },
            downloadUrl: undefined
          })));
        }
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
          {/* Header and description (col 1) */}
          <div className="col-span-1">
            <h1 className="text-3xl font-bold text-schistoguard-navy mb-4">Reports & Analytics</h1>
            <p className="text-gray-600 leading-tight mb-1">Water quality monitoring reports and trend analysis</p>
          </div>
          {/* Filters (cols 2-3, right end) - only show on reports tab */}
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
                    <SelectItem value="incident">Incident Reports</SelectItem>
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
                  {/* Add blank card to always show 6 cards */}
                  {metrics.length < 6 && Array.from({ length: 6 - metrics.length }).map((_, i) => (
                    <Card key={`blank-${i}`} className="h-44 flex flex-col justify-center items-center bg-gray-50 border-dashed border-2 border-gray-200 rounded-xl">
                      {/* Empty card */}
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="min-h-[60vh] max-h-[80vh] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-medium">
                  <FileText className="w-5 h-5 mr-2" />
                  Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4">
                  {reports.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No reports available.</div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{report.title}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            {report.period} • Generated {new Date(report.generatedDate).toLocaleDateString()}
                          </div>
                          <div className="mt-2 flex gap-2">
                            {getStatusBadge(report.status)}
                            {getRiskBadge(report.summary.riskLevel)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </Button>
                          <Button variant="outline" size="sm" disabled={!report.downloadUrl}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Dashboard - dashboard style layout */}
            {analytics ? (
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Water Quality Trends */}
                  <div className="bg-white rounded-xl p-6 shadow-sm flex-1">
                    <div className="font-semibold text-lg mb-6">Water Quality Trends</div>
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-sm">Average Turbidity</span>
                        <span className="text-blue-700 font-bold">{analytics.avgTurbidity} NTU</span>
                      </div>
                      <div className="w-full h-3 bg-blue-100 rounded-full mb-4">
                        <div className="h-3 bg-teal-700 rounded-full" style={{ width: `${Math.min(Number(analytics.avgTurbidity) * 10, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-sm">Average Temperature</span>
                        <span className="text-red-700 font-bold">{analytics.avgTemperature}°C</span>
                      </div>
                      <div className="w-full h-3 bg-red-100 rounded-full mb-4">
                        <div className="h-3 bg-red-500 rounded-full" style={{ width: `${Math.min(Number(analytics.avgTemperature) * 2, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-sm">Average pH Level</span>
                        <span className="text-green-700 font-bold">{analytics.avgPh}</span>
                      </div>
                      <div className="w-full h-3 bg-green-100 rounded-full mb-2">
                        <div className="h-3 bg-green-500 rounded-full" style={{ width: `${Math.min(Number(analytics.avgPh) * 12, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  {/* Alert Distribution */}
                  <div className="bg-white rounded-xl p-6 shadow-sm flex-1">
                    <div className="font-semibold text-lg mb-4">Alert Distribution</div>
                  <hr className="mb-8" />
                    <div className="flex flex-col gap-5">
                    <div className="flex justify-between items-center mb-6">
                        <span>Critical Alerts</span>
                        <span className="font-bold text-red-600">3 (37.5%)</span>
                      </div>
                    <div className="flex justify-between items-center mb-6">
                        <span>Warning Alerts</span>
                        <span className="font-bold text-yellow-600">4 (50%)</span>
                      </div>
                    <div className="flex justify-between items-center mb-6">
                        <span>Info Alerts</span>
                        <span className="font-bold text-blue-600">1 (12.5%)</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* System Performance */}
                <div className="bg-white rounded-xl p-6 shadow-sm mt-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="flex flex-col items-center justify-center h-32">
                    <div className="text-2xl font-bold text-green-600 mb-1">98.5%</div>
                    <div className="text-base font-medium text-schistoguard-navy">Sensor Uptime</div>
                    <div className="text-xs text-gray-400 mt-1">Last 30 days</div>
                  </div>
                  <div className="flex flex-col items-center justify-center h-32">
                    <div className="text-2xl font-bold text-blue-600 mb-1">2.3 min</div>
                    <div className="text-base font-medium text-schistoguard-navy">Avg Response Time</div>
                    <div className="text-sm text-gray-400 mt-1">Alert to notification</div>
                  </div>
                  <div className="flex flex-col items-center justify-center h-32">
                    <div className="text-2xl font-bold text-purple-600 mb-1">247</div>
                    <div className="text-base font-medium text-schistoguard-navy">Active Subscribers</div>
                    <div className="text-sm text-gray-400 mt-1">Receiving alerts</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-full text-center text-gray-400 py-12">No analytics data available.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}