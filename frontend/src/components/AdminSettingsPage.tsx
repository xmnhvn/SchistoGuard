import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiPost, apiGet, apiCall } from "../utils/api";
import { Trash2 } from "lucide-react";

let _adminSettingsFirstLoadDone = false;

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
  createdAt?: string;
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
      setIntervalMsg("Interval updated successfully!");
      // Notify other components to reload interval config
      window.dispatchEvent(new CustomEvent("sg_interval_updated"));
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
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;

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

  useEffect(() => {
    fetchUsers();
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

  const getRoleDisplay = (role: string) => {
    return role === "bhw" ? "Barangay Health Worker" : "LGU Officer";
  };

  const POPPINS = "'Poppins', sans-serif";

  return (
    <div className="min-h-screen bg-[#f8fafc]" style={{ padding: 32 }}>
      {/* Generalized Interval Settings Section */}
      <div className="glass-card premium-shadow" style={{ borderRadius: 28, padding: 32, marginBottom: 32, border: "1px solid rgba(0,0,0,0.03)", maxWidth: 600 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: "'Poppins', sans-serif", margin: 0 }}>System Interval Setting</h2>
        <p style={{ fontSize: 13, color: "#64748b", fontFamily: "'Poppins', sans-serif", marginTop: 4 }}>Customize the interval for sensor logging, reporting, alert stream, and SMS sending. All related processes will follow this interval.</p>
        <div style={{ marginTop: 18, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: "#357D86" }}>General Interval:</label>
          <input
            type="number"
            min={1}
            step={1}
            value={intervalValue}
            onChange={e => setIntervalValue(Number(e.target.value))}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 80 }}
          />
          <select
            value={intervalUnit}
            onChange={e => setIntervalUnit(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 90 }}
          >
            <option value="sec">seconds</option>
            <option value="min">minutes</option>
            <option value="hr">hours</option>
          </select>
        </div>
        <button
          onClick={handleSaveInterval}
          style={{ background: "#357D86", color: "#fff", borderRadius: 14, padding: "10px 24px", fontWeight: 600, border: "none", fontFamily: "'Poppins', sans-serif", fontSize: 15 }}
        >
          Save Interval
        </button>
        {intervalMsg && <div style={{ marginTop: 12, color: intervalMsg.includes("success") ? "#15803d" : "#b91c1c", fontWeight: 500 }}>{intervalMsg}</div>}
      </div>
      <style>{`
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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
          border-radius: 14px !important;
          padding: 12px 16px !important;
          font-family: ${POPPINS} !important;
          font-size: 14px !important;
          transition: all 0.2s ease !important;
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
      `}</style>

      <div className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col" style={{ animation: animate ? 'contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' : 'none' }}>
        {/* Standardized Header Section */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          marginBottom: 32,
        }}>
          <h1 style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#1a2a3a",
            margin: 0,
            fontFamily: POPPINS,
            letterSpacing: "-0.01em"
          }}>
            Admin Settings
          </h1>
          <p style={{
            fontSize: 12.5,
            color: "#7b8a9a",
            margin: "4px 0 0",
            fontFamily: POPPINS,
            fontWeight: 400
          }}>
            Manage system users and administrative permissions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column - Create Account Form */}
          <div style={{
            animation: animate ? "contentSlideIn 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
          }}>
            <div className="glass-card premium-shadow" style={{
              borderRadius: 28,
              padding: 32,
              border: "1px solid rgba(0,0,0,0.03)",
              minHeight: "100%"
            }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>Create User Account</h2>
                <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>Add new users to the system.</p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>First Name</Label>
                    <Input
                      id="firstName"
                      className="custom-input"
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Last Name</Label>
                    <Input
                      id="lastName"
                      className="custom-input"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    className="custom-input"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Designation</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger id="designation" style={{
                      background: "rgba(0,0,0,0.02)",
                      border: "1px solid rgba(0,0,0,0.03)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      height: "auto",
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

                <div className="space-y-2">
                  <Label htmlFor="organization" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Organization</Label>
                  <Input
                    id="organization"
                    className="custom-input"
                    value={formData.organization}
                    onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Password</Label>
                    <Input
                      id="password"
                      type="password"
                      className="custom-input"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: POPPINS }}>Confirm</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="custom-input"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {error && <div style={{ padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c", fontSize: 13, fontFamily: POPPINS }}>{error}</div>}
                {success && <div style={{ padding: 12, borderRadius: 12, background: "#f0fdf4", border: "1px solid #dcfce7", color: "#15803d", fontSize: 13, fontFamily: POPPINS }}>{success}</div>}

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
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>Existing User Accounts</h2>
                <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>
                  {users.length} user{users.length !== 1 ? "s" : ""} registered
                </p>
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

              {!loadingUsers && !usersError && users.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", background: "rgba(0,0,0,0.01)", borderRadius: 24, border: "2px dashed rgba(0,0,0,0.05)" }}>
                  <p style={{ color: "#94a3b8", fontFamily: POPPINS, fontSize: 14 }}>No users found in the system.</p>
                </div>
              )}

              {!loadingUsers && !usersError && users.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map((item) => (
                    <div
                      key={item.id}
                      className="transition-all duration-300 hover:shadow-md"
                      style={{
                        padding: "16px 20px",
                        borderRadius: 18,
                        border: "1px solid rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(0,0,0,0.015)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUser(item.id)}
                        className="transition-all duration-200"
                        style={{
                          padding: 8,
                          borderRadius: 10,
                          background: "rgba(239, 68, 68, 0.05)",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
