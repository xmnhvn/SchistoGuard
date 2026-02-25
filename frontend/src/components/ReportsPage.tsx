import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

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

export const ReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedType, setSelectedType] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
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

  return (
    <div className="bg-schistoguard-light-bg min-h-0 overflow-visible">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 flex justify-end">
          <div className="flex gap-3">
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
      </div>
    </div>
  );
}