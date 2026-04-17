import { useState, useEffect, useMemo } from "react";
import heic2any from "heic2any";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiPost, apiGet, apiCall, apiPut } from "../utils/api";
import { Trash2, MoreHorizontal, Search, CheckCircle2, KeyRound, Play, Square, Radio, Camera, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useResponsiveScale } from "../utils/useResponsiveScale";

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

interface RegisteredSite {
  site_key: string;
  site_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  is_active?: number | boolean | null;
  site_photo?: string | null;
}

interface AdminSettingsPageProps {
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
}

function isPlaceholderSite(site: RegisteredSite): boolean {
  const key = (site.site_key || '').toString().trim().toLowerCase();
  const name = (site.site_name || '').toString().trim().toLowerCase();
  return key.includes('esp32-local') || name.includes('esp32.local');
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [smsSummaryTimes, setSmsSummaryTimes] = useState(["08:00", "17:00"]);
  const [smsScheduleLoading, setSmsScheduleLoading] = useState(true);
  const [smsScheduleSaving, setSmsScheduleSaving] = useState(false);
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
  useEffect(() => {
    (async () => {
      try {
        setSmsScheduleLoading(true);
        const data = await apiGet("/api/sensors/sms-summary-config");
        if (Array.isArray(data?.times) && data.times.length === 2) {
          setSmsSummaryTimes([
            data.times[0] || "08:00",
            data.times[1] || "17:00",
          ]);
        }
      } catch {
        setSmsSummaryTimes(["08:00", "17:00"]);
      } finally {
        setSmsScheduleLoading(false);
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
  
  const handleSaveInterval = async () => {
    try {
      const ms = getIntervalMs();
      await apiPost("/api/sensors/interval-config", { intervalMs: ms });
      toast.success("Interval updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update interval");
    }
  };
  const handleSaveSmsSummarySchedule = async () => {
    try {
      setSmsScheduleSaving(true);
      const normalizedTimes = smsSummaryTimes
        .map((time) => (time || "").trim())
        .filter(Boolean)
        .slice(0, 2);

      if (normalizedTimes.length !== 2) {
        toast.error("Please set two valid SMS times.");
        return;
      }

      if (normalizedTimes[0] === normalizedTimes[1]) {
        toast.error("First and second SMS time must be different.");
        return;
      }

      await apiPost("/api/sensors/sms-summary-config", { times: normalizedTimes });
      setSmsSummaryTimes(normalizedTimes);
      toast.success("SMS summary schedule saved successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update SMS summary schedule");
    } finally {
      setSmsScheduleSaving(false);
    }
  };
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [registeredSites, setRegisteredSites] = useState<RegisteredSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [sitesError, setSitesError] = useState("");
  const [siteNameDrafts, setSiteNameDrafts] = useState<Record<string, string>>({});
  const [sitePhotoDrafts, setSitePhotoDrafts] = useState<Record<string, string | null>>({});
  const [sitePhotoLoading, setSitePhotoLoading] = useState<Record<string, boolean>>({});
  const [savingSiteKey, setSavingSiteKey] = useState<string | null>(null);
  const [startingSiteKey, setStartingSiteKey] = useState<string | null>(null);
  const [stoppingSiteKey, setStoppingSiteKey] = useState<string | null>(null);
  const [deletingSiteKey, setDeletingSiteKey] = useState<string | null>(null);
  const [sitePendingDelete, setSitePendingDelete] = useState<RegisteredSite | null>(null);
  const [newSiteForm, setNewSiteForm] = useState({
    siteName: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [addingSite, setAddingSite] = useState(false);
  const {
    isMobile,
    isTablet,
    isCompact,
    isNarrowDesktop,
    pad,
  } = useResponsiveScale();
  const gap = isMobile ? 16 : isTablet ? 18 : 24;

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setUsersError("");
      const result = await apiGet("/api/auth/users");
      if (result?.users) {
        setUsers(result.users);
      } else {
        setUsersError(result?.message || "No users found");
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to fetch users";
      if (errorMsg.includes("Not authenticated")) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRegisteredSites = async () => {
    try {
      setLoadingSites(true);
      const result = await apiGet("/api/sensors/sites");
      const sites = (Array.isArray(result) ? result : []).filter((site: RegisteredSite) => !isPlaceholderSite(site));
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
      setSitePhotoDrafts((prev) => {
        const next = { ...prev };
        sites.forEach((site: RegisteredSite) => {
          if (next[site.site_key] === undefined) {
            next[site.site_key] = site.site_photo || null;
          }
        });
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch registered sites");
      setRegisteredSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSaveSiteSettings = async (siteKey: string) => {
    const site = registeredSites.find(s => s.site_key === siteKey);
    const nextName = (siteNameDrafts[siteKey] !== undefined ? siteNameDrafts[siteKey] : (site?.site_name || "")).trim();
    // Default to existing photo if no new draft exists
    const nextPhoto = sitePhotoDrafts[siteKey] !== undefined ? sitePhotoDrafts[siteKey] : (site?.site_photo || null);

    if (!nextName) {
      toast.error("Site name cannot be empty");
      return;
    }

    try {
      setSavingSiteKey(siteKey);
      const result = await apiPut(`/api/sensors/sites/${encodeURIComponent(siteKey)}`, {
        siteName: nextName,
        sitePhoto: nextPhoto,
      });
      toast.success(result?.success ? "Site settings updated successfully" : "Site settings updated");
      
      // Clear drafts for this site after successful save
      setSiteNameDrafts(prev => {
        const next = { ...prev };
        delete next[siteKey];
        return next;
      });
      setSitePhotoDrafts(prev => {
        const next = { ...prev };
        delete next[siteKey];
        return next;
      });

      await fetchRegisteredSites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update site settings");
    } finally {
      setSavingSiteKey(null);
    }
  };

  const handleSitePhotoChange = (siteKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file (JPG, PNG, etc).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Original file is too large (max 15MB)");
      return;
    }

    setSitePhotoLoading(prev => ({ ...prev, [siteKey]: true }));

    const processFile = async (targetFile: File | Blob) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const base64String = canvas.toDataURL('image/jpeg', 0.7);
              setSitePhotoDrafts(prev => ({ ...prev, [siteKey]: base64String }));
            } else {
              toast.error("Failed to initialize image processor");
            }
          } catch (err) {
            toast.error("Error resizing image. Please try a different photo.");
          } finally {
            setSitePhotoLoading(prev => ({ ...prev, [siteKey]: false }));
          }
        };
        img.onerror = () => {
          toast.error("The selected file is not a supported image format or is corrupted.");
          setSitePhotoLoading(prev => ({ ...prev, [siteKey]: false }));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read the file from your device.");
        setSitePhotoLoading(prev => ({ ...prev, [siteKey]: false }));
      };
      reader.readAsDataURL(targetFile);
    };

    const runConversion = async () => {
      const fileName = file.name.toLowerCase();
      const isHEIC = fileName.endsWith(".heic") || fileName.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";

      if (isHEIC) {
        try {
          const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
          });
          const resultBlob = Array.isArray(converted) ? converted[0] : converted;
          processFile(resultBlob);
        } catch (err) {
          toast.error("Failed to convert HEIC image. Please try a JPG or PNG instead.");
          setSitePhotoLoading(prev => ({ ...prev, [siteKey]: false }));
        }
      } else {
        processFile(file);
      }
    };

    runConversion();
  };

  const handleStartReading = async (siteKey: string) => {
    try {
      setStartingSiteKey(siteKey);
      await apiPost(`/api/sensors/sites/${encodeURIComponent(siteKey)}/start-reading`, {});
      if (typeof window !== "undefined") {
        localStorage.setItem("sg_manual_active_site_key", siteKey);
      }
      toast.success("Sensor reading started");
      setRegisteredSites((prev) => prev.map((item) => ({
        ...item,
        is_active: item.site_key === siteKey ? 1 : 0
      })));
    } catch (err: any) {
      toast.error(err?.message || "Failed to start reading");
    } finally {
      setStartingSiteKey(null);
    }
  };

  const handleStopReading = async (siteKey: string) => {
    try {
      setStoppingSiteKey(siteKey);
      await apiPost(`/api/sensors/sites/${encodeURIComponent(siteKey)}/stop-reading`, {});
      if (typeof window !== "undefined") {
        localStorage.removeItem("sg_manual_active_site_key");
      }
      toast.success("Sensor reading stopped");
      setRegisteredSites((prev) => prev.map((item) => ({
        ...item,
        is_active: 0
      })));
    } catch (err: any) {
      toast.error(err?.message || "Failed to stop reading");
    } finally {
      setStoppingSiteKey(null);
    }
  };

  const handleAddManualSite = async () => {
    alert("This feature is placeholder and would require a coordinate picker.");
  };

  const handleDeleteSite = async (siteKey: string) => {
    if (!confirm("Are you sure you want to delete this site and all its data?")) return;

    try {
      await apiCall(`/api/sensors/sites/${encodeURIComponent(siteKey)}`, { method: "DELETE" });
      toast.success("Site deleted successfully");
      fetchRegisteredSites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete site");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRegisteredSites();
    if (!_adminSettingsFirstLoadDone) {
      setTimeout(() => { _adminSettingsFirstLoadDone = true; }, 50);
    }
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await apiPost("/api/auth/admin/create-user", formData);
      toast.success(result?.message || "User account created successfully");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        role: "bhw",
        organization: "",
        password: "",
        confirmPassword: "",
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create user account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiCall(`/api/auth/admin/users/${userId}`, { method: "DELETE" });
      toast.success("User account deleted successfully");
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
    }
  };

  const handleAdminUpdatePassword = async () => {
    if (!passwordTargetUser) return;
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setPasswordUpdating(true);
      await apiPut(`/api/auth/admin/users/${passwordTargetUser.id}/password`, { password: newPassword });
      toast.success(`Password for ${passwordTargetUser.email} updated successfully`);
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    if (role === "admin") return "System Admin";
    return role === "bhw" ? "Barangay Health Worker" : "Municipal Health Officer";
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

      <div className={`mx-auto flex h-full min-h-0 flex-col ${isMobile ? 'w-full' : 'w-full max-w-[1700px]'}`}>
        <div style={{
          display: "flex",
          flexDirection: isCompact ? "column" : "row",
          justifyContent: isCompact ? "flex-start" : "space-between",
          alignItems: isCompact ? "flex-start" : "center",
          marginBottom: 32,
          gap: isCompact ? 12 : 0,
          animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? 18 : (isNarrowDesktop ? 24 : 26),
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              letterSpacing: "-0.01em"
            }}>
              Admin Settings
            </h1>
            <p style={{
              fontSize: isNarrowDesktop ? 11 : 12,
              color: "#7b8a9a",
              margin: "2px 0 0",
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
          <div style={{
            animation: animate ? "contentSlideIn 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
          }}>
            <div className="glass-card premium-shadow" style={{
              borderRadius: 28,
              padding: 32,
              border: "1px solid rgba(0,0,0,0.03)",
              minHeight: "100%",
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
                      <SelectItem value="municipal_health_officer" style={{ fontFamily: POPPINS }}>Municipal Health Officer</SelectItem>
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
                            onClick={() => {
                              setPasswordTargetUser(item);
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setPasswordModalOpen(true);
                            }}
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

        <AlertDialog
          open={!!sitePendingDelete}
          onOpenChange={(open) => {
            if (!open && !deletingSiteKey) {
              setSitePendingDelete(null);
            }
          }}
        >
          <AlertDialogContent style={{ fontFamily: POPPINS, borderRadius: 24, maxWidth: 560, padding: 28 }}>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle style={{ fontSize: 24, fontWeight: 700, color: "#991b1b" }}>
                Delete Site?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  marginTop: 8,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#475569",
                }}
              >
                {sitePendingDelete ? (
                  <>
                    This will permanently delete{" "}
                    <span style={{ fontWeight: 700, color: "#1e293b" }}>
                      {sitePendingDelete.site_name || sitePendingDelete.address || sitePendingDelete.site_key}
                    </span>
                    {" "}and all readings, raw readings, alerts, and reports linked to this exact site only.
                    Other sites will not be affected.
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div
              style={{
                marginTop: 8,
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.14)",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              This action cannot be undone.
            </div>

            <AlertDialogFooter className="mt-2 !flex-row !justify-end !gap-3">
              <AlertDialogCancel
                disabled={!!deletingSiteKey}
                style={{
                  borderRadius: 999,
                  minWidth: 110,
                  height: 44,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <button
                  type="button"
                  onClick={() => sitePendingDelete && handleDeleteSite(sitePendingDelete.site_key)}
                  disabled={!!deletingSiteKey}
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#fff",
                    borderRadius: 999,
                    minWidth: 140,
                    height: 44,
                    border: "none",
                    fontFamily: POPPINS,
                    fontWeight: 700,
                    padding: "0 18px",
                    cursor: deletingSiteKey ? "not-allowed" : "pointer",
                    opacity: deletingSiteKey ? 0.72 : 1,
                    boxShadow: "0 12px 24px rgba(239,68,68,0.22)",
                  }}
                >
                  {deletingSiteKey ? "Deleting..." : "Delete Site"}
                </button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

          <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(53,125,134,0.2)",
            background: "rgba(53,125,134,0.04)",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1.1fr 0.9fr 0.9fr auto",
            gap: 10,
            alignItems: "end",
          }}>
            <div>
              <Label style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", fontFamily: POPPINS }}>Site Name</Label>
              <Input
                value={newSiteForm.siteName}
                onChange={(e) => setNewSiteForm((prev) => ({ ...prev, siteName: e.target.value }))}
                className="custom-input"
                style={{ marginTop: 6 }}
                placeholder="Example: Crossing Riverside"
              />
            </div>

            <div>
              <Label style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", fontFamily: POPPINS }}>Location</Label>
              <Input
                value={newSiteForm.location}
                onChange={(e) => setNewSiteForm((prev) => ({ ...prev, location: e.target.value }))}
                className="custom-input"
                style={{ marginTop: 6 }}
                placeholder="Barangay or full address"
              />
            </div>

            <div>
              <Label style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", fontFamily: POPPINS }}>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={newSiteForm.latitude}
                onChange={(e) => setNewSiteForm((prev) => ({ ...prev, latitude: e.target.value }))}
                className="custom-input"
                style={{ marginTop: 6 }}
                placeholder="7.123456"
              />
            </div>

            <div>
              <Label style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", fontFamily: POPPINS }}>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={newSiteForm.longitude}
                onChange={(e) => setNewSiteForm((prev) => ({ ...prev, longitude: e.target.value }))}
                className="custom-input"
                style={{ marginTop: 6 }}
                placeholder="125.123456"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddManualSite}
              disabled={addingSite}
              style={{ background: "#357D86", color: "#fff", borderRadius: 100, padding: "10px 18px", fontWeight: 600, border: "none", fontFamily: POPPINS, fontSize: 13, width: isMobile ? "100%" : "auto" }}
            >
              {addingSite ? "Adding..." : "Add Site"}
            </Button>
          </div>

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
                const isActiveSite = site.is_active === 1 || site.is_active === true;
                const isStarting = startingSiteKey === site.site_key;
                const isStopping = stoppingSiteKey === site.site_key;
                const isDeleting = deletingSiteKey === site.site_key;
                return (
                  <div
                    key={site.site_key}
                    style={{
                      padding: isMobile ? 16 : 20,
                      borderBottom: idx === registeredSites.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
                      background: isActiveSite
                        ? "linear-gradient(180deg, rgba(20,184,166,0.07), rgba(255,255,255,0.98))"
                        : (idx % 2 === 0 ? "rgba(0,0,0,0.01)" : "#fff"),
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1.2fr auto",
                      gap: isMobile ? 14 : 18,
                      alignItems: isMobile ? "stretch" : "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>{currentLabel}</div>
                        {isActiveSite && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#0f766e",
                            background: "#ccfbf1",
                            border: "1px solid #99f6e4",
                            borderRadius: 999,
                            padding: "4px 10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em"
                          }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#14b8a6",
                              boxShadow: "0 0 0 6px rgba(20,184,166,0.12)"
                            }} />
                            Active
                          </span>
                        )}
                      </div>
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

                    <div>
                      <Label style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: POPPINS }}>Site Photo</Label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                        <div style={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 12, 
                          background: "rgba(0,0,0,0.03)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          overflow: "hidden",
                          border: "1px solid rgba(0,0,0,0.05)"
                        }}>
                          {sitePhotoLoading[site.site_key] ? (
                            <Loader2 size={20} className="animate-spin text-schistoguard-teal" />
                          ) : sitePhotoDrafts[site.site_key] ? (
                            <img src={sitePhotoDrafts[site.site_key]!} alt="Site" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <ImageIcon size={20} color="#cbd5e1" />
                          )}
                        </div>
                        <Label
                          htmlFor={`photo-upload-${site.site_key}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 100,
                            background: "rgba(53,125,134,0.06)",
                            color: "#357D86",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          className="hover:bg-schistoguard-teal hover:text-white"
                        >
                          <Camera size={14} />
                          {sitePhotoDrafts[site.site_key] ? "Change" : "Upload"}
                        </Label>
                        <input
                          id={`photo-upload-${site.site_key}`}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleSitePhotoChange(site.site_key, e)}
                        />
                      </div>
                    </div>

                    <div style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      gap: 10,
                      justifyContent: isMobile ? "flex-start" : "flex-end",
                      alignItems: isMobile ? "stretch" : "center",
                      position: "relative",
                    }}>
                      <div style={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        gap: 8,
                        alignItems: isMobile ? "stretch" : "center",
                        padding: isMobile ? 0 : "6px",
                        borderRadius: 999,
                        background: isActiveSite ? "rgba(20,184,166,0.08)" : "rgba(53,125,134,0.06)",
                        border: isActiveSite ? "1px solid rgba(20,184,166,0.18)" : "1px solid rgba(53,125,134,0.12)",
                      }}>
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: isActiveSite ? "#0f766e" : "#476072",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: isMobile ? "10px 14px 0" : "0 6px 0 10px",
                          minHeight: isMobile ? "auto" : 40,
                          fontFamily: POPPINS,
                        }}>
                          <Radio size={14} />
                          {isActiveSite ? "Reading in progress" : "Ready to start"}
                        </div>
                        {isActiveSite ? (
                          <Button
                            type="button"
                            onClick={() => handleStopReading(site.site_key)}
                            disabled={isStopping}
                            style={{
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              borderRadius: 999,
                              padding: "10px 16px",
                              fontWeight: 700,
                              border: "none",
                              fontFamily: POPPINS,
                              fontSize: 13,
                              boxShadow: "0 10px 20px rgba(239,68,68,0.18)",
                              opacity: isStopping ? 0.82 : 1,
                            }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <Square size={14} />
                              {isStopping ? "Stopping..." : "Stop Reading"}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleStartReading(site.site_key)}
                            disabled={isStarting}
                            style={{
                              background: "linear-gradient(135deg, #357D86, #2b8f9d)",
                              color: "#fff",
                              borderRadius: 999,
                              padding: "10px 16px",
                              fontWeight: 700,
                              border: "none",
                              fontFamily: POPPINS,
                              fontSize: 13,
                              boxShadow: "0 10px 20px rgba(53,125,134,0.18)",
                              opacity: isStarting ? 0.82 : 1,
                            }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <Play size={14} />
                              {isStarting ? "Starting..." : "Start Reading"}
                            </span>
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        disabled={!!savingSiteKey || !!sitePhotoLoading[site.site_key]}
                        onClick={() => handleSaveSiteSettings(site.site_key)}
                        style={{
                          background: "linear-gradient(135deg, #357D86, #2d6a72)",
                          color: "#fff",
                          borderRadius: "100px",
                          padding: "0 24px",
                          height: 44,
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: POPPINS,
                          boxShadow: "0 4px 12px rgba(53, 125, 134, 0.25)",
                          minWidth: 100,
                        }}
                      >
                        {savingSiteKey === site.site_key ? (
                          sitePhotoDrafts[site.site_key] ? "Uploading..." : "Saving..."
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={isDeleting || isStarting || isStopping}
                            style={{
                              background: "#fff",
                              color: "#475569",
                              borderRadius: 999,
                              width: 42,
                              height: 42,
                              padding: 0,
                              border: "1px solid rgba(148,163,184,0.28)",
                              fontFamily: POPPINS,
                              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                              opacity: isDeleting ? 0.72 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isDeleting || isStarting || isStopping ? "not-allowed" : "pointer",
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          style={{
                            minWidth: 170,
                            background: "#fff",
                            border: "1px solid rgba(239,68,68,0.12)",
                            borderRadius: 14,
                            padding: 6,
                            boxShadow: "0 20px 45px rgba(15,23,42,0.14)",
                            fontFamily: POPPINS,
                          }}
                        >
                          <DropdownMenuItem
                            onClick={() => setSitePendingDelete(site)}
                            disabled={isDeleting}
                            style={{
                              color: "#dc2626",
                              fontWeight: 700,
                              borderRadius: 10,
                              padding: "10px 12px",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: isDeleting ? "not-allowed" : "pointer",
                            }}
                          >
                            <Trash2 size={14} />
                            {isDeleting ? "Deleting..." : "Delete Site"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: gap, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: gap }}>
          <div className="glass-card premium-shadow w-full" style={{
            borderRadius: 28,
            padding: 32,
            position: "relative",
            border: "1px solid rgba(0,0,0,0.03)",
            animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>System Settings</h2>
            <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>Customize the sensor logging interval used by the system.</p>

            <div style={{ marginTop: 14, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          </div>

          <div className="glass-card premium-shadow w-full" style={{
            borderRadius: 28,
            padding: 32,
            border: "1px solid rgba(0,0,0,0.03)",
            animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both" : "none"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", fontFamily: POPPINS, margin: 0 }}>SMS Summary Schedule</h2>
            <p style={{ fontSize: 13, color: "#64748b", fontFamily: POPPINS, marginTop: 4 }}>Set two daily send times for the summary SMS.</p>

            {smsScheduleLoading ? (
              <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>Loading SMS schedule...</div>
            ) : (
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {smsSummaryTimes.map((time, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: "#357D86" }}>
                      {index === 0 ? "First SMS Time" : "Second SMS Time"}
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => {
                        const nextTimes = [...smsSummaryTimes];
                        nextTimes[index] = event.target.value;
                        setSmsSummaryTimes(nextTimes);
                      }}
                      style={{ padding: "0 12px", borderRadius: 100, border: "1px solid #ddd", height: 38, fontSize: 13, color: "#1e293b", fontFamily: POPPINS, cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveSmsSummarySchedule}
                disabled={smsScheduleSaving || smsScheduleLoading}
                style={{ background: "#357D86", color: "#fff", borderRadius: 100, padding: "10px 24px", fontWeight: 600, border: "none", fontFamily: POPPINS, fontSize: 15, opacity: smsScheduleSaving || smsScheduleLoading ? 0.7 : 1, cursor: smsScheduleSaving || smsScheduleLoading ? 'not-allowed' : 'pointer' }}
              >
                {smsScheduleSaving ? "Saving..." : "Save SMS Schedule"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: gap, width: '100%', flexShrink: 0 }} />
      </div>
    </div>
  );
}
