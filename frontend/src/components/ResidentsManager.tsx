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
import { useResponsiveScale } from "../utils/useResponsiveScale";

const POPPINS = "'Poppins', sans-serif";

let _recipientsFirstLoadDone = false;

interface Resident {
  id: number;
  siteName: string;
  name: string;
  phone: string;
  role: "resident" | "bhw" | "municipal_health_officer";
  barangay?: string;
  designationDetail?: string;
  createdAt?: string;
}

interface SiteOption {
  siteKey: string;
  siteName: string;
}

interface ResidentsManagerProps {
  siteName?: string;
  refreshTrigger?: number;
}

interface ResidentGroup {
  key: string;
  primaryResident: Resident;
  records: Resident[];
  displayName: string;
  names: string[];
  phone: string;
  roles: Resident["role"][];
  siteNames: string[];
}

interface ResidentFormData {
  name: string;
  phone: string;
  role: Resident["role"];
  barangay: string;
  designationDetail: string;
}

const ROLE_ORDER: Record<Resident["role"], number> = {
  bhw: 0,
  municipal_health_officer: 1,
  resident: 2,
};

const roleLabels: Record<Resident["role"], string> = {
  resident: "Resident",
  bhw: "BHW",
  municipal_health_officer: "Municipal Health Officer",
};

const roleStyles: Record<Resident["role"], { background: string; color: string }> = {
  resident: { background: "#eff6ff", color: "#2563eb" },
  bhw: { background: "#f0fdf4", color: "#16a34a" },
  municipal_health_officer: { background: "#faf5ff", color: "#9333ea" },
};

const EMPTY_RESIDENT_FORM: ResidentFormData = {
  name: "",
  phone: "",
  role: "resident",
  barangay: "",
  designationDetail: "",
};

function normalizeResidentRole(role: unknown): Resident["role"] {
  const normalized = (role || "").toString().trim().toLowerCase();

  if (normalized === "bhw" || normalized === "barangay health worker" || normalized === "barangay health worker (bhw)") {
    return "bhw";
  }

  if (
    normalized === "municipal_health_officer" ||
    normalized === "municipal health officer" ||
    normalized === "mho"
  ) {
    return "municipal_health_officer";
  }

  return "resident";
}

function normalizeResidentPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `63${digits}`;
  return digits;
}

function normalizePhilippinePhoneInput(phone: string) {
  const cleaned = (phone || "").replace(/[\s-]/g, "");
  if (/^09\d*$/.test(cleaned)) {
    return `+639${cleaned.slice(2)}`;
  }
  if (/^639\d*$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("+6309")) {
    return `+639${cleaned.slice(5)}`;
  }
  return cleaned;
}

function isValidPhilippineMobile(phone: string) {
  const normalized = normalizePhilippinePhoneInput(phone);
  return /^(?:\+639\d{9}|09\d{9})$/.test(normalized);
}

function getPhoneValidationMessage(phone: string) {
  if (!phone.trim()) return "";
  if (isValidPhilippineMobile(phone)) return "";
  return "Use 09XXXXXXXXX or +639XXXXXXXXX only.";
}

function normalizeBarangayToken(value: string) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/barangay|brgy\.?|purok|sitio/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function compareResidents(a: Resident, b: Resident) {
  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
  if (roleDiff !== 0) return roleDiff;

  const siteDiff = a.siteName.localeCompare(b.siteName);
  if (siteDiff !== 0) return siteDiff;

  return a.id - b.id;
}

function buildResidentGroups(residentList: Resident[]): ResidentGroup[] {
  const groups = new Map<string, Resident[]>();

  residentList.forEach((resident) => {
    const phoneKey = normalizeResidentPhone(resident.phone) || `resident-${resident.id}`;
    const existing = groups.get(phoneKey);
    if (existing) {
      existing.push(resident);
      return;
    }
    groups.set(phoneKey, [resident]);
  });

  return Array.from(groups.entries())
    .map(([key, records]) => {
      const sortedRecords = [...records].sort(compareResidents);
      const primaryResident = sortedRecords[0];
      const siteNames = uniqueStrings(sortedRecords.map((resident) => resident.siteName)).sort((a, b) => a.localeCompare(b));
      const names = uniqueStrings(sortedRecords.map((resident) => resident.name)).sort((a, b) => a.localeCompare(b));
      const roles = Array.from(new Set(sortedRecords.map((resident) => resident.role))).sort(
        (a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]
      );

      return {
        key,
        primaryResident,
        records: sortedRecords,
        displayName: primaryResident?.name || names[0] || "",
        names,
        phone: primaryResident?.phone || "",
        roles,
        siteNames,
      };
    })
    .sort((a, b) => {
      const nameDiff = a.displayName.localeCompare(b.displayName);
      if (nameDiff !== 0) return nameDiff;
      return a.phone.localeCompare(b.phone);
    });
}

function getResidentDetailPills(resident: Resident) {
  const barangay = (resident.barangay || "").trim();
  const designationDetail = (resident.designationDetail || "").trim();
  const pills: Array<{ label: string; background: string; color: string }> = [];

  if (barangay && resident.role !== "municipal_health_officer") {
    pills.push({
      label: barangay,
      background: "#f3f4f6",
      color: "#64748b",
    });
  }

  if (resident.role === "municipal_health_officer" && designationDetail) {
    pills.push({
      label: designationDetail,
      background: "#f5f3ff",
      color: "#7c3aed",
    });
  }

  return pills;
}

function ResidentRoleDetailFields({
  role,
  formData,
  onChange,
  smallLaptopModal,
  fieldPrefix,
}: {
  role: Resident["role"];
  formData: ResidentFormData;
  onChange: (field: "barangay" | "designationDetail", value: string) => void;
  smallLaptopModal: boolean;
  fieldPrefix: "add" | "edit";
}) {
  if (role === "resident" || role === "bhw") {
    return (
      <div>
        <Label htmlFor={`barangay-${fieldPrefix}`} style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>
          Barangay
        </Label>
        <Input
          id={`barangay-${fieldPrefix}`}
          value={formData.barangay}
          onChange={(e) => onChange("barangay", e.target.value)}
          placeholder="e.g., Basak"
          style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
        />
      </div>
    );
  }

  if (role === "municipal_health_officer") {
    return (
      <div>
        <div>
          <Label htmlFor={`designation-detail-${fieldPrefix}`} style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>
            Designation
          </Label>
          <Input
            id={`designation-detail-${fieldPrefix}`}
            value={formData.designationDetail}
            onChange={(e) => onChange("designationDetail", e.target.value)}
            placeholder="e.g., Sanitary Inspector"
            style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
          />
        </div>
      </div>
    );
  }

  return null;
}

export function ResidentsManager({ siteName = "All Sites", refreshTrigger = 0 }: ResidentsManagerProps) {
  const animate = !_recipientsFirstLoadDone;
  const [residents, setResidents] = useState<Resident[]>([]);
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [showSiteSelectionWarning, setShowSiteSelectionWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMobileViewAll, setShowMobileViewAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [formData, setFormData] = useState<ResidentFormData>(EMPTY_RESIDENT_FORM);
  const [isAddingResident, setIsAddingResident] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [uploadResultOpen, setUploadResultOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    inserted: number;
    updated: number;
    failed: number;
    error?: string;
  } | null>(null);

  const {
    isMobile,
    isTablet,
    isNarrowDesktop,
    isCompact,
    isSmallLaptop,
    pad,
    controlFontSize,
    controlHeight,
  } = useResponsiveScale();
  const smallLaptopModal = !isMobile && isSmallLaptop;
  const sectionSpacing = isNarrowDesktop ? 20 : 24;
  const phoneValidationMessage = getPhoneValidationMessage(formData.phone);

  // Keep the local site filter aligned with the current app/site context.
  useEffect(() => {
    const incoming = (siteName || "").toString().trim();
    if (!incoming || incoming === "All Sites") {
      setSelectedSiteFilter("all");
      return;
    }

    const matchedByKey = siteOptions.find((site) => site.siteKey === incoming);
    if (matchedByKey) {
      setSelectedSiteFilter(matchedByKey.siteName);
      return;
    }

    const matchedByName = siteOptions.find((site) => site.siteName === incoming);
    if (matchedByName) {
      setSelectedSiteFilter(matchedByName.siteName);
      return;
    }

    // Fallback for not-yet-loaded site lists.
    setSelectedSiteFilter(incoming);
  }, [siteName, siteOptions]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const data = await apiGet("/api/sensors/sites");
        if (!Array.isArray(data)) {
          setSiteOptions([]);
          return;
        }

        const options: SiteOption[] = data
          .map((site: any) => ({
            siteKey: (site.site_key || "").toString().trim(),
            siteName: (site.site_name || site.address || site.site_key || "").toString().trim(),
          }))
          .filter((site: SiteOption) => site.siteKey && site.siteName)
          .sort((a: SiteOption, b: SiteOption) => a.siteName.localeCompare(b.siteName));

        setSiteOptions(options);
      } catch {
        setSiteOptions([]);
      }
    };

    fetchSites();
  }, []);

  const selectedSiteForOps = selectedSiteFilter === "all" ? null : selectedSiteFilter;
  const needsSiteSelection = !selectedSiteForOps;

  useEffect(() => {
    if (!needsSiteSelection) {
      setShowSiteSelectionWarning(false);
    }
  }, [needsSiteSelection]);

  // Fetch residents
  useEffect(() => {
    fetchResidents();
    if (!_recipientsFirstLoadDone) {
      setTimeout(() => { _recipientsFirstLoadDone = true; }, 50);
    }
  }, [selectedSiteFilter, refreshTrigger]);

  const fetchResidents = async () => {
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      const endpoint = "/api/sensors/residents";
      console.log("Fetching residents from:", endpoint);
      const data = await apiGet(endpoint);
      console.log("Residents data:", data);
      setResidents(
        Array.isArray(data)
          ? data.map((resident: any) => ({
              ...resident,
              role: normalizeResidentRole(resident?.role),
            }))
          : []
      );
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
    if (isAddingResident) return;

    if (!formData.name || !formData.phone) {
      setError("Name and phone are required");
      return;
    }

    if (!isValidPhilippineMobile(formData.phone)) {
      setError("Invalid phone number. Use 09XXXXXXXXX or +639XXXXXXXXX.");
      return;
    }

    if ((formData.role === "resident" || formData.role === "bhw") && !formData.barangay.trim()) {
      setError("Barangay is required for residents and BHW");
      return;
    }

    setIsAddingResident(true);
    try {
      let targetSiteNames: string[] = [];

      if (formData.role === "municipal_health_officer") {
        targetSiteNames = ["All Sites"];
      } else if (selectedSiteForOps) {
        targetSiteNames = [selectedSiteForOps];
      } else {
        const barangayToken = normalizeBarangayToken(formData.barangay);
        targetSiteNames = siteOptions
          .map((site) => site.siteName)
          .filter((siteName) => normalizeBarangayToken(siteName).includes(barangayToken));

        if (!targetSiteNames.length) {
          setError("No matching site found for that barangay");
          return;
        }
      }

      await Promise.all(
        Array.from(new Set(targetSiteNames)).map((resolvedSiteName) =>
          apiPost("/api/sensors/residents", {
            siteName: resolvedSiteName,
            ...formData,
          })
        )
      );

      setError("");
      setIsAddDialogOpen(false);
      setFormData(EMPTY_RESIDENT_FORM);
      fetchResidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding resident");
    } finally {
      setIsAddingResident(false);
    }
  };

  const handleEditResident = async () => {
    if (!selectedResident) return;
    if (!formData.name || !formData.phone) {
      setError("Name and phone are required");
      return;
    }

    if (!isValidPhilippineMobile(formData.phone)) {
      setError("Invalid phone number. Use 09XXXXXXXXX or +639XXXXXXXXX.");
      return;
    }

    try {
      await apiPut(
        `/api/sensors/residents/${selectedResident.id}`,
        formData
      );

      setError("");
      setIsEditDialogOpen(false);
      setFormData(EMPTY_RESIDENT_FORM);
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
      role: normalizeResidentRole(resident.role),
      barangay: resident.barangay || "",
      designationDetail: resident.designationDetail || "",
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

    if (!selectedSiteForOps) {
      setUploadResult({
        success: false,
        inserted: 0,
        updated: 0,
        failed: 0,
        error: "Please select a site before importing CSV"
      });
      setUploadResultOpen(true);
      e.target.value = '';
      return;
    }

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
          siteName: selectedSiteForOps,
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

  const residentGroups = buildResidentGroups(residents);
  const filteredResidentGroups = residentGroups.filter((group) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSite =
      selectedSiteFilter === "all" ||
      group.records.some((record) => {
        const recordSiteName = (record.siteName || "").trim();
        return (
          recordSiteName === selectedSiteFilter ||
          (record.role === "municipal_health_officer" && recordSiteName === "All Sites")
        );
      });
    const matchesSearch =
      !normalizedSearch ||
      group.names.some((name) => name.toLowerCase().includes(normalizedSearch)) ||
      group.phone.toLowerCase().includes(normalizedSearch) ||
      group.siteNames.some((currentSiteName) => currentSiteName.toLowerCase().includes(normalizedSearch));
    const matchesRole =
      selectedRole === "all" ||
      group.roles.includes(selectedRole as Resident["role"]);

    return matchesSite && matchesSearch && matchesRole;
  });

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
      }}>
        <style>{`
          *::-webkit-scrollbar { display: none; }
          .sg-ts-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .sg-ts-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .sg-ts-scroll::-webkit-scrollbar-thumb {
            background: #c9d3df;
            border-radius: 999px;
          }
          .sg-ts-scroll::-webkit-scrollbar-thumb:hover {
            background: #b7c4d3;
          }
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
          flexDirection: (isMobile || isTablet) ? "column" : "row",
          justifyContent: "space-between",
          alignItems: (isMobile || isTablet) ? "flex-start" : "center",
          marginBottom: sectionSpacing,
          gap: (isMobile || isTablet) ? 12 : 16,
          animation: animate ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
            <h1 style={{
              fontSize: isMobile ? 18 : (isNarrowDesktop ? 24 : 26),
              fontWeight: 700,
              color: "#1a2a3a",
              margin: 0,
              fontFamily: POPPINS,
              whiteSpace: isMobile ? "normal" : "nowrap",
              overflow: isMobile ? undefined : "hidden",
              textOverflow: isMobile ? undefined : "ellipsis",
              letterSpacing: isMobile ? 0.1 : undefined,
            }}>
              Recipients
            </h1>
            {isMobile && (
              <span style={{
                fontSize: 12.5,
                color: "#7b8a9a",
                fontWeight: 400,
                marginTop: 2,
                fontFamily: POPPINS,
                lineHeight: 1.3,
                display: "block",
                whiteSpace: "normal",
              }}>Manage residents and personnel for {siteName}</span>
            )}
            {!isMobile && (
              <p style={{
                fontSize: isNarrowDesktop ? 11 : 12,
                color: "#7b8a9a",
                margin: isNarrowDesktop ? "1px 0 0" : "2px 0 0",
                fontFamily: POPPINS,
              }}>Manage residents and personnel for {siteName}</p>
            )}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 10,
            flexWrap: isCompact ? "wrap" : "nowrap",
            flex: isCompact ? "none" : 1,
            justifyContent: isCompact ? "flex-start" : "flex-end",
            ...(isMobile ? { width: "100%" } : {}),
          }}>
            <div style={{
              position: "relative",
              flex: isCompact ? "1 1 calc(50% - 6px)" : "1 1 300px",
              maxWidth: isCompact ? undefined : 360,
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
                  fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff",
                  height: controlHeight,
                  paddingLeft: 34
                }}
              />
            </div>
            <div style={{ flex: isCompact ? "1 1 calc(50% - 6px)" : undefined, minWidth: isCompact ? 0 : undefined }}>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger style={{
                  width: isCompact ? "100%" : (isNarrowDesktop ? 170 : 186),
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS,
                  fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff",
                  height: controlHeight,
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
                  <SelectItem value="municipal_health_officer">Municipal Health Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ flex: isCompact ? "1 1 calc(50% - 6px)" : undefined, minWidth: isCompact ? 0 : undefined }}>
              <Select
                value={selectedSiteFilter}
                onValueChange={(value) => {
                  setSelectedSiteFilter(value);
                  if (value !== "all") {
                    setShowSiteSelectionWarning(false);
                  }
                }}
              >
                <SelectTrigger style={{
                  width: isCompact ? "100%" : (isNarrowDesktop ? 170 : 186),
                  minWidth: 0, borderRadius: 100, fontFamily: POPPINS,
                  fontSize: controlFontSize,
                  border: "1px solid #e2e5ea", background: "#fff",
                  height: controlHeight,
                  padding: "0 10px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <SelectValue placeholder="All Sites" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent style={{ fontFamily: POPPINS }}>
                  <SelectItem value="all">All Sites</SelectItem>
                  {siteOptions.map((site) => (
                    <SelectItem key={site.siteKey} value={site.siteName}>{site.siteName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-upload-input"
              disabled={isUploadingCSV || needsSiteSelection}
            />
            <Label
              htmlFor={needsSiteSelection ? undefined : "csv-upload-input"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: isNarrowDesktop ? "0 12px" : "0 16px", height: controlHeight, borderRadius: 100,
                border: "1px solid #e2e5ea",
                background: "#fff", cursor: needsSiteSelection ? "not-allowed" : "pointer", fontSize: controlFontSize,
                fontFamily: POPPINS, fontWeight: 500, color: "#374151",
                margin: 0, flexShrink: 0,
                ...(isCompact ? { padding: "0 10px", flex: "1 1 calc(50% - 6px)" } : {}),
                opacity: needsSiteSelection ? 0.6 : 1,
              }}
              onClick={(event) => {
                if (needsSiteSelection) {
                  event.preventDefault();
                  setShowSiteSelectionWarning(true);
                }
              }}
            >
              <Upload size={14} />
              {isCompact ? "Import CSV" : (isUploadingCSV ? "Wait..." : "Import CSV")}
            </Label>
            <button
              onClick={() => {
                setIsAddDialogOpen(true);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: isNarrowDesktop ? "0 12px" : "0 16px", height: controlHeight, borderRadius: 100,
                border: "none", flexShrink: 0,
                background: "#357D86", cursor: "pointer", fontSize: controlFontSize,
                fontFamily: POPPINS, fontWeight: 500, color: "#fff",
                ...(isCompact ? { padding: "0 10px", flex: "1 1 calc(50% - 6px)" } : {}),
              }}
            >
              <Plus size={15} />
              {isCompact ? "Add" : "Add Recipient"}
            </button>
          </div>
        </div>

        {needsSiteSelection && showSiteSelectionWarning && (
          <div style={{
            marginBottom: sectionSpacing,
            padding: isNarrowDesktop ? "10px 12px" : "12px 14px",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#b91c1c",
            fontFamily: POPPINS,
            fontSize: isNarrowDesktop ? 12 : 13,
            fontWeight: 500,
          }}>
            Please select a site in the site filter before using Import CSV.
          </div>
        )}

        {/* Stat Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isCompact ? 12 : 16,
          marginBottom: sectionSpacing,
          animation: animate ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
        }}>
          {[
            { label: "Total Recipients", value: residentGroups.length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#367981" }} />, color: "#367981", bg: "#e9f2f3" },
            { label: "Residents", value: residentGroups.filter((group) => group.roles.includes("resident")).length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#4478f6" }} />, color: "#4478f6", bg: "#ebf2ff" },
            { label: "BHW", value: residentGroups.filter((group) => group.roles.includes("bhw")).length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#2cc865" }} />, color: "#2cc865", bg: "#eafff1" },
            { label: "Municipal Health Officer", value: residentGroups.filter((group) => group.roles.includes("municipal_health_officer")).length, icon: <Users style={{ width: isNarrowDesktop ? 18 : 22, height: isNarrowDesktop ? 18 : 22, color: "#a559ea" }} />, color: "#a559ea", bg: "#f6eeff" },
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
          borderRadius: 28,
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
              padding: isMobile ? "12px 14px" : (isNarrowDesktop ? "12px 16px 10px" : "14px 20px 12px"),
              minHeight: isMobile ? undefined : (isNarrowDesktop ? 62 : 66),
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
                  fontSize: isNarrowDesktop ? 12 : 13,
                  fontWeight: 700,
                  color: "#1a2a3a",
                  margin: 0,
                  fontFamily: POPPINS,
                  lineHeight: 1.2,
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
              overflow: "hidden",
              padding: "0 20px 20px",
              background: "#fff",
            }}>
              {loading ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "#7b8a9a", fontFamily: POPPINS }}>Loading recipients...</div>
              ) : filteredResidentGroups.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <Users style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No recipients found</h3>
                  <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>
                    {residentGroups.length === 0 ? "Try adding a new recipient" : "Try adjusting your search criteria"}
                  </p>
                </div>
              ) : (
                /* Desktop Table */
                <>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: POPPINS, tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "32%" }} />
                      <col style={{ width: "30%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "16%" }} />
                    </colgroup>
                    <thead style={{ background: "#fff" }}>
                      <tr style={{ borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
                        {["Name", "Phone Number", "Role Details", "Actions"].map((h) => (
                          <th key={h} style={{
                            padding: h === "Name" ? "14px 10px 14px 12px" : h === "Actions" ? "14px 12px 14px 10px" : "14px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#7b8a9a",
                            textAlign: h === "Actions" ? "right" : (h === "Name" || h === "Phone Number") ? "left" : "center",
                            background: "#fff",
                            fontFamily: POPPINS,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                  </table>

                  <div className="sg-ts-scroll" style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "100%", scrollbarWidth: "thin", msOverflowStyle: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: POPPINS, tableLayout: "fixed" }}>
                      <colgroup>
                        <col style={{ width: "32%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "16%" }} />
                      </colgroup>
                      <tbody>
                        {filteredResidentGroups.map((residentGroup, idx) => {
                          const detailPills = uniqueStrings(
                            residentGroup.records.flatMap((resident) =>
                              getResidentDetailPills(resident).map((pill) => JSON.stringify(pill))
                            )
                          ).map((pill) => JSON.parse(pill) as { label: string; background: string; color: string });

                          return (
                          <tr key={residentGroup.key} style={{
                            borderBottom: "1px solid #f5f5f5",
                            animation: `cardDataFadeIn 0.8s cubic-bezier(.22,1,.36,1) ${0.35 + idx * 0.04}s both`,
                          }}>
                            <td style={{ padding: "14px 10px 14px 12px", fontSize: 13, fontWeight: 600, color: "#1a2a3a" }}>
                              <span>{residentGroup.displayName}</span>
                            </td>
                            <td style={{ padding: "14px 10px", fontSize: 13, color: "#475569", fontWeight: 600 }}>
                              {residentGroup.phone}
                            </td>
                            <td style={{ padding: "14px 10px", textAlign: "center" }}>
                              <div style={{ display: "flex", justifyContent: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, maxWidth: "100%" }}>
                                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: "100%" }}>
                                    {residentGroup.roles.map((role) => (
                                      <span
                                        key={`${residentGroup.key}-${role}`}
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          padding: "3px 12px",
                                          borderRadius: 20,
                                          background: roleStyles[role].background,
                                          color: roleStyles[role].color,
                                          fontFamily: POPPINS,
                                        }}
                                      >
                                        {roleLabels[role]}
                                      </span>
                                    ))}
                                    {detailPills.map((pill) => (
                                        <span
                                          key={`${residentGroup.key}-${pill.label}`}
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: "3px 12px",
                                            borderRadius: 20,
                                            background: pill.background,
                                            color: pill.color,
                                            fontFamily: POPPINS,
                                          }}
                                        >
                                          {pill.label}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "14px 12px 14px 10px", textAlign: "right" }}>
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
                                    <DropdownMenuItem onClick={() => openEditDialog(residentGroup.primaryResident)} className="cursor-pointer">
                                      <Edit size={14} className="mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteDialog(residentGroup.primaryResident)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                      <Trash2 size={14} className="mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </>
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
              {filteredResidentGroups.map((residentGroup, idx) => {
                const detailPills = uniqueStrings(
                  residentGroup.records.flatMap((resident) =>
                    getResidentDetailPills(resident).map((pill) => JSON.stringify(pill))
                  )
                ).map((pill) => JSON.parse(pill) as { label: string; background: string; color: string });

                return (
                <div key={residentGroup.key} style={{
                  padding: "12px 20px",
                  borderBottom: idx < filteredResidentGroups.length - 1 ? "1px solid #f0f0f0" : "none",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a2a3a", fontFamily: POPPINS }}>{residentGroup.displayName}</span>
                      <span style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>{residentGroup.phone}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {residentGroup.roles.map((role) => (
                      <span
                        key={`${residentGroup.key}-${role}`}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: roleStyles[role].background,
                          color: roleStyles[role].color,
                          fontFamily: POPPINS,
                        }}
                      >
                        {roleLabels[role]}
                      </span>
                    ))}
                    {detailPills.map((pill) => (
                        <span
                          key={`${residentGroup.key}-mobile-${pill.label}`}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: pill.background,
                            color: pill.color,
                            fontFamily: POPPINS,
                          }}
                        >
                          {pill.label}
                        </span>
                      ))}
                  </div>
                </div>
              )})}
              {filteredResidentGroups.length === 0 && (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <Users style={{ width: 48, height: 48, color: "#d1d9e0", margin: "0 auto 16px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a2a3a", marginBottom: 6, fontFamily: POPPINS }}>No recipients found</h3>
                  <p style={{ fontSize: 13, color: "#7b8a9a", fontFamily: POPPINS }}>
                    {residentGroups.length === 0 ? "Try adding a new recipient" : "Try adjusting your search criteria"}
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
            borderRadius: smallLaptopModal ? 20 : 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
            maxHeight: smallLaptopModal ? "95vh" : undefined,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: smallLaptopModal ? "14px 18px" : "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: smallLaptopModal ? 15 : 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Add Alert Recipient
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                style={{
                  width: smallLaptopModal ? 30 : 32,
                  height: smallLaptopModal ? 30 : 32,
                  minWidth: smallLaptopModal ? 30 : 32,
                  minHeight: smallLaptopModal ? 30 : 32,
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
                <X size={smallLaptopModal ? 16 : 18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: smallLaptopModal ? "8px 16px 16px" : "10px 20px 20px", overflowY: smallLaptopModal ? "visible" : "auto", maxHeight: smallLaptopModal ? "none" : "80vh" }}>
            {error && (
              <div style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #fca5a5",
                background: "#fef2f2",
                color: "#b91c1c",
                fontFamily: POPPINS,
                fontSize: smallLaptopModal ? 11.5 : 12.5,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Name</Label>
                <Input
                  id="name-add"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Maria Santos"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
                />
              </div>
              <div>
                <Label htmlFor="phone-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Phone Number</Label>
                <Input
                  id="phone-add"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: normalizePhilippinePhoneInput(e.target.value) }))
                  }
                  placeholder="e.g., +639171234567"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
                />
                <p style={{ fontSize: smallLaptopModal ? 10.5 : 11, color: "#7b8a9a", marginTop: 6, fontFamily: POPPINS }}>
                  Format: +639XXXXXXXXX / 09XXXXXXXXX
                </p>
                {phoneValidationMessage && (
                  <p style={{ fontSize: smallLaptopModal ? 10.5 : 11, color: "#b91c1c", marginTop: 6, fontFamily: POPPINS, fontWeight: 500 }}>
                    {phoneValidationMessage}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role-add" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Designation</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger id="role-add" style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ fontFamily: POPPINS }}>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                    <SelectItem value="municipal_health_officer">Municipal Health Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ResidentRoleDetailFields
                role={formData.role}
                formData={formData}
                onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
                smallLaptopModal={smallLaptopModal}
                fieldPrefix="add"
              />
            </div>

            <div style={{ marginTop: smallLaptopModal ? 16 : 24, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleAddResident}
                disabled={!!phoneValidationMessage || isAddingResident}
                style={{
                  backgroundColor: "#357D86",
                  color: "#fff",
                  borderRadius: 100,
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
                  flex: 1,
                  opacity: phoneValidationMessage || isAddingResident ? 0.7 : 1,
                  cursor: phoneValidationMessage || isAddingResident ? "not-allowed" : "pointer",
                }}
              >
                {isAddingResident ? "Saving..." : "Add Recipient"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                style={{
                  borderRadius: 100,
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
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
            borderRadius: smallLaptopModal ? 20 : 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
            maxHeight: smallLaptopModal ? "95vh" : undefined,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: smallLaptopModal ? "14px 18px" : "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: smallLaptopModal ? 15 : 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Edit Alert Recipient
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                style={{
                  width: smallLaptopModal ? 30 : 32,
                  height: smallLaptopModal ? 30 : 32,
                  minWidth: smallLaptopModal ? 30 : 32,
                  minHeight: smallLaptopModal ? 30 : 32,
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
                <X size={smallLaptopModal ? 16 : 18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: smallLaptopModal ? "8px 16px 16px" : "10px 20px 20px", overflowY: smallLaptopModal ? "visible" : "auto", maxHeight: smallLaptopModal ? "none" : "80vh" }}>
            {error && (
              <div style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #fca5a5",
                background: "#fef2f2",
                color: "#b91c1c",
                fontFamily: POPPINS,
                fontSize: smallLaptopModal ? 11.5 : 12.5,
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Name</Label>
                <Input
                  id="name-edit"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Maria Santos"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
                />
              </div>
              <div>
                <Label htmlFor="phone-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Phone Number</Label>
                <Input
                  id="phone-edit"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: normalizePhilippinePhoneInput(e.target.value) }))
                  }
                  placeholder="e.g., +639171234567"
                  style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}
                />
                <p style={{ fontSize: smallLaptopModal ? 10.5 : 11, color: "#7b8a9a", marginTop: 6, fontFamily: POPPINS }}>
                  Format: +639XXXXXXXXX
                </p>
                {phoneValidationMessage && (
                  <p style={{ fontSize: smallLaptopModal ? 10.5 : 11, color: "#b91c1c", marginTop: 6, fontFamily: POPPINS, fontWeight: 500 }}>
                    {phoneValidationMessage}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="role-edit" style={{ fontFamily: POPPINS, fontWeight: 600, fontSize: smallLaptopModal ? 12 : 13, marginBottom: 8, display: "block" }}>Designation</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger id="role-edit" style={{ borderRadius: 100, border: "1px solid #e2e5ea", fontFamily: POPPINS, height: smallLaptopModal ? 44 : undefined, fontSize: smallLaptopModal ? 13 : undefined }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ fontFamily: POPPINS }}>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                    <SelectItem value="municipal_health_officer">Municipal Health Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ResidentRoleDetailFields
                role={formData.role}
                formData={formData}
                onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
                smallLaptopModal={smallLaptopModal}
                fieldPrefix="edit"
              />
            </div>

            <div style={{ marginTop: smallLaptopModal ? 16 : 24, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleEditResident}
                disabled={!!phoneValidationMessage}
                style={{
                  backgroundColor: "#357D86",
                  color: "#fff",
                  borderRadius: 100,
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
                  flex: 1,
                  opacity: phoneValidationMessage ? 0.7 : 1,
                  cursor: phoneValidationMessage ? "not-allowed" : "pointer",
                }}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                style={{
                  borderRadius: 100,
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
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
            borderRadius: smallLaptopModal ? 20 : 24,
            padding: 0,
            overflow: "hidden",
            border: "none",
            fontFamily: POPPINS,
            maxHeight: smallLaptopModal ? "95vh" : undefined,
          }}
          className="p-0"
        >
          {/* Modal Header */}
          <div style={{
            padding: smallLaptopModal ? "14px 18px" : "16px 20px",
            borderBottom: "1px solid #eef0f2",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: smallLaptopModal ? 15 : 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
              Delete Alert Recipient?
            </h2>
            <DialogClose asChild>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                style={{
                  width: smallLaptopModal ? 30 : 32,
                  height: smallLaptopModal ? 30 : 32,
                  minWidth: smallLaptopModal ? 30 : 32,
                  minHeight: smallLaptopModal ? 30 : 32,
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
                <X size={smallLaptopModal ? 16 : 18} />
              </button>
            </DialogClose>
          </div>

          <div style={{ padding: smallLaptopModal ? "16px" : "20px", display: "flex", flexDirection: "column", gap: smallLaptopModal ? 12 : 16 }}>
            <p style={{ fontSize: smallLaptopModal ? 13 : 14, color: "#64748b", lineHeight: "1.5", fontFamily: POPPINS }}>
              This will remove <span style={{ fontWeight: 700, color: "#1a2a3a" }}>{selectedResident?.name}</span> from the alert list. This action cannot be undone.
            </p>

            <div style={{ marginTop: 8, display: "flex", flexDirection: isMobile ? "column" : "row-reverse", gap: 12 }}>
              <Button
                onClick={handleDeleteResident}
                style={{
                  backgroundColor: "#eb5757",
                  color: "#fff",
                  borderRadius: 12,
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
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
                  height: smallLaptopModal ? 40 : 42,
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: smallLaptopModal ? 13 : undefined,
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
                borderRadius: smallLaptopModal ? 20 : 24,
                padding: 0,
                overflow: "hidden",
                border: "none",
                fontFamily: POPPINS,
                maxHeight: smallLaptopModal ? "95vh" : undefined,
              }}
              className="p-0"
            >
              {/* Modal Header */}
              <div style={{
                padding: smallLaptopModal ? "14px 18px" : "16px 20px",
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
                  <h2 style={{ fontSize: smallLaptopModal ? 15 : 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                    {uploadResult.success ? "Upload Successful" : "Upload Failed"}
                  </h2>
                </div>
                <DialogClose asChild>
                  <button
                    onClick={() => setUploadResultOpen(false)}
                    style={{
                      width: smallLaptopModal ? 30 : 32,
                      height: smallLaptopModal ? 30 : 32,
                      minWidth: smallLaptopModal ? 30 : 32,
                      minHeight: smallLaptopModal ? 30 : 32,
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
                      <X size={smallLaptopModal ? 16 : 18} />
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
