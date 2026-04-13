import { ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "./ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  MoreHorizontal,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";

const POPPINS = "'Poppins', sans-serif";

let _recipientsFirstLoadDone = false;

interface Resident {
  id: number;
  siteName: string;
  name: string;
  phone: string;
  role: "resident" | "bhw" | "lgu";
  createdAt?: string;
}

interface ResidentsManagerProps {
  siteName?: string;
  refreshTrigger?: number;
}

export function ResidentsManager({ siteName = "All Sites", refreshTrigger = 0 }: ResidentsManagerProps) {
  const animate = !_recipientsFirstLoadDone;
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMobileViewAll, setShowMobileViewAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    role: "resident" | "bhw" | "lgu";
  }>({
    name: "",
    phone: "",
    role: "resident",
  });
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [uploadResultOpen, setUploadResultOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    inserted: number;
    updated: number;
    failed: number;
    error?: string;
  } | null>(null);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;
  const isNarrowDesktop = windowWidth < 1600;
  const pad = isMobile ? 16 : isTablet ? 24 : 32;
  const isCompact = windowWidth < 1100;

  // Fetch residents
  useEffect(() => {
    fetchResidents();
    if (!_recipientsFirstLoadDone) {
      setTimeout(() => { _recipientsFirstLoadDone = true; }, 50);
    }
  }, [siteName, refreshTrigger]);

  const fetchResidents = async () => {
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      let endpoint = "/api/sensors/residents";
      if (siteName && siteName !== "All Sites") {
        endpoint += `?siteName=${encodeURIComponent(siteName)}`;
      }

      console.log("Fetching residents from:", endpoint);
      const data = await apiGet(endpoint);
      console.log("Residents data:", data);
      setResidents(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error fetching residents";
      console.error("Fetch error:", errorMsg, err);
      setError(errorMsg);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResident = async () => {
    if (!formData.name || !formData.phone) {
      setError("Name and phone are required");
      return;
    }

    try {
      await apiPost("/api/sensors/residents", {
        siteName: siteName === "All Sites" ? "Default" : siteName,
        ...formData,
      });

      setError("");
      setIsAddDialogOpen(false);
      setFormData({ name: "", phone: "", role: "resident" });
      fetchResidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding resident");
    }
  };

  const handleEditResident = async () => {
    if (!selectedResident) return;
    if (!formData.name || !formData.phone) {
      setError("Name and phone are required");
      return;
    }

    try {
      await apiPut(
        `/api/sensors/residents/${selectedResident.id}`,
        formData
      );

      setError("");
      setIsEditDialogOpen(false);
      setFormData({ name: "", phone: "", role: "resident" });
      setSelectedResident(null);
      fetchResidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating resident");
    }
  };

  const handleDeleteResident = async () => {
    if (!selectedResident) return;

    try {
      await apiDelete(
        `/api/sensors/residents/${selectedResident.id}`
      );

      setError("");
      setIsDeleteDialogOpen(false);
      setSelectedResident(null);
      fetchResidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting resident");
    }
  };

  const openEditDialog = (resident: Resident) => {
    setSelectedResident(resident);
    setFormData({
      name: resident.name,
      phone: resident.phone,
      role: resident.role,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (resident: Resident) => {
    setSelectedResident(resident);
    setIsDeleteDialogOpen(true);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCSV(true);
    try {
      let csvContent = await file.text();

      // Remove BOM if present
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }

      // Parse lines and auto-detect headers
      const lines = csvContent.trim().split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length === 0) {
        setUploadResult({
          success: false,
          inserted: 0,
          updated: 0,
          failed: 0,
          error: "CSV file is empty"
        });
        setUploadResultOpen(true);
        setIsUploadingCSV(false);
        return;
      }

      // Check if first line looks like headers
      const firstLine = lines[0].toLowerCase();
      const headerKeywords = ['name', 'phone', 'contact', 'number', 'mobile'];
      const isHeader = headerKeywords.some(keyword => firstLine.includes(keyword));

      // Filter out header row if detected
      const dataLines = isHeader ? lines.slice(1) : lines;

      if (dataLines.length === 0) {
        setUploadResult({
          success: false,
          inserted: 0,
          updated: 0,
          failed: 0,
          error: "No data rows found in CSV"
        });
        setUploadResultOpen(true);
        setIsUploadingCSV(false);
        return;
      }

      const cleanCsv = dataLines.join('\n');

      try {
        const data = await apiPost('/api/sensors/upload-csv', {
          siteName: siteName === "All Sites" ? "Default" : siteName,
          csv: cleanCsv
        });

        setUploadResult({
          success: true,
          inserted: data.inserted || 0,
          updated: data.updated || 0,
          failed: data.failed || 0
        });
        fetchResidents();
      } catch (err: any) {
        setUploadResult({
          success: false,
          inserted: 0,
          updated: 0,
          failed: 0,
          error: err.message || "Upload failed"
        });
      }
      setUploadResultOpen(true);
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setUploadResult({
        success: false,
        inserted: 0,
        updated: 0,
        failed: 0,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      setUploadResultOpen(true);
    } finally {
      setIsUploadingCSV(false);
      e.target.value = ''; // Reset input
    }
  };

  // Filter residents
  const filteredResidents = residents.filter((resident) => {
    const matchesSearch =
      resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.phone.includes(searchTerm);
    const matchesRole = selectedRole === "all" || resident.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roleColors = {
    resident: "bg-blue-100 text-blue-800",
    bhw: "bg-green-100 text-green-800",
    lgu: "bg-purple-100 text-purple-800",
  };

  const roleLabels = {
    resident: "Resident",
    bhw: "BHW",
    lgu: "LGU",
  };

  return (
    <>
      <div style={{
        fontFamily: POPPINS,
        height: "100%",
        overflow: "hidden",
        background: "#f5f7f9",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        <style>{`
          *::-webkit-scrollbar { display: none; }
          @keyframes contentSlideIn {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardDataFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {/* Header */}
        <div style={{
          display: "flex",
          flexDirection: isCompact ? "column" : "row",
          justifyContent: isCompact ? "flex-start" : "space-between",
          alignItems: isCompact ? "flex-start" : "center",
          marginBottom: 4,
          gap: isCompact ? 12 : 0,
          animation: animate ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
            <h1 style={{
              fontSize: isMobile ? 18 : (isNarrowDesktop ? 24 : 26),
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              letterSpacing: "-0.02em",
            }}>
              Recipients
            </h1>
            <p style={{
              fontSize: isNarrowDesktop ? 11 : 12,
              color: "#74828f",
              margin: "2px 0 0",
              fontFamily: POPPINS,
              whiteSpace: "normal",
              maxWidth: "100%",
            }}>Manage residents and personnel for {siteName}</p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 10 : 10,
            flexWrap: "wrap",
            flex: isCompact ? "none" : 1,
            justifyContent: isCompact ? "flex-start" : "flex-end",
            ...(isCompact ? { width: "100%" } : {}),
          }}>
            <div style={{
              position: "relative",
              flex: isCompact ? "1 1 calc(50% - 6px)" : "1",
              maxWidth: isCompact ? undefined : 420,
              minWidth: isCompact ? 0 : 200
            }}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 100, fontFamily: POPPINS,
                  fontSize: isNarrowDesktop ? 12 : 13,
                  border: "1px solid #e2e5ea", background: "#fff",
                  height: isNarrowDesktop ? 34 : 38,
                  paddingLeft: 34
                }}
              />
            </div>
            <div style={{ flex: isCompact ? "1 1 calc(50% - 6px)" : undefined, minWidth: isCompact ? 0 : undefined }}>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger style={{
                  width: isCompact ? "100%" : 170,
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS,
                  fontSize: isNarrowDesktop ? 12 : 13,
                  border: "1px solid #e2e5ea", background: "#fff",
                  height: isNarrowDesktop ? 34 : 38,
                  padding: "0 10px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <SelectValue placeholder="All Designations" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent style={{ fontFamily: POPPINS }}>
                  <SelectItem value="all">All Designations</SelectItem>
                  <SelectItem value="resident">Residents</SelectItem>
                  <SelectItem value="bhw">BHW</SelectItem>
                  <SelectItem value="lgu">LGU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-upload-input"
              disabled={isUploadingCSV}
            />
            <Label
              htmlFor="csv-upload-input"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: isNarrowDesktop ? "0 12px" : "0 16px", height: isNarrowDesktop ? 34 : 38, borderRadius: 100,
                border: "1px solid #e2e5ea",
                background: "#fff", cursor: "pointer", fontSize: isNarrowDesktop ? 12 : 13,
                fontFamily: POPPINS, fontWeight: 500, color: "#374151",
                margin: 0, flexShrink: 0,
                ...(isCompact ? { padding: "0 10px", flex: "1 1 calc(50% - 6px)" } : {}),
              }}
            >
              <Upload size={14} />
              {isCompact ? "Import CSV" : (isUploadingCSV ? "Wait..." : "Import CSV")}
            </Label>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: isNarrowDesktop ? "0 12px" : "0 16px", height: isNarrowDesktop ? 34 : 38, borderRadius: 100,
                border: "none", flexShrink: 0,
                background: "#357D86", cursor: "pointer", fontSize: isNarrowDesktop ? 12 : 13,
                fontFamily: POPPINS, fontWeight: 500, color: "#fff",
                ...(isCompact ? { padding: "0 10px", flex: "1 1 calc(50% - 6px)" } : {}),
              }}
            >
              <Plus size={15} />
              {isCompact ? "Add" : "Add Recipient"}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
          gap: isMobile ? 12 : 16,
          marginBottom: 24,
          animation: animate ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          {[
            { label: "Total Recipients", value: residents.length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#367981" }} />, color: "#367981", bg: "#e9f2f3" },
            { label: "Residents", value: residents.filter((r) => r.role === "resident").length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#4478f6" }} />, color: "#4478f6", bg: "#ebf2ff" },
            { label: "BHW", value: residents.filter((r) => r.role === "bhw").length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#2cc865" }} />, color: "#2cc865", bg: "#eafff1" },
            { label: "LGU", value: residents.filter((r) => r.role === "lgu").length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#a559ea" }} />, color: "#a559ea", bg: "#f6eeff" },
          ].map((card, i) => (
            <div key={card.label} style={{
              background: "#fff",
              borderRadius: 16,
              padding: isNarrowDesktop ? 12 : 14,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: isNarrowDesktop ? 4 : 6,
              height: "auto",
              animation: animate ? `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.07}s both` : "none",
            }}>
              <div style={{
                width: isNarrowDesktop ? 30 : 38,
                height: isNarrowDesktop ? 30 : 38,
                borderRadius: 10,
                background: card.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {card.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: isNarrowDesktop ? 20 : 22, fontWeight: 600, color: card.color, fontFamily: POPPINS, lineHeight: 1.1 }}>{card.value}</span>
                <span style={{ fontSize: isNarrowDesktop ? 9 : 10, fontWeight: 500, color: "#7b8a9a", fontFamily: POPPINS }}>{card.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main List Card */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e2e5ea",
          overflow: "hidden",
          flex: isMobile ? "0 0 auto" : 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          animation: animate ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          <div
            onClick={() => isMobile && setShowMobileViewAll(true)}
            style={{
              padding: isMobile ? "12px 14px" : "14px 20px 12px",
              background: isMobile ? "linear-gradient(135deg, #ffffff 0%, #f9fdfd 100%)" : "#fff",
              borderBottom: isMobile ? "none" : "1px solid #f0f1f3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: isMobile ? "pointer" : "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isMobile && (
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "#f0f8f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Users size={18} color="#357D86" strokeWidth={2.5} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 style={{
                  fontSize: 13, fontWeight: 700, color: "#1a2a3a",
                  margin: 0,
                  fontFamily: POPPINS,
                }}>
                  {isMobile ? "Recipients Directory" : "Recipient List"}
                </h2>
                {isMobile && (
                  <span style={{
                    fontSize: 11,
                    color: "#7b8a9a",
                    fontWeight: 500,
                    fontFamily: POPPINS
                  }}>
                    Manage alert recipients
                  </span>
                )}
              </div>
            </div>
            {isMobile && (
              <div style={{
                background: "#f0f8f9",
                padding: "7px 14px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}>
                <span
                  style={{
                    fontSize: 12, fontWeight: 700, color: "#357D86",
                    cursor: "pointer", fontFamily: POPPINS, lineHeight: 1,
                  }}
                >
                  View All
                </span>
                <ChevronRight size={14} color="#357D86" strokeWidth={3} />
              </div>
            )}
          </div>

          {!isMobile && (
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowX: "auto",
              overflowY: "auto",
              padding: 0,
            }}>
              {loading ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "#7b8a9a", fontFamily: POPPINS }}>Loading recipients...</div>
              ) : filteredResidents.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <Users style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No recipients found</h3>
                  <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>
                    {residents.length === 0 ? "Try adding a new recipient" : "Try adjusting your search criteria"}
                  </p>
                </div>
              ) : (
                /* Desktop Table */
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: POPPINS }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      {["Name", "Phone Number", "Designation", "Actions"].map(h => (
                        <th key={h} style={{
                          padding: isNarrowDesktop ? "8px 12px" : "10px 16px",
                          fontSize: isNarrowDesktop ? 10.5 : 11,
                          fontWeight: 600,
                          color: "#7b8a9a",
                          textAlign: h === "Actions" ? "right" : "left",
                          position: "sticky",
                          top: 0,
                          background: "#fff",
                          zIndex: 1,
                          fontFamily: POPPINS,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.map((resident, idx) => (
                      <tr key={resident.id} style={{
                        borderBottom: "1px solid #f5f5f5",
                        animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.35 + idx * 0.04}s both`,
                      }}>
                        <td style={{ padding: isNarrowDesktop ? "8px 12px" : "10px 16px" }}>
                          <div style={{ fontSize: isNarrowDesktop ? 11 : 12, fontWeight: 600, color: "#1a2a3a" }}>{resident.name}</div>
                        </td>
                        <td style={{ padding: isNarrowDesktop ? "8px 12px" : "10px 16px", fontSize: isNarrowDesktop ? 10.5 : 11, color: "#475569", fontWeight: 500 }}>
                          {resident.phone}
                        </td>
                        <td style={{ padding: isNarrowDesktop ? "8px 12px" : "10px 16px" }}>
                          <span style={{
                            fontSize: isNarrowDesktop ? 9 : 10,
                            fontWeight: 600,
                            padding: isNarrowDesktop ? "2px 8px" : "3px 10px",
                            borderRadius: 18,
                            background: resident.role === 'resident' ? '#eff6ff' : resident.role === 'bhw' ? '#f0fdf4' : '#faf5ff',
                            color: resident.role === 'resident' ? '#2563eb' : resident.role === 'bhw' ? '#16a34a' : '#9333ea',
                            fontFamily: POPPINS,
                          }}>
                            {roleLabels[resident.role]}
                          </span>
                        </td>
                        <td style={{ padding: isNarrowDesktop ? "8px 12px" : "10px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button style={{
                                  background: "none",
                                  border: "none",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  color: "#64748b",
                                  borderRadius: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>
                                  <MoreHorizontal size={20} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" style={{ fontFamily: POPPINS }}>
                                <DropdownMenuItem onClick={() => openEditDialog(resident)} className="cursor-pointer">
                                  <Edit size={14} className="mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteDialog(resident)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                  <Trash2 size={14} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile View All List Modal ── */}
      {isMobile && showMobileViewAll && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "92px 20px 20px",
        }} onClick={() => setShowMobileViewAll(false)}>
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 420,
              maxHeight: "calc(100vh - 120px)",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              animation: "contentSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px 12px 20px", borderBottom: "1px solid #f0f1f3"
            }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#1a2a3a", fontFamily: POPPINS }}>All Recipients</span>
              <button
                onClick={() => setShowMobileViewAll(false)}
                style={{
                  width: "32px", height: "32px",
                  minWidth: "32px", minHeight: "32px",
                  padding: "0px", margin: "0px",
                  borderRadius: "1000px",
                  border: "none", background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  lineHeight: 0,
                  overflow: "hidden",
                  appearance: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 0 10px 0" }}>
              {filteredResidents.map((resident, idx) => (
                <div key={resident.id} style={{
                  padding: "12px 20px",
                  borderBottom: idx < filteredResidents.length - 1 ? "1px solid #f0f0f0" : "none",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>{resident.name}</span>
                      <span style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>{resident.phone}</span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: resident.role === 'resident' ? '#eff6ff' : resident.role === 'bhw' ? '#f0fdf4' : '#faf5ff',
                      color: resident.role === 'resident' ? '#2563eb' : resident.role === 'bhw' ? '#16a34a' : '#9333ea',
                      fontFamily: POPPINS,
                    }}>
                      {roleLabels[resident.role]}
                    </span>
                  </div>
                </div>
              ))}
              {filteredResidents.length === 0 && (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <Users style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No recipients found</h3>
                  <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>
                    {residents.length === 0 ? "Try adding a new recipient" : "Try adjusting your search criteria"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          hideCloseButton={true}
          style={{
            width: isMobile ? "90vw" : 420,
            maxWidth: isMobile ? "90vw" : 420,
            borderRadius: 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Add Alert Recipient
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  padding: 0,
                  aspectRatio: "1/1",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: "20px", overflowY: "auto", maxHeight: "80vh" }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Name</Label>
                <Input
                  id="name-add"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Maria Santos"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
                />
              </div>
              <div>
                <Label htmlFor="phone-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Phone Number</Label>
                <Input
                  id="phone-add"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g., +639171234567"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
                />
                <p style={{ fontSize: 11, color: "#7b8a9a", marginTop: 6, fontFamily: POPPINS }}>
                  Format: +639XXXXXXXXX / 09XXXXXXXXX
                </p>
              </div>
              <div>
                <Label htmlFor="role-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Designation</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger id="role-add" style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ fontFamily: POPPINS }}>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                    <SelectItem value="lgu">Local Government Unit (LGU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleAddResident}
                style={{
                  backgroundColor: "#357D86",
                  color: "#fff",
                  borderRadius: 100,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1
                }}
              >
                Add Recipient
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                style={{
                  borderRadius: 100,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1,
                  border: "1px solid #e2e5ea",
                  color: "#64748b"
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          hideCloseButton={true}
          style={{
            width: isMobile ? "90vw" : 420,
            maxWidth: isMobile ? "90vw" : 420,
            borderRadius: 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Edit Alert Recipient
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  padding: 0,
                  aspectRatio: "1/1",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: "20px", overflowY: "auto", maxHeight: "80vh" }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Name</Label>
                <Input
                  id="name-edit"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Maria Santos"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
                />
              </div>
              <div>
                <Label htmlFor="phone-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Phone Number</Label>
                <Input
                  id="phone-edit"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g., +639171234567"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}
                />
                <p style={{ fontSize: 11, color: "#7b8a9a", marginTop: 6, fontFamily: POPPINS }}>
                  Format: +639XXXXXXXXX
                </p>
              </div>
              <div>
                <Label htmlFor="role-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: 13, marginBottom: 8, display: "block" }}>Designation</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger id="role-edit" style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ fontFamily: POPPINS }}>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                    <SelectItem value="lgu">Local Government Unit (LGU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleEditResident}
                style={{
                  backgroundColor: "#357D86",
                  color: "#fff",
                  borderRadius: 100,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1
                }}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                style={{
                  borderRadius: 100,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1,
                  border: "1px solid #e2e5ea",
                  color: "#64748b"
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          hideCloseButton={true}
          style={{
            width: isMobile ? "90vw" : 420,
            maxWidth: isMobile ? "90vw" : 420,
            borderRadius: 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Delete Alert Recipient?
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  minHeight: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  padding: 0,
                  aspectRatio: "1/1",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
              >
                <X size={18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: "1.5", fontFamily: POPPINS }}>
              This will remove <span style={{ fontWeight: 700, color: "#1a2a3a" }}>{selectedResident?.name}</span> from the alert list. This action cannot be undone.
            </p>

            <div style={{ marginTop: 8, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleDeleteResident}
                style={{
                  backgroundColor: "#eb5757",
                  color: "#fff",
                  borderRadius: 12,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1
                }}
              >
                Delete Recipient
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                style={{
                  borderRadius: 12,
                  height: 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  flex: 1,
                  border: "1px solid #e2e5ea",
                  color: "#64748b"
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Upload Result Modal */}
      {
        uploadResultOpen && uploadResult && (
          <Dialog open={uploadResultOpen} onOpenChange={setUploadResultOpen}>
            <DialogContent
              hideCloseButton={true}
              style={{
                width: isMobile ? "90vw" : 420,
                maxWidth: isMobile ? "90vw" : 420,
                borderRadius: 24,
                padding: 0,
                overflow: "hidden",
                border: "none",
                fontFamily: POPPINS,
              }}
              className="p-0"
            >
              {/* Modal Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #eef0f2",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0,
              }}>
                <div className="flex items-center gap-2">
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                    {uploadResult.success ? "Upload Successful" : "Upload Failed"}
                  </h2>
                </div>
                <DialogClose asChild>
                  <button
                    onClick={() => setUploadResultOpen(false)}
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      minHeight: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: "#f3f4f6",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0,
                      padding: 0,
                      aspectRatio: "1/1",
                      boxSizing: "border-box",
                      overflow: "hidden"
                    }}
                    className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
                  >
                    <X size={18} />
                  </button>
                </DialogClose>
              </div>

              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
                {uploadResult.success ? (
                  <div className="space-y-3">
                    {uploadResult.inserted > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-800 font-medium">
                          <span className="font-bold text-lg leading-none">{uploadResult.inserted}</span> new recipients added
                        </p>
                      </div>
                    )}
                    {uploadResult.updated > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-800 font-medium">
                          <span className="font-bold text-lg leading-none">{uploadResult.updated}</span> recipients updated
                        </p>
                      </div>
                    )}
                    {uploadResult.failed > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <p className="text-sm text-yellow-800 font-medium">
                          <span className="font-bold text-lg leading-none">{uploadResult.failed}</span> recipients failed
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p style={{ fontSize: 13, color: "#991b1b", lineHeight: "1.5", fontFamily: POPPINS }}>
                      {uploadResult.error || "An error occurred during upload"}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <Button
                    onClick={() => setUploadResultOpen(false)}
                    style={{
                      backgroundColor: "#357D86",
                      color: "#fff",
                      borderRadius: 12,
                      height: 42,
                      fontFamily: POPPINS,
                      fontWeight: 600,
                      width: "100%"
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

    </>
  );
}
