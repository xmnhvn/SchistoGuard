import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Calendar, Mail, Phone, MapPin, Edit, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { useResponsiveScale } from '../utils/useResponsiveScale';

let _userMgmtFirstLoadDone = false;

const POPPINS = "'Poppins', sans-serif";

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
  const animate = !_userMgmtFirstLoadDone;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { isMobile, pad } = useResponsiveScale();

  React.useEffect(() => {
    if (!_userMgmtFirstLoadDone) {
      setTimeout(() => { _userMgmtFirstLoadDone = true; }, 50);
    }
  }, []);

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

  const roleLabels: Record<string, string> = {
    admin: 'System Admin',
    health_worker: 'Health Worker',
    resident: 'Community Resident',
    lgu_official: 'LGU Official'
  };

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

  // Use the first user as the "profile" user for display
  const profileUser = users[0];

  const getUserInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statCards = [
    { label: "Total Users", value: stats.total, color: "#357D86" },
    { label: "Active", value: stats.active, color: "#22c55e" },
    { label: "New This Week", value: stats.recentJoins, color: "#3b82f6" },
    { label: "Health Workers", value: stats.byRole.health_worker, color: "#a855f7" },
  ];

  return (
    <div style={{
      fontFamily: POPPINS,
      height: "100%",
      overflow: "auto",
      background: "#f5f7f9",
    }}>
      <style>{`
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes avatarPop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: `0 ${pad}px ${pad}px`,
        animation: animate ? 'pageSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both' : 'none',
      }}>

        {/* ── Banner Header ── */}
        <div style={{
          position: "relative",
          width: `calc(100% + ${pad * 2}px)`,
          marginLeft: -pad,
          height: isMobile ? 140 : 180,
          background: "linear-gradient(135deg, #357D86 0%, #4aa3ad 40%, #a8dce3 100%)",
          borderRadius: isMobile ? 0 : "0 0 24px 24px",
          marginBottom: isMobile ? 60 : 70,
        }}>
          {/* Edit Profile button on banner */}
          <button
            onClick={() => setIsEditOpen(true)}
            style={{
              position: "absolute",
              top: isMobile ? 12 : 18,
              right: isMobile ? 12 : 24,
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 12,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: POPPINS,
              transition: "all 0.2s",
            }}
          >
            <Edit size={14} />
            Edit Profile
          </button>

          {/* Avatar — overlapping the banner bottom */}
          <div style={{
            position: "absolute",
            bottom: isMobile ? -48 : -56,
            left: isMobile ? pad + 4 : pad + 8,
          }}>
            <div style={{
              width: isMobile ? 96 : 112,
              height: isMobile ? 96 : 112,
              borderRadius: "50%",
              background: "#fff",
              padding: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              animation: animate ? "avatarPop 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #357D86, #4aa3ad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? 28 : 34,
                fontWeight: 700,
                color: "#fff",
                fontFamily: POPPINS,
                letterSpacing: 1,
              }}>
                {getUserInitials(profileUser.name)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Name & Info ── */}
        <div style={{
          padding: `0 ${isMobile ? 4 : 8}px`,
          marginBottom: 28,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
            flexWrap: "wrap",
          }}>
            <h1 style={{
              fontSize: isMobile ? 22 : 28,
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              lineHeight: 1.3,
            }}>
              {profileUser.name}
            </h1>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: profileUser.status === 'active' ? "#e6f7ef" : "#fef3cd",
              color: profileUser.status === 'active' ? "#15803d" : "#92400e",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              fontFamily: POPPINS,
              textTransform: "capitalize",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: profileUser.status === 'active' ? "#22c55e" : "#f59e0b",
                display: "inline-block",
              }} />
              {profileUser.status}
            </span>
          </div>

          <p style={{
            margin: "2px 0 8px",
            fontSize: isMobile ? 13 : 14,
            color: "#7b8a9a",
            fontFamily: POPPINS,
            fontWeight: 500,
          }}>
            {roleLabels[profileUser.role]}
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#64748b",
            fontSize: 13,
            fontFamily: POPPINS,
          }}>
            <Mail size={14} color="#9ca3af" />
            {profileUser.email}
          </div>

          {profileUser.phone && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#64748b",
              fontSize: 13,
              fontFamily: POPPINS,
              marginTop: 4,
            }}>
              <Phone size={14} color="#9ca3af" />
              {profileUser.phone}
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 14,
          marginBottom: 28,
          padding: `0 ${isMobile ? 4 : 8}px`,
        }}>
          {statCards.map((card, i) => (
            <div key={card.label} style={{
              display: "flex",
              flexDirection: "column",
              padding: isMobile ? "14px 12px" : "16px 18px",
              borderBottom: `2px solid ${card.color}20`,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9ca3af",
                fontFamily: POPPINS,
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {card.label}
              </span>
              <span style={{
                fontSize: isMobile ? 22 : 26,
                fontWeight: 700,
                color: "#1a2a3a",
                fontFamily: POPPINS,
                lineHeight: 1.2,
              }}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: 1,
          background: "#e8ecf0",
          margin: `0 ${isMobile ? 4 : 8}px 28px`,
        }} />

        {/* ── Profile Details Section ── */}
        <div style={{ padding: `0 ${isMobile ? 4 : 8}px` }}>
          <div style={{
            display: isMobile ? "block" : "flex",
            gap: 48,
            marginBottom: 24,
          }}>
            {/* Left label */}
            <div style={{
              width: isMobile ? "100%" : 180,
              flexShrink: 0,
              marginBottom: isMobile ? 12 : 0,
            }}>
              <h3 style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#1a2a3a",
                margin: 0,
                fontFamily: POPPINS,
              }}>
                Profile Details
              </h3>
              <p style={{
                fontSize: 12,
                color: "#9ca3af",
                margin: "4px 0 0",
                fontFamily: POPPINS,
                lineHeight: 1.4,
              }}>
                Personal information and account details
              </p>
            </div>

            {/* Right fields */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Name */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#64748b",
                  fontFamily: POPPINS, display: "block", marginBottom: 6,
                }}>Full Name</label>
                <div style={{
                  padding: "10px 14px",
                  background: "#f8f9fb",
                  borderRadius: 10,
                  border: "1px solid #e8ecf0",
                  fontSize: 14,
                  color: "#1a2a3a",
                  fontFamily: POPPINS,
                  fontWeight: 500,
                }}>
                  {profileUser.name}
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#64748b",
                  fontFamily: POPPINS, display: "block", marginBottom: 6,
                }}>Email Address</label>
                <div style={{
                  padding: "10px 14px",
                  background: "#f8f9fb",
                  borderRadius: 10,
                  border: "1px solid #e8ecf0",
                  fontSize: 14,
                  color: "#1a2a3a",
                  fontFamily: POPPINS,
                  fontWeight: 500,
                }}>
                  {profileUser.email}
                </div>
              </div>

              {/* Phone */}
              {profileUser.phone && (
                <div>
                  <label style={{
                    fontSize: 12, fontWeight: 600, color: "#64748b",
                    fontFamily: POPPINS, display: "block", marginBottom: 6,
                  }}>Phone Number</label>
                  <div style={{
                    padding: "10px 14px",
                    background: "#f8f9fb",
                    borderRadius: 10,
                    border: "1px solid #e8ecf0",
                    fontSize: 14,
                    color: "#1a2a3a",
                    fontFamily: POPPINS,
                    fontWeight: 500,
                  }}>
                    {profileUser.phone}
                  </div>
                </div>
              )}

              {/* Role */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#64748b",
                  fontFamily: POPPINS, display: "block", marginBottom: 6,
                }}>Designation</label>
                <div style={{
                  padding: "10px 14px",
                  background: "#f8f9fb",
                  borderRadius: 10,
                  border: "1px solid #e8ecf0",
                  fontSize: 14,
                  color: "#1a2a3a",
                  fontFamily: POPPINS,
                  fontWeight: 500,
                }}>
                  {roleLabels[profileUser.role]}
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{
                  fontSize: 12, fontWeight: 600, color: "#64748b",
                  fontFamily: POPPINS, display: "block", marginBottom: 6,
                }}>Location</label>
                <div style={{
                  padding: "10px 14px",
                  background: "#f8f9fb",
                  borderRadius: 10,
                  border: "1px solid #e8ecf0",
                  fontSize: 14,
                  color: "#1a2a3a",
                  fontFamily: POPPINS,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <MapPin size={14} color="#9ca3af" />
                  {profileUser.barangay ? `Brgy. ${profileUser.barangay}, ` : ''}{profileUser.municipality}
                </div>
              </div>

              {/* Join Date & Last Login in 2 columns */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 18,
              }}>
                <div>
                  <label style={{
                    fontSize: 12, fontWeight: 600, color: "#64748b",
                    fontFamily: POPPINS, display: "block", marginBottom: 6,
                  }}>Member Since</label>
                  <div style={{
                    padding: "10px 14px",
                    background: "#f8f9fb",
                    borderRadius: 10,
                    border: "1px solid #e8ecf0",
                    fontSize: 14,
                    color: "#1a2a3a",
                    fontFamily: POPPINS,
                    fontWeight: 500,
                  }}>
                    {formatDate(profileUser.joinDate)}
                  </div>
                </div>

                <div>
                  <label style={{
                    fontSize: 12, fontWeight: 600, color: "#64748b",
                    fontFamily: POPPINS, display: "block", marginBottom: 6,
                  }}>Last Login</label>
                  <div style={{
                    padding: "10px 14px",
                    background: "#f8f9fb",
                    borderRadius: 10,
                    border: "1px solid #e8ecf0",
                    fontSize: 14,
                    color: "#1a2a3a",
                    fontFamily: POPPINS,
                    fontWeight: 500,
                  }}>
                    {formatLastLogin(profileUser.lastLogin)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 40 }} />
      </div>

      {/* ── Edit Profile Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          hideCloseButton={true}
          style={{
            width: isMobile ? "90vw" : 480,
            maxWidth: isMobile ? "90vw" : 480,
            borderRadius: 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
          }}
          className="p-0"
        >
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Edit Profile
            </h2>
            <DialogClose asChild>
              <button
                style={{
                  width: 32, height: 32,
                  minWidth: 32, minHeight: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  padding: 0,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 6, display: "block" }}>Name</Label>
              <Input
                defaultValue={profileUser.name}
                style={{ borderRadius: 12, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 6, display: "block" }}>Email</Label>
              <Input
                defaultValue={profileUser.email}
                style={{ borderRadius: 12, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 6, display: "block" }}>Phone</Label>
              <Input
                defaultValue={profileUser.phone || ''}
                style={{ borderRadius: 12, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 6, display: "block" }}>Designation</Label>
              <Select defaultValue={profileUser.role}>
                <SelectTrigger style={{ borderRadius: 12, border: "1px solid #e2e5ea", fontFamily: POPPINS }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ fontFamily: POPPINS }}>
                  <SelectItem value="resident">Community Resident</SelectItem>
                  <SelectItem value="health_worker">Health Worker</SelectItem>
                  <SelectItem value="lgu_official">LGU Official</SelectItem>
                  <SelectItem value="admin">System Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => setIsEditOpen(false)}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: "#357D86",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: POPPINS,
                cursor: "pointer",
                marginTop: 4,
                transition: "opacity 0.2s",
              }}
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
