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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  CheckCircle,
  Circle,
  AlertCircle,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";

interface Resident {
  id: number;
  siteName: string;
  name: string;
  phone: string;
  role: "resident" | "bhw" | "lgu";
  verified: number;
  createdAt?: string;
}

interface ResidentsManagerProps {
  siteName?: string;
  refreshTrigger?: number;
}

export function ResidentsManager({ siteName = "All Sites", refreshTrigger = 0 }: ResidentsManagerProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  // Fetch residents
  useEffect(() => {
    fetchResidents();
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
      <style>{`
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column card - Recipients */}
        <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="w-[240px] min-w-[240px] max-w-[240px] shrink-0 flex items-center">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-[240px] min-w-[240px] max-w-[240px] text-center justify-center">
                    <SelectValue placeholder="All Designations" className="truncate overflow-hidden text-ellipsis max-w-[180px] text-center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    <SelectItem value="resident">Residents</SelectItem>
                    <SelectItem value="bhw">Barangay Health Workers (BHW)</SelectItem>
                    <SelectItem value="lgu">Local Government Units (LGU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-4 mt-[-4]">
              <p className="text-sm font-medium">Recipients List</p>
            </div>

            {loading ? (
              <p className="py-8 text-center text-gray-500">Loading recipients...</p>
            ) : filteredResidents.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                {residents.length === 0
                  ? "No recipients added yet"
                  : "No recipients match your search"}
              </p>
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {/* 4 x 80px card height + gap, adjust as needed */}
                {filteredResidents.map((resident) => (
                  <div
                    key={resident.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      {resident.verified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{resident.name}</p>
                        <p className="text-sm text-gray-600">{resident.phone}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[resident.role]}`}
                      >
                        {roleLabels[resident.role]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(resident)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(resident)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column card - Upload and Stats */}
        <Card className="flex min-h-[640px] flex-col">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <Upload className="w-4 h-4" />
                {isUploadingCSV ? "Uploading..." : "Upload CSV"}
              </Label>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-schistoguard-teal hover:bg-schistoguard-teal/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recipient
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-blue-600">{residents.length}</div>
                  <p className="text-xs text-muted-foreground">All designations combined</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium">Resident</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-cyan-600">
                    {residents.filter((r) => r.role === "resident").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Community members</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium">BHW</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-green-600">
                    {residents.filter((r) => r.role === "bhw").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Health workers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-sm font-medium">LGU</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {residents.filter((r) => r.role === "lgu").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Local government</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Alert Recipient</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name-add">Name</Label>
              <Input
                id="name-add"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Maria Santos"
              />
            </div>
            <div>
              <Label htmlFor="phone-add">Phone Number</Label>
              <Input
                id="phone-add"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="e.g., +639171234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: +639XXXXXXXXX / 09XXXXXXXXX
              </p>
            </div>
            <div>
              <Label htmlFor="role-add">Designation</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger id="role-add">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                  <SelectItem value="lgu">Local Government Unit (LGU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddResident}>
              Add Recipient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Alert Recipient</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name-edit">Name</Label>
              <Input
                id="name-edit"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Maria Santos"
              />
            </div>
            <div>
              <Label htmlFor="phone-edit">Phone Number</Label>
              <Input
                id="phone-edit"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="e.g., +639171234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: +639XXXXXXXXX
              </p>
            </div>
            <div>
              <Label htmlFor="role-edit">Designation</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger id="role-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="bhw">Barangay Health Worker (BHW)</SelectItem>
                  <SelectItem value="lgu">Local Government Unit (LGU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditResident}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert Recipient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedResident?.name} from the alert list. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-2 !flex-row !flex-nowrap">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResident}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        {/* Upload Result Modal */}
        {uploadResultOpen && uploadResult && (
          <AlertDialog open={uploadResultOpen} onOpenChange={setUploadResultOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 w-full">
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <AlertDialogTitle>
                    {uploadResult.success ? "Upload Successful" : "Upload Failed"}
                  </AlertDialogTitle>
                </div>
              </AlertDialogHeader>

              {uploadResult.success ? (
                <div className="space-y-3">
                  {uploadResult.inserted > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        <span className="font-bold">{uploadResult.inserted}</span> new recipients added
                      </p>
                    </div>
                  )}
                  {uploadResult.updated > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">{uploadResult.updated}</span> recipients updated
                      </p>
                    </div>
                  )}
                  {uploadResult.failed > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        <span className="font-bold">{uploadResult.failed}</span> recipients failed
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <AlertDialogDescription className="text-red-800 text-sm">
                      {uploadResult.error || "An error occurred during upload"}
                    </AlertDialogDescription>
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogAction className="bg-schistoguard-teal hover:bg-schistoguard-teal/90">
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      
    </>
  );
}
