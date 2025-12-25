import React, { useState } from 'react';
import { Users, UserPlus, Search, Filter, MoreVertical, Mail, Phone, Shield, MapPin, Calendar, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'health_worker' | 'resident' | 'lgu_official';
  status: 'active' | 'inactive' | 'pending';
  barangay?: string;
  municipality: string;
  joinDate: string;
  lastLogin?: string;
  avatar?: string;
}

interface UserStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
  recentJoins: number;
}

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Sample users data
  const users: User[] = [
    {
      id: 'user-001',
      name: 'Dr. Maria Santos',
      email: 'maria.santos@health.tacloban.gov.ph',
      phone: '+63 917 123 4567',
      role: 'health_worker',
      status: 'active',
      barangay: 'San Miguel',
      municipality: 'Tacloban City',
      joinDate: '2024-11-15',
      lastLogin: '2025-01-20T08:30:00'
    },
    {
      id: 'user-002',
      name: 'Engr. Juan dela Cruz',
      email: 'juan.delacruz@tacloban.gov.ph',
      role: 'lgu_official',
      status: 'active',
      municipality: 'Tacloban City',
      joinDate: '2024-10-22',
      lastLogin: '2025-01-19T16:45:00'
    },
    {
      id: 'user-003',
      name: 'Anna Reyes',
      email: 'anna.reyes@gmail.com',
      phone: '+63 908 987 6543',
      role: 'resident',
      status: 'active',
      barangay: 'Centro',
      municipality: 'Tacloban City',
      joinDate: '2025-01-10',
      lastLogin: '2025-01-20T12:15:00'
    },
    {
      id: 'user-004',
      name: 'Admin System',
      email: 'admin@schistoguard.org',
      role: 'admin',
      status: 'active',
      municipality: 'System',
      joinDate: '2024-09-01',
      lastLogin: '2025-01-20T14:20:00'
    },
    {
      id: 'user-005',
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@gmail.com',
      role: 'resident',
      status: 'pending',
      barangay: 'Marasbaras',
      municipality: 'Tacloban City',
      joinDate: '2025-01-18'
    }
  ];

  const roleLabels = {
    admin: 'System Admin',
    health_worker: 'Health Worker',
    resident: 'Community Resident',
    lgu_official: 'LGU Official'
  };

  const roleColors = {
    admin: 'destructive',
    health_worker: 'default',
    resident: 'secondary',
    lgu_official: 'outline'
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.barangay?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const stats: UserStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    byRole: {
      admin: users.filter(u => u.role === 'admin').length,
      health_worker: users.filter(u => u.role === 'health_worker').length,
      resident: users.filter(u => u.role === 'resident').length,
      lgu_official: users.filter(u => u.role === 'lgu_official').length,
    },
    recentJoins: users.filter(u => {
      const joinDate = new Date(u.joinDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return joinDate > weekAgo;
    }).length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-schistoguard-light-bg">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">User Management</h1>
            <p className="text-gray-600">Manage system users, roles, and permissions</p>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account for the SchistoGuard system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" type="email" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Community Resident</SelectItem>
                      <SelectItem value="health_worker">Health Worker</SelectItem>
                      <SelectItem value="lgu_official">LGU Official</SelectItem>
                      <SelectItem value="admin">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-schistoguard-navy">{stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-schistoguard-teal" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                    </div>
                    <Shield className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">New This Week</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.recentJoins}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Health Workers</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.byRole.health_worker}</p>
                    </div>
                    <UserPlus className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{roleLabels[role as keyof typeof roleLabels]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{count} users</span>
                        <Badge variant={roleColors[role as keyof typeof roleColors] as any}>
                          {((count / stats.total) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users by name, email, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">System Admin</SelectItem>
                      <SelectItem value="health_worker">Health Worker</SelectItem>
                      <SelectItem value="lgu_official">LGU Official</SelectItem>
                      <SelectItem value="resident">Resident</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Users List */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">User</th>
                        <th className="text-left p-4 font-medium text-gray-600">Role</th>
                        <th className="text-left p-4 font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 font-medium text-gray-600">Location</th>
                        <th className="text-left p-4 font-medium text-gray-600">Last Login</th>
                        <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </div>
                                {user.phone && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {user.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={roleColors[user.role] as any}>
                              {roleLabels[user.role]}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(user.status)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <div>
                                {user.barangay && <div>Brgy. {user.barangay}</div>}
                                <div>{user.municipality}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {formatLastLogin(user.lastLogin)}
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(roleLabels).map(([roleKey, roleLabel]) => (
                <Card key={roleKey}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{roleLabel}</span>
                      <Badge variant={roleColors[roleKey as keyof typeof roleColors] as any}>
                        {stats.byRole[roleKey]} users
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {roleKey === 'admin' && (
                        <div className="space-y-1">
                          <div>• Full system access</div>
                          <div>• User management</div>
                          <div>• System configuration</div>
                          <div>• All reports and analytics</div>
                        </div>
                      )}
                      {roleKey === 'health_worker' && (
                        <div className="space-y-1">
                          <div>• Site monitoring access</div>
                          <div>• Alert management</div>
                          <div>• Health reports</div>
                          <div>• Community notifications</div>
                        </div>
                      )}
                      {roleKey === 'lgu_official' && (
                        <div className="space-y-1">
                          <div>• Regional oversight</div>
                          <div>• Reports and analytics</div>
                          <div>• Policy decisions</div>
                          <div>• Resource allocation</div>
                        </div>
                      )}
                      {roleKey === 'resident' && (
                        <div className="space-y-1">
                          <div>• View water quality data</div>
                          <div>• Access site information</div>
                          <div>• Basic monitoring features</div>
                          <div>• Community health info</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};