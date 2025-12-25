import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Users, MapPin, Activity } from 'lucide-react';
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

  // Sample reports data
  const reports: Report[] = [
    {
      id: 'report-001',
      title: 'January 2025 Water Quality Summary',
      type: 'monthly',
      period: 'January 2025',
      generatedDate: '2025-01-20',
      status: 'draft',
      summary: {
        totalSites: 15,
        alertsGenerated: 8,
        avgTurbidity: 7.2,
        riskLevel: 'moderate'
      }
    },
    {
      id: 'report-002',
      title: 'Q4 2024 Quarterly Assessment',
      type: 'quarterly',
      period: 'Q4 2024',
      generatedDate: '2025-01-05',
      status: 'published',
      summary: {
        totalSites: 15,
        alertsGenerated: 23,
        avgTurbidity: 8.9,
        riskLevel: 'high'
      },
      downloadUrl: '/reports/q4-2024-assessment.pdf'
    },
    {
      id: 'report-003',
      title: 'Critical Turbidity Incident - San Miguel',
      type: 'incident',
      period: 'Jan 15-20, 2025',
      generatedDate: '2025-01-20',
      status: 'published',
      summary: {
        totalSites: 1,
        alertsGenerated: 12,
        avgTurbidity: 18.5,
        riskLevel: 'high'
      },
      downloadUrl: '/reports/san-miguel-incident.pdf'
    },
    {
      id: 'report-004',
      title: 'December 2024 Community Health Report',
      type: 'monthly',
      period: 'December 2024',
      generatedDate: '2025-01-02',
      status: 'published',
      summary: {
        totalSites: 15,
        alertsGenerated: 5,
        avgTurbidity: 4.8,
        riskLevel: 'low'
      },
      downloadUrl: '/reports/dec-2024-health.pdf'
    }
  ];

  // Sample metrics
  const metrics: MetricCard[] = [
    {
      title: 'Total Sites Monitored',
      value: 15,
      change: 2,
      trend: 'up',
      icon: <MapPin className="w-5 h-5" />
    },
    {
      title: 'Active Alerts',
      value: 8,
      change: -3,
      trend: 'down',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    {
      title: 'Average Turbidity',
      value: '7.2 NTU',
      change: 15,
      trend: 'up',
      icon: <Activity className="w-5 h-5" />
    },
    {
      title: 'Community Subscribers',
      value: 247,
      change: 12,
      trend: 'up',
      icon: <Users className="w-5 h-5" />
    }
  ];

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

  const getTrendIcon = (trend: string, change: number) => {
    const isPositive = change > 0;
    switch (trend) {
      case 'up':
        return <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />;
      case 'down':
        return <TrendingDown className={`w-4 h-4 ${isPositive ? 'text-red-600' : 'text-green-600'}`} />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
    }
  };

  return (
    <div className="min-h-screen bg-schistoguard-light-bg">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Water quality monitoring reports and trend analysis</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-schistoguard-teal">{metric.icon}</div>
                      {getTrendIcon(metric.trend, metric.change)}
                    </div>
                    <div className="text-2xl font-bold text-schistoguard-navy">{metric.value}</div>
                    <div className="text-sm text-gray-600">{metric.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {metric.change > 0 ? '+' : ''}{metric.change}% from last period
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Reports Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Recent Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{report.title}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          {report.period} • Generated {new Date(report.generatedDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(report.status)}
                          {getRiskBadge(report.summary.riskLevel)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.downloadUrl && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
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
                  <SelectTrigger className="w-48">
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

                <Button variant="outline" className="ml-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Generate New Report
                </Button>
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-schistoguard-navy">{report.title}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          {report.period} • Generated {new Date(report.generatedDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(report.status)}
                          {getRiskBadge(report.summary.riskLevel)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        {report.downloadUrl && (
                          <Button size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Report Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-xl font-bold text-schistoguard-teal">{report.summary.totalSites}</div>
                        <div className="text-sm text-gray-600">Sites Monitored</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">{report.summary.alertsGenerated}</div>
                        <div className="text-sm text-gray-600">Alerts Generated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{report.summary.avgTurbidity}</div>
                        <div className="text-sm text-gray-600">Avg Turbidity (NTU)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{getRiskBadge(report.summary.riskLevel)}</div>
                        <div className="text-sm text-gray-600">Overall Risk</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Water Quality Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Water Quality Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Turbidity Levels</span>
                        <span className="text-sm text-gray-600">7.2 NTU avg</span>
                      </div>
                      <Progress value={72} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Temperature Stability</span>
                        <span className="text-sm text-gray-600">28.5°C avg</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">pH Balance</span>
                        <span className="text-sm text-gray-600">7.2 avg</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Alerts</span>
                      <span className="text-sm font-medium text-red-600">3 (37.5%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Warning Alerts</span>
                      <span className="text-sm font-medium text-yellow-600">4 (50%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Info Alerts</span>
                      <span className="text-sm font-medium text-blue-600">1 (12.5%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">98.5%</div>
                    <div className="text-sm text-gray-600">Sensor Uptime</div>
                    <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">2.3 min</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                    <div className="text-xs text-gray-500 mt-1">Alert to notification</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">247</div>
                    <div className="text-sm text-gray-600">Active Subscribers</div>
                    <div className="text-xs text-gray-500 mt-1">Receiving alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};