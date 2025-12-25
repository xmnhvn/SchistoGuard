import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Shield, Mail, Lock, User, Phone, MapPin } from "lucide-react";
import { useState } from "react";

interface LoginFormProps {
  onLogin?: (credentials: { email: string; password: string; role: string }) => void;
  onShowSignup?: () => void;
  onForgotPassword?: () => void;
}

interface SignupFormProps {
  onSignup?: (data: SignupData) => void;
  onShowLogin?: () => void;
}

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  barangay?: string;
  organization?: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginForm({ onLogin, onShowSignup, onForgotPassword }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "resident"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin?.(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-schistoguard-teal to-schistoguard-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/schistoguard.png" alt="SchistoGuard Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl" style={{ fontFamily: 'Poppins, sans-serif', color: '#357D86', fontWeight: 600 }}>
              SchistoGuard
            </h1>
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your monitoring dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                  <SelectItem value="lgu">LGU Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
            >
              Sign In
            </Button>
            
            <div className="text-center space-y-2">
              <Button 
                type="button" 
                variant="link" 
                size="sm"
                onClick={onForgotPassword}
              >
                Forgot your password?
              </Button>
              <div className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  onClick={onShowSignup}
                  className="p-0 h-auto text-schistoguard-teal"
                >
                  Sign up here
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SignupForm({ onSignup, onShowLogin }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupData>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "resident",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    barangay: "",
    organization: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    onSignup?.(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-schistoguard-teal to-schistoguard-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/schistoguard.png" alt="SchistoGuard Logo" className="w-12 h-12 object-contain" />
            <h1 className="text-2xl" style={{ fontFamily: 'Poppins, sans-serif', color: '#357D86', fontWeight: 600 }}>
              SchistoGuard
            </h1>
          </div>
          <CardTitle>Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Join the water quality monitoring network
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Dela Cruz"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                  <SelectItem value="lgu">LGU Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.role === "resident" && (
              <div className="space-y-2">
                <Label htmlFor="barangay">Barangay</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Select onValueChange={(value: string) => setFormData(prev => ({ ...prev, barangay: value }))}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select your barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="san-miguel">Barangay San Miguel</SelectItem>
                      <SelectItem value="malinao">Barangay Malinao</SelectItem>
                      <SelectItem value="riverside">Barangay Riverside</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {(formData.role === "bhw" || formData.role === "lgu") && (
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="Department of Health - Leyte"
                  value={formData.organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
            >
              Create Account
            </Button>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  onClick={onShowLogin}
                  className="p-0 h-auto text-schistoguard-teal"
                >
                  Sign in here
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-schistoguard-teal" />
            Welcome to SchistoGuard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Your community water quality monitoring system is now active. 
              Here's what you need to know about our alert system.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="border-l-4 border-l-green-500 pl-4">
              <h3 className="font-medium text-green-700">Safe Levels</h3>
              <p className="text-sm text-muted-foreground">
                When water parameters are within safe ranges, you'll see green indicators. 
                No immediate action needed.
              </p>
            </div>
            
            <div className="border-l-4 border-l-yellow-500 pl-4">
              <h3 className="font-medium text-yellow-700">Warning Levels</h3>
              <p className="text-sm text-muted-foreground">
                Yellow alerts indicate parameters approaching unsafe levels. 
                Monitor closely and consider precautionary measures.
              </p>
            </div>
            
            <div className="border-l-4 border-l-red-500 pl-4">
              <h3 className="font-medium text-red-700">Critical Levels</h3>
              <p className="text-sm text-muted-foreground">
                Red alerts require immediate attention. Avoid water contact and 
                notify your Barangay Health Worker immediately.
              </p>
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current Monitoring Thresholds</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <strong>Turbidity (Water Clarity)</strong>
                <br />Safe: ≤5 NTU • Warning: 6-15 NTU • Critical: &gt;15 NTU
              </div>
              <div>
                <strong>Temperature</strong>
                <br />Normal range: 22-30°C
              </div>
              <div>
                <strong>pH Level</strong>
                <br />Normal range: 6.5-8.0
              </div>
              <div>
                <strong>UV Index</strong>
                <br />Low risk: &lt;3 • High risk: &gt;6
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">How Alerts Work</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Real-time monitoring sends alerts within 5 minutes of threshold breaches</li>
              <li>• Subscribe to SMS/email notifications for your area</li>
              <li>• Barangay Health Workers can acknowledge and provide guidance</li>
              <li>• Historical data helps track water quality trends over time</li>
            </ul>
          </div>
          
          <Button 
            onClick={onClose}
            className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
          >
            Get Started with SchistoGuard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}