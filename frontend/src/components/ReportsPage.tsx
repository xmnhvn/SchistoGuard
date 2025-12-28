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

  // TODO: Replace with real reports data from backend or props
  const reports: Report[] = [];

  // TODO: Replace with real metrics data from backend or props
  const metrics: MetricCard[] = [];

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
    const isPositive = change > 0;
    switch (trend) {
      case 'up':
        return <TrendingUp className={`${sizeClass} ${isPositive ? 'text-green-600' : 'text-red-600'}`} />;
      case 'down':
        return <TrendingDown className={`${sizeClass} ${isPositive ? 'text-red-600' : 'text-green-600'}`} />;
      default:
        return <div className={`${sizeClass} bg-gray-300 rounded-full`}></div>;
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

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            {/* Key Metrics - real data integration needed */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-full text-center text-gray-400 py-12">
                No overview data available. Connect to backend for real metrics.
              </div>
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
                    reports.slice(0, 3).map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{report.title}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            {report.period} • Generated {new Date(report.generatedDate).toLocaleDateString()}
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
            {/* Analytics Dashboard - real data integration needed */}
            <div className="col-span-full text-center text-gray-400 py-12">
              No analytics data available. Connect to backend for real analytics.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}