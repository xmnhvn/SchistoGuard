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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Average Turbidity */}
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-blue-500"><Activity className="w-8 h-8" /></div>
                    {getTrendIcon('up', 15, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">7.2 NTU</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Average Turbidity</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">+15% from last period</div>
                </CardContent>
              </Card>
              {/* Average pH */}
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-cyan-600"><Droplets className="w-8 h-8" /></div>
                    {getTrendIcon('up', 2, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">7.2</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Average pH</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">+2% from last period</div>
                </CardContent>
              </Card>
              {/* Average Temperature */}
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-orange-500"><Thermometer className="w-8 h-8" /></div>
                    {getTrendIcon('up', 1, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">28.5°C</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Average Temperature</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">+1% from last period</div>
                </CardContent>
              </Card>
              {/* Active Alerts */}
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-yellow-500"><AlertTriangle className="w-8 h-8" /></div>
                    {getTrendIcon('down', -3, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">8</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Active Alerts</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">-3% from last period</div>
                </CardContent>
              </Card>
              {/* Incidents Reported */}
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-red-600"><AlertTriangle className="w-8 h-8" /></div>
                    {getTrendIcon('down', -1, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">2</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Incidents Reported</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">-1 from last period</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 h-40 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-schistoguard-teal"><Users className="w-8 h-8" /></div>
                    {getTrendIcon('up', 5, 'w-7 h-7')}
                  </div>
                  <div className="text-2xl font-bold text-schistoguard-navy leading-tight text-center">1,234</div>
                  <div className="text-lg font-bold text-gray-700 text-center">Number Registered Counts</div>
                  <div className="text-base text-gray-500 mt-2 font-semibold text-center">+5% from last period</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-medium">
                  <FileText className="w-5 h-5 mr-2" />
                  Reports
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
                        {/* Removed status and risk badges */}
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Water Quality Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Water Quality Trends</CardTitle>
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
                    <div className="mb-3">
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
                  <CardTitle className="text-lg font-medium">Alert Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-md font-medium">Critical Alerts</span>
                      <span className="text-md font-medium text-red-600">3 (37.5%)</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 pb-2 border-b">
                      <span className="text-md font-medium">Warning Alerts</span>
                      <span className="text-md font-medium text-yellow-600">4 (50%)</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 pb-2 border-b">
                      <span className="text-md font-medium">Info Alerts</span>
                      <span className="text-md font-medium text-blue-600">1 (12.5%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">98.5%</div>
                    <div className="text-md font-medium text-gray-600">Sensor Uptime</div>
                    <div className="text-md text-gray-500 mt-1 mb-1">Last 30 days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">2.3 min</div>
                    <div className="text-md font-medium text-gray-600">Avg Response Time</div>
                    <div className="text-md text-gray-500 mt-1 mb-1">Alert to notification</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">247</div>
                    <div className="text-md font-medium text-gray-600">Active Subscribers</div>
                    <div className="text-md text-gray-500 mt-1 mb-1">Receiving alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}