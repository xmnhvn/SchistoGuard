import React, { useState } from 'react';
import SensorCard from './SensorCard';
import { Clock, Search, Filter, Activity, Droplets, Thermometer, Eye, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';



import { useEffect } from 'react';

// Fetch real site readings from backend
const fetchReadings = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/sensors/latest');
    if (!res.ok) return [];
    const data = await res.json();
    // Wrap in array for table, add id if missing
    if (data) {
      return [{
        ...data,
        id: data.timestamp || Date.now(),
        riskLevel: data.turbidity > 15 ? 'critical' : data.turbidity > 5 ? 'warning' : 'safe',
        ph: data.ph ?? 7.2 // fallback if no pH
      }];
    }
    return [];
  } catch {
    return [];
  }
};

interface SitesDirectoryProps {
  onViewSiteDetail: (siteId: string) => void;
}


export const SitesDirectory: React.FC<SitesDirectoryProps> = ({ onViewSiteDetail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<string>('24h');
  const [readings, setReadings] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchReadings();
      setReadings(data);
    };
    getData();
    const interval = setInterval(getData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Filter readings based on search and filters
  const filteredReadings = readings.filter(reading => {
    const timestamp = new Date(reading.timestamp);
    const searchMatch = timestamp.toLocaleString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.turbidity?.toString().includes(searchQuery) ||
      reading.temperature?.toString().includes(searchQuery);

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

  // Calculate statistics for all parameters (turbidity, temperature, pH)
  function getRiskLevel(param: string, value: number) {
    if (param === 'turbidity') {
      if (value > 15) return 'critical';
      if (value > 5) return 'warning';
      return 'safe';
    }
    if (param === 'temperature') {
      if (value < 22 || value > 30) return 'critical';
      if ((value >= 22 && value < 24) || (value > 28 && value <= 30)) return 'warning';
      return 'safe';
    }
    if (param === 'ph') {
      if (value < 6.5 || value > 8.0) return 'critical';
      if ((value >= 6.5 && value < 7.0) || (value > 7.5 && value <= 8.0)) return 'warning';
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

  return (
    <div className="bg-schistoguard-light-bg">
      <div className="max-w-7xl mx-auto p-6">

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          {/* Labels and info (col 1) */}
          <div className="col-span-1">
            <h1 className="text-3xl font-bold text-schistoguard-navy mb-1">Hourly Data Readings</h1>
            <p className="text-gray-600 leading-tight mb-1">Mang Jose's Fish Pond - 100 square meters</p>
            <p className="text-sm text-gray-500 leading-tight mb-1">Water quality data collected every hour</p>
          </div>
          {/* Search and filters (cols 2-3) */}
          <div className="col-span-1 lg:col-span-2 flex flex-col lg:flex-row gap-4 lg:justify-end">
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by time, turbidity, or temperature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border border-gray-300 bg-gray-50 focus:bg-white focus:border-schistoguard-teal transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
                <SelectTrigger className="w-40 border border-gray-300 bg-gray-50 focus:bg-white focus:border-schistoguard-teal transition-colors">
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
                <SelectTrigger className="w-40 border border-gray-300 bg-gray-50 focus:bg-white focus:border-schistoguard-teal transition-colors">
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
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 -mt-6">
          <Card>
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-schistoguard-navy">{filteredReadings.length * 3}</div>
              <p className="text-xs text-muted-foreground">All parameters in All range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-sm font-medium">Safe Readings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-green-600">{safeCount}</div>
              <p className="text-xs text-muted-foreground">All parameters in safe range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-sm font-medium">Warning Readings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <p className="text-xs text-muted-foreground">All parameters in warning range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-sm font-medium">Critical Readings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">All parameters in critical range</p>
            </CardContent>
          </Card>
        </div>

        {/* Readings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-[-20]">
              <CardTitle>Time-Series Data</CardTitle>

            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto h-80 overflow-y-auto scrollbar-hide">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Turbidity (NTU)</TableHead>
                    <TableHead className="text-center">Temperature (°C)</TableHead>
                    <TableHead className="text-center">pH Level</TableHead>
                    <TableHead className="text-center">Risk Level</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReadings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No readings found</h3>
                          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReadings.map((reading) => {
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
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};