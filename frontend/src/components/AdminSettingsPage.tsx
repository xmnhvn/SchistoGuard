import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiPost, apiGet, apiCall, apiPut } from "../utils/api";
import { Trash2, MoreHorizontal, Search, CheckCircle2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

let _adminSettingsFirstLoadDone = false;

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
  isProtected?: boolean;
  createdAt?: string;
}

interface AuditLog {
  id: number;
  actorUserId?: number | null;
  action: string;
  targetUserId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  timestamp?: string;
}

interface RegisteredSite {
  site_key: string;
  site_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
}

interface AdminSettingsPageProps {
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
}

export function AdminSettingsPage({ user }: AdminSettingsPageProps) {
  const animate = !_adminSettingsFirstLoadDone;
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "bhw",
    organization: "",
    password: "",
    confirmPassword: "",
  });
  // Generalized interval state (ms)
  // Generalized interval state (value + unit)
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState("min");
  const [intervalMsg, setIntervalMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  // Load interval from backend
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/sensors/interval-config");
        let ms = data.intervalMs || 300000;
        if (ms % 3600000 === 0) {
          setIntervalValue(ms / 3600000);
          setIntervalUnit("hr");
        } else if (ms % 60000 === 0) {
          setIntervalValue(ms / 60000);
          setIntervalUnit("min");
        } else {
          setIntervalValue(ms / 1000);
          setIntervalUnit("sec");
        }
      } catch {
        setIntervalValue(5);
        setIntervalUnit("min");
      }
    })();
  }, []);
  // Convert to ms for saving
  const getIntervalMs = () => {
    if (intervalUnit === "sec") return intervalValue * 1000;
    if (intervalUnit === "min") return intervalValue * 60000;
    if (intervalUnit === "hr") return intervalValue * 3600000;
    return intervalValue;
  };
  // Save handler
  const handleSaveInterval = async () => {
    setIntervalMsg("");
    try {
      const ms = getIntervalMs();
      await apiPost("/api/sensors/interval-config", { intervalMs: ms });

      // Trigger success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

    } catch (err: any) {
      setIntervalMsg("Failed to update interval");
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(true);
  const [auditLogsError, setAuditLogsError] = useState("");
  const [registeredSites, setRegisteredSites] = useState<RegisteredSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [sitesError, setSitesError] = useState("");
  const [siteNameDrafts, setSiteNameDrafts] = useState<Record<string, string>>({});
  const [savingSiteKey, setSavingSiteKey] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;
  const isNarrowDesktop = windowWidth < 1600;
  const isWeb = windowWidth >= 1100;

  const pad = isMobile ? 16 : isTablet ? 24 : 32;
  const gap = isMobile ? 16 : isTablet ? 18 : 24;

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setUsersError("");
      const result = await apiGet("/api/auth/users");
      console.log("Fetched users result:", result);
      if (result?.users) {
        console.log("Users array:", result.users);
        setUsers(result.users);
      } else {
        console.log("No users in result");
        setUsersError(result?.message || "No users found");
      }
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      const errorMsg = err?.message || "Failed to fetch users";

      // Provide helpful error message based on error
      if (errorMsg.includes("Not authenticated")) {
        setUsersError("Session expired. Please log in again.");
      } else {
        setUsersError(errorMsg);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAuditLogs(true);
      setAuditLogsError("");
      const result = await apiGet("/api/auth/admin/audit-logs?limit=50");
      if (result?.logs) {
        setAuditLogs(result.logs);
      } else {
        setAuditLogs([]);
      }
    } catch (err: any) {
      setAuditLogsError(err?.message || "Failed to fetch audit logs");
      setAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const fetchRegisteredSites = async () => {
    try {
      setLoadingSites(true);
      setSitesError("");
      const result = await apiGet("/api/sensors/sites");
      const sites = Array.isArray(result) ? result : [];
      setRegisteredSites(sites);
      setSiteNameDrafts((prev) => {
        const next = { ...prev };
        sites.forEach((site: RegisteredSite) => {
          if (!next[site.site_key]) {
            next[site.site_key] = site.site_name || site.address || site.site_key;
          }
        });
        return next;
      });
    } catch (err: any) {
      setSitesError(err?.message || "Failed to fetch registered sites");
      setRegisteredSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSaveSiteName = async (siteKey: string) => {
    const nextName = (siteNameDrafts[siteKey] || "").trim();
    if (!nextName) {
      setError("Site name cannot be empty");
      return;
    }

    try {
      setSavingSiteKey(siteKey);
      setError("");
      setSuccess("");
      const result = await apiPut(`/api/sensors/sites/${encodeURIComponent(siteKey)}`, {
        siteName: nextName,
      });
      setSuccess(result?.success ? "Site name updated successfully" : "Site name updated");
      await fetchRegisteredSites();
    } catch (err: any) {
      setError(err?.message || "Failed to update site name");
    } finally {
      setSavingSiteKey(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
    fetchRegisteredSites();
    if (!_adminSettingsFirstLoadDone) {
      setTimeout(() => { _adminSettingsFirstLoadDone = true; }, 50);
    }
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await apiPost("/api/auth/admin/create-user", formData);
      setSuccess(result?.message || "User account created successfully");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        role: "bhw",
        organization: "",
        password: "",
        confirmPassword: "",
      });
      // Refresh user list
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await apiCall(`/api/auth/users/${userId}`, { method: "DELETE" });
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete user");
    }
  };

  const openUpdatePasswordModal = (target: User) => {
    setPasswordTargetUser(target);
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordModalOpen(true);
  };

  const handleAdminUpdatePassword = async () => {
    setError("");
    setSuccess("");

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!passwordTargetUser) return;

    try {
      setPasswordUpdating(true);
      const result = await apiPost(`/api/auth/admin/users/${passwordTargetUser.id}/password`, {
        newPassword,
        confirmNewPassword,
      });
      setSuccess(result?.message || "Password updated successfully");
      setPasswordModalOpen(false);
      setPasswordTargetUser(null);
      fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    if (role === "admin") return "System Admin";
    return role === "bhw" ? "Barangay Health Worker" : "LGU Officer";
  };

  const POPPINS = "'Poppins', sans-serif";

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organization.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const styleBlock = useMemo(() => (
    <style>{`
      @keyframes contentSlideIn {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes successOverlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes successCardPop {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        60% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes checkCircleFill {
        0% { background: rgba(255,255,255,0.85); box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        50% { background: rgba(255,255,255,0.4); box-shadow: 0 0 20px 8px rgba(34,197,94,0.15); }
        100% { background: #22c55e; box-shadow: 0 0 30px 10px rgba(34,197,94,0.15); }
      }
      @keyframes checkDraw {
        0% { stroke-dashoffset: 30; opacity: 0; }
        40% { opacity: 0; }
        50% { opacity: 1; }
        100% { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes successTextIn {
        0% { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .premium-shadow {
        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.05), 0 2px 10px -2px rgba(0,0,0,0.02);
      }
      .glass-card {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.4);
      }
      .custom-input {
        background: rgba(0,0,0,0.02) !important;
        border: 1px solid rgba(0,0,0,0.03) !important;
        border-radius: 100px !important;
        padding: 12px 16px !important;
        height: 48px !important;
        font-family: ${POPPINS} !important;
        font-size: 14px !important;
        transition: all 0.2s ease !important;
      }
      .custom-select-trigger {
        padding: 12px 16px !important;
        height: 48px !important;
        border-radius: 100px !important;
        font-size: 14px !important;
        border: 1px solid #e2e5ea !important;
      }
      .custom-input:focus {
        background: #fff !important;
        border-color: #357D86 !important;
        box-shadow: 0 0 0 4px rgba(53, 125, 134, 0.1) !important;
      }
      .custom-scrollbar::-webkit-scrollbar {
        width: 5px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.1);
        border-radius: 10px;
      }
      .user-card-item {
        transition: all 0.2s ease !important;
      }
    `}</style>
  ), [POPPINS]);

  return (
    <div style={{
      fontFamily: POPPINS,
      minHeight: "100%",
      overflowY: "auto",
      background: "#f5f7f9",
      paddingTop: pad,
      paddingLeft: pad,
      paddingRight: pad,
      paddingBottom: 0,
      maxHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
    }}>
      {styleBlock}

      {/* ── Premium Success Overlay ── */}
      {(success || showSuccess) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(4px)",
            animation: "successOverlayIn 0.3s ease both",
          }}
          onClick={() => { setSuccess(""); setShowSuccess(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              borderRadius: 24,
              padding: "36px 40px 32px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minWidth: 260,
              maxWidth: "85vw",
              animation: "successCardPop 0.5s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Animated Check Circle */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "checkCircleFill 0.8s 0.15s cubic-bezier(0.22,1,0.36,1) both",
                background: "rgba(255,255,255,0.85)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 30,
                    animation: "checkDraw 0.6s 0.55s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                />
              </svg>
            </div>

            {/* Success Text */}
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#1a2a3a",
                fontFamily: POPPINS,
                textAlign: "center",
                lineHeight: 1.4,
                animation: "successTextIn 0.5s 0.4s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {success || "Settings Updated"}
            </p>
          </div>
        </div>
      )}

      <div className={`mx-auto flex h-full min-h-0 flex-col ${isMobile ? 'w-full' : 'w-full max-w-[1700px]'}`}>
        {/* Synchronized Header Section */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? 20 : (isNarrowDesktop ? 24 : 26),
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              letterSpacing: "-0.01em"
            }}>
              Admin Settings
            </h1>
            <p style={{
              fontSize: isNarrowDesktop ? 11.5 : 12.5,
              color: "#7b8a9a",
              margin: "4px 0 0",
              fontFamily: POPPINS,
              fontWeight: 400
            }}>
              Manage system users and administrative permissions
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: gap }}
        >
          {/* Left Column - Create Account Form */}
          <div style={{
            animation: animate ? "contentSlideIn 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
          }}>
            <div className="glass-card premium-shadow" style={{
              borderRadius: 28,
              padding: 32,
              border: "1px solid rgba(0,0,0,0.03)",
              minHeight: "100%",
              animation: animate ? "cardFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both" : "none"
            }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS, margin: 0 }}>Create User Account</h2>
                <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS, marginTop: 4 }}>Add new users to the system.</p>
              </div>

              <form
                id="create_user_form"
                name="create_user_form"
                action="#"
                onSubmit={handleCreateAccount}
                className="space-y-6"
                autoComplete="on"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="firstName" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      autoComplete="given-name"
                      className="custom-input"
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="lastName" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      autoComplete="family-name"
                      className="custom-input"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    className="custom-input"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                {/* Hidden input to bridge autofill for custom Select role */}
                <input type="text" name="role_autocomplete" autoComplete="organization-title" style={{ display: "none" }} tabIndex={-1} />

                <div className="space-y-3">
                  <Label htmlFor="designation" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Designation</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger id="designation" name="designation" style={{
                      background: "#fff",
                      border: "1px solid #e2e5ea",
                      borderRadius: 14,
                      padding: "12px 16px",
                      height: 48,
                      fontFamily: POPPINS
                    }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bhw" style={{ fontFamily: POPPINS }}>Barangay Health Worker</SelectItem>
                      <SelectItem value="lgu" style={{ fontFamily: POPPINS }}>LGU Officer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="organization" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Organization</Label>
                  <Input
                    id="organization"
                    name="organization"
                    autoComplete="organization"
                    className="custom-input"
                    value={formData.organization}
                    onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="password" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Password</Label>
                    <Input
                      id="password"
                      name="password"
                      autoComplete="new-password"
                      type="password"
                      className="custom-input"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="confirmPassword" style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Confirm</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      type="password"
                      className="custom-input"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c", fontSize: 13, fontFamily: POPPINS }}>{error}</div>}


                <Button type="submit" className="w-full" disabled={loading} style={{
                  background: "#357D86",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "16px",
                  height: "auto",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: POPPINS,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(53, 125, 134, 0.2)",
                  marginTop: 8
                }}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column - User List */}
          <div style={{
            animation: animate ? "contentSlideIn 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
          }}>
            <div className="glass-card premium-shadow" style={{
              borderRadius: 28,
              padding: 32,
              border: "1px solid rgba(0,0,0,0.03)",
              minHeight: "100%"
            }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS, margin: 0 }}>Existing User Accounts</h2>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                  <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS, margin: 0 }}>
                    {users.length} user{users.length !== 1 ? "s" : ""} registered
                  </p>
                  {searchQuery && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#357D86", fontFamily: POPPINS, margin: 0 }}>
                      Found {filteredUsers.length} match{filteredUsers.length !== 1 ? "es" : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Bar Implementation */}
              <div style={{ position: "relative", marginBottom: 20 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8"
                  }}
                />
                <input
                  id="user-list-search"
                  name="userListSearch"
                  type="text"
                  placeholder="Search by name, email or org..."
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 16px 10px 40px",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.05)",
                    background: "rgba(0,0,0,0.02)",
                    fontSize: 13,
                    fontFamily: POPPINS,
                    transition: "all 0.2s ease",
                    outline: "none"
                  }}
                  className="focus:ring-2 focus:ring-[#357D86]/10 focus:border-[#357D86]/40"
                />
              </div>

              {usersError && (
                <div style={{ padding: 16, background: "#fef2f2", borderRadius: 16, border: "1px solid #fee2e2", color: "#b91c1c", fontSize: 13, fontFamily: POPPINS, marginBottom: 16 }}>
                  <strong>Error loading users:</strong> {usersError}
                </div>
              )}

              {loadingUsers && (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div className="animate-pulse" style={{ color: "#94a3b8", fontFamily: POPPINS, fontSize: 14 }}>Loading users cache...</div>
                </div>
              )}

              {!loadingUsers && !usersError && filteredUsers.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", background: "rgba(0,0,0,0.01)", borderRadius: 24, border: "2px dashed rgba(0,0,0,0.05)" }}>
                  <p style={{ color: "#94a3b8", fontFamily: POPPINS, fontSize: 14 }}>
                    {searchQuery ? "No users matching your search." : "No users found in the system."}
                  </p>
                </div>
              )}

              {!loadingUsers && !usersError && filteredUsers.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto px-4 py-2 custom-scrollbar">
                  {filteredUsers.map((item) => (
                    <div
                      key={item.id}
                      className="group user-card-item"
                      style={{
                        padding: "16px 20px",
                        borderRadius: 18,
                        border: "1px solid rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(0,0,0,0.015)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                        {!isMobile && (
                          <div style={{
                            width: 44, height: 44, borderRadius: 14,
                            background: "linear-gradient(135deg, #357D86 0%, #2a636b 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: POPPINS,
                            boxShadow: "0 4px 12px rgba(53, 125, 134, 0.15)",
                            flexShrink: 0
                          }}>
                            {item.firstName[0]}{item.lastName[0]}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS }}>
                            {item.firstName} {item.lastName}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: "#64748b", fontFamily: POPPINS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {getRoleDisplay(item.role)} • {item.organization}
                          </span>
                          {item.isProtected && (
                            <span style={{
                              marginTop: 4,
                              display: "inline-flex",
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: "#92400e",
                              background: "#fef3c7",
                              border: "1px solid #fde68a",
                              borderRadius: 999,
                              padding: "2px 8px",
                              width: "fit-content"
                            }}>
                              Protected
                            </span>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="transition-all duration-200"
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              background: "rgba(0, 0, 0, 0.03)",
                              border: "none",
                              color: "#64748b",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0, 0, 0, 0.06)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)"; }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" style={{ fontFamily: POPPINS, borderRadius: 12 }}>
                          <DropdownMenuItem
                            onClick={() => openUpdatePasswordModal(item)}
                            className="cursor-pointer"
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>Update Password</span>
                          </DropdownMenuItem>
                          {!item.isProtected && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(item.id)}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete User</span>
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
          <DialogContent style={{ fontFamily: POPPINS }}>
            <DialogHeader>
              <DialogTitle>Update Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p style={{ fontSize: 13, color: "#64748b" }}>
                Set a new password for {passwordTargetUser?.firstName} {passwordTargetUser?.lastName}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="newPasswordAdmin">New Password</Label>
                <Input
                  id="newPasswordAdmin"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPasswordAdmin">Confirm New Password</Label>
                <Input
                  id="confirmNewPasswordAdmin"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPasswordModalOpen(false)} disabled={passwordUpdating} style={{ borderRadius: 100, fontFamily: POPPINS }}>
                  Cancel
                </Button>
                <Button onClick={handleAdminUpdatePassword} disabled={passwordUpdating} style={{ borderRadius: 100, fontFamily: POPPINS, background: "#357D86" }}>
                  {passwordUpdating ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="glass-card premium-shadow w-full" style={{
          borderRadius: 28,
          padding: 32,
          marginTop: gap,
          border: "1px solid rgba(0,0,0,0.03)",
          animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>Registered Sites</h2>
          <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>
            Rename registered sites here. This updates the persistent site registry label used by the system.
          </p>

          {sitesError && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c", fontSize: 13 }}>
              {sitesError}
            </div>
          )}

          {loadingSites ? (
            <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>Loading registered sites...</div>
          ) : registeredSites.length === 0 ? (
            <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>No registered sites yet.</div>
          ) : (
            <div className="custom-scrollbar" style={{ marginTop: 16, maxHeight: 360, overflowY: "auto", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 18 }}>
              {registeredSites.map((site, idx) => {
                const currentLabel = site.site_name || site.address || site.site_key;
                const draftValue = siteNameDrafts[site.site_key] ?? currentLabel;
                return (
                  <div
                    key={site.site_key}
                    style={{
                      padding: 16,
                      borderBottom: idx === registeredSites.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
                      background: idx % 2 === 0 ? "rgba(0,0,0,0.01)" : "#fff",
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>{currentLabel}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, wordBreak: "break-word" }}>
                        Key: {site.site_key}
                      </div>
                    </div>

                    <div>
                      <Label style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Site Name</Label>
                      <Input
                        value={draftValue}
                        onChange={(e) => setSiteNameDrafts((prev) => ({ ...prev, [site.site_key]: e.target.value }))}
                        className="custom-input"
                        style={{ marginTop: 6 }}
                        placeholder="Enter site name"
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                      <Button
                        type="button"
                        onClick={() => handleSaveSiteName(site.site_key)}
                        disabled={savingSiteKey === site.site_key}
                        style={{ background: "#357D86", color: "#fff", borderRadius: 100, padding: "10px 18px", fontWeight: 600, border: "none", fontFamily: POPPINS, fontSize: 13 }}
                      >
                        {savingSiteKey === site.site_key ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card premium-shadow w-full" style={{
          borderRadius: 28,
          padding: 32,
          marginTop: gap,
          border: "1px solid rgba(0,0,0,0.03)",
          animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>Security Audit Logs</h2>
          <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>
            Recent sensitive actions for accountability and incident tracing.
          </p>

          {auditLogsError && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c", fontSize: 13 }}>
              {auditLogsError}
            </div>
          )}

          {loadingAuditLogs ? (
            <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>No audit events yet.</div>
          ) : (
            <div className="custom-scrollbar" style={{ marginTop: 16, maxHeight: 280, overflowY: "auto", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14 }}>
              {auditLogs.map((log, idx) => (
                <div
                  key={log.id}
                  style={{
                    padding: "12px 14px",
                    borderBottom: idx === auditLogs.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
                    background: idx % 2 === 0 ? "rgba(0,0,0,0.01)" : "#fff"
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>{log.action}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                    actor: {log.actorUserId || "n/a"} • target: {log.targetUserId || "n/a"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "no timestamp"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={fetchAuditLogs} style={{ borderRadius: 100, fontFamily: POPPINS }}>Refresh Logs</Button>
          </div>
        </div>

        {/* Generalized Interval Settings Section - Moved to bottom */}
        <div className="glass-card premium-shadow w-full" style={{
          borderRadius: 28,
          padding: 32,
          marginTop: gap,
          position: "relative",
          border: "1px solid rgba(0,0,0,0.03)",
          animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>System Settings</h2>
          <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>Customize the broadcast interval for sensor logging and SMS reporting. The site name now follows the registered site name, which is managed in Registered Sites.</p>

          <div style={{ marginTop: 14, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: "#357D86", width: 115 }}>General Interval:</label>
            <input
              type="number"
              min={1}
              step={1}
              value={intervalValue}
              onChange={e => setIntervalValue(Number(e.target.value))}
              style={{ padding: "0 12px", borderRadius: 100, border: "1px solid #ddd", width: 70, height: 38, fontSize: 13, color: "#1e293b", fontFamily: POPPINS }}
            />
            <select
              value={intervalUnit}
              onChange={e => setIntervalUnit(e.target.value)}
              style={{ padding: "0 8px", borderRadius: 100, border: "1px solid #ddd", width: 110, height: 38, fontSize: 13, color: "#1e293b", fontFamily: POPPINS, cursor: "pointer" }}
            >
              <option value="sec">seconds</option>
              <option value="min">minutes</option>
              <option value="hr">hours</option>
            </select>
          </div>
          <button
            onClick={handleSaveInterval}
            style={{ background: "#357D86", color: "#fff", borderRadius: 100, padding: "10px 24px", fontWeight: 600, border: "none", fontFamily: POPPINS, fontSize: 15 }}
          >
            Save Settings
          </button>
          {intervalMsg && !intervalMsg.includes("success") && <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 500 }}>{intervalMsg}</div>}
        </div>

        {/* Balanced Bottom Spacer matching other pages */}
        <div style={{ height: gap, width: '100%', flexShrink: 0 }} />
      </div>
    </div>
  );
}
