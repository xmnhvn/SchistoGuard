import React, { useState } from 'react';
import { Clock, Search, Filter, Activity, Droplets, Thermometer, Eye, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

// Generate hourly readings for the past 24 hours
const generateHourlyReadings = () => {
  const readings = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Simulate realistic variations throughout the day
    const baseTemp = 26 + Math.sin(hour / 24 * Math.PI * 2) * 3;
    const baseTurbidity = 4.5 + Math.random() * 2;
    const basePh = 7.0 + (Math.random() - 0.5) * 0.4;
    
    readings.push({
      id: `reading-${i}`,
      timestamp: timestamp.toISOString(),
      turbidity: parseFloat(baseTurbidity.toFixed(1)),
      temperature: parseFloat(baseTemp.toFixed(1)),
      ph: parseFloat(basePh.toFixed(1)),
      riskLevel: baseTurbidity > 15 ? 'critical' : baseTurbidity > 5 ? 'warning' : 'safe'
    });
  }
  
  return readings.reverse(); // Most recent first
};

interface SitesDirectoryProps {
  onViewSiteDetail: (siteId: string) => void;
}

export const SitesDirectory: React.FC<SitesDirectoryProps> = ({ onViewSiteDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('24h');

  const hourlyReadings = generateHourlyReadings();

  // Filter readings based on search and filters
  const filteredReadings = hourlyReadings.filter(reading => {
    const timestamp = new Date(reading.timestamp);
    const searchMatch = timestamp.toLocaleString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                       reading.turbidity.toString().includes(searchQuery) ||
                       reading.temperature.toString().includes(searchQuery);
    
    const matchesRisk = filterRisk === 'all' || reading.riskLevel === filterRisk;
    
    // Time range filter
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

  // Calculate statistics
  const safeCount = filteredReadings.filter(r => r.riskLevel === 'safe').length;
  const warningCount = filteredReadings.filter(r => r.riskLevel === 'warning').length;
  const criticalCount = filteredReadings.filter(r => r.riskLevel === 'critical').length;
  const avgTurbidity = filteredReadings.length > 0 
    ? (filteredReadings.reduce((sum, r) => sum + r.turbidity, 0) / filteredReadings.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-schistoguard-light-bg">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">Hourly Data Readings</h1>
          <p className="text-gray-600">Mang Jose's Fish Pond - 100 square meters</p>
          <p className="text-sm text-gray-500">Water quality data collected every hour • {hourlyReadings.length} total readings</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-schistoguard-navy">{filteredReadings.length}</div>
              <p className="text-xs text-muted-foreground">In selected range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Safe Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{safeCount}</div>
              <p className="text-xs text-muted-foreground">Turbidity ≤5 NTU</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Warning Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <p className="text-xs text-muted-foreground">Turbidity 6-15 NTU</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Turbidity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-schistoguard-navy">{avgTurbidity}</div>
              <p className="text-xs text-muted-foreground">NTU (selected range)</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by time, turbidity, or temperature..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                  <SelectTrigger className="w-40">
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="12h">Last 12 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="safe">Safe</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Readings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Time-Series Data</CardTitle>
              <Badge variant="outline">{filteredReadings.length} records</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Turbidity (NTU)</TableHead>
                    <TableHead className="text-center">Temperature (°C)</TableHead>
                    <TableHead className="text-center">pH Level</TableHead>
                    <TableHead className="text-center">Risk Level</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReadings.map((reading) => {
                    const time = formatTimestamp(reading.timestamp);
                    return (
                      <TableRow key={reading.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{time.time}</TableCell>
                        <TableCell className="text-sm text-gray-600">{time.date}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{reading.turbidity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">{reading.temperature}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{reading.ph}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getRiskBadgeClass(reading.riskLevel)}>
                            {reading.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-500">
                          {formatRelativeTime(reading.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredReadings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No readings found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Info Footer */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-schistoguard-navy mb-1">Monitoring Configuration</h3>
                <p className="text-sm text-gray-600">
                  Data reading interval: <span className="font-medium">Every 1 hour</span>
                </p>
                <p className="text-sm text-gray-600">
                  Location: <span className="font-medium">Mang Jose's Fish Pond, San Miguel, Tacloban City</span>
                </p>
                <p className="text-sm text-gray-600">
                  Area: <span className="font-medium">100 square meters</span>
                </p>
              </div>
              <Button 
                className="bg-schistoguard-teal hover:bg-schistoguard-teal/90"
                onClick={() => onViewSiteDetail('site-1')}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Site Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};