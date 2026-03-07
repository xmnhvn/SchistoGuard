import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiPost, apiGet, apiCall } from "../utils/api";
import { Trash2 } from "lucide-react";

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
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "bhw",
    organization: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");

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

  return (
    <div className="min-h-screen bg-schistoguard-light-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Create Account Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create User Account</CardTitle>
              <p className="text-sm text-muted-foreground">Add new users to the system.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger id="designation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                      <SelectItem value="lgu">LGU Officer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={formData.organization}
                    onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
                {success && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

                <Button type="submit" className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Right Column - User List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing User Accounts</CardTitle>
              <p className="text-sm text-muted-foreground">
                {users.length} user{users.length !== 1 ? "s" : ""} registered
              </p>
            </CardHeader>
            <CardContent>
              {usersError && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {usersError}
                </div>
              )}

              {loadingUsers ? (
                <p className="text-center text-gray-500 py-8">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No users found</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-schistoguard-navy">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{getRoleDisplay(user.role)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
