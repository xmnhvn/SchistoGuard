import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Shield, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { apiPost } from "../utils/api";

interface LoginFormProps {
  onLogin?: (user: { id: number; email: string; firstName: string; lastName: string; role: string }) => void;
  onForgotPassword?: () => void;
  onCancel?: () => void;
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
  organization: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginForm({ onLogin, onForgotPassword, onCancel }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "bhw"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1728);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isNarrowDesktop = windowWidth < 1600;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiPost("/api/auth/login", formData);
      
      // Call parent callback on success with authenticated user info
      if (data?.user) {
        setIsExiting(true);
        setTimeout(() => {
          onLogin?.(data.user);
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      console.error("Login error:", err);
    } finally {
      if (!isExiting) setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onCancel) {
        onCancel();
      } else {
        window.location.replace('/');
      }
    }, 400);
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}`} 
      style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #357D86 100%)' }}
    >
      <Card 
        className={`w-full transition-all duration-500 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          maxWidth: isNarrowDesktop ? '340px' : '448px',
          minHeight: isNarrowDesktop ? '420px' : '540px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: isNarrowDesktop ? '12px' : '20px',
        }}
      >
        <CardHeader className={isNarrowDesktop ? "text-center pt-5 pb-1" : "text-center"}>
          <div className={`flex items-center justify-center gap-2 ${isNarrowDesktop ? 'mb-1' : 'mb-4'}`}>
            <img 
              src="/schistoguard.png" 
              alt="SchistoGuard Logo" 
              style={{ 
                width: isNarrowDesktop ? 28 : 48, 
                height: isNarrowDesktop ? 28 : 48, 
                objectFit: "contain" 
              }} 
            />
            <h1 
              style={{ 
                fontFamily: 'Poppins, sans-serif', 
                color: '#357D86', 
                fontWeight: 600,
                fontSize: isNarrowDesktop ? 16 : 24
              }}
            >
              SchistoGuard
            </h1>
          </div>
          <CardTitle style={{ fontSize: isNarrowDesktop ? 16 : 24 }}>Welcome Back</CardTitle>
          <p className="text-muted-foreground" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>
            Sign in to access your monitoring dashboard
          </p>
        </CardHeader>
        <CardContent className={isNarrowDesktop ? "px-5 pb-5 pt-1" : ""}>
          <form onSubmit={handleSubmit} className={isNarrowDesktop ? "space-y-2" : "space-y-4"}>
            <div className={isNarrowDesktop ? "space-y-2" : "space-y-4"}>
              <div className="space-y-1">
                <Label htmlFor="email" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-9"
                    style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-9 pr-9"
                    style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="role" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Designation</Label>
                <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                    <SelectItem value="lgu">LGU Officer</SelectItem>
                    <SelectItem value="admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleCancel}
                disabled={loading}
                style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-schistoguard-teal hover:bg-schistoguard-teal/90"
                disabled={loading}
                style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </div>
            
            <div className="text-center space-y-1 mt-1">
              <Button 
                type="button" 
                variant="link" 
                size="sm"
                onClick={onForgotPassword}
                className="h-auto p-0"
                style={{ fontSize: isNarrowDesktop ? 11 : 13 }}
              >
                Forgot your password?
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.5s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

export function SignupForm({ onSignup, onShowLogin }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupData>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "bhw",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    organization: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1728);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isNarrowDesktop = windowWidth < 1600;

  const isStrongPassword = (password: string) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return strongPasswordRegex.test(password);
  };

  const handleSwitchToLogin = () => {
    setIsExiting(true);
    setTimeout(() => {
      onShowLogin?.();
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/api/auth/signup", {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization
      });

      // Call parent callback on success
      setIsExiting(true);
      setTimeout(() => {
        onSignup?.(formData);
      }, 400);
    } catch (err: any) {
      setError(err.message || "Signup failed");
      console.error("Signup error:", err);
    } finally {
      if (!isExiting) setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}`} 
      style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #357D86 100%)' }}
    >
      <Card 
        className={`w-full transition-all duration-500 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          maxWidth: isNarrowDesktop ? '350px' : '448px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: isNarrowDesktop ? '12px' : '20px',
        }}
      >
        <CardHeader className={isNarrowDesktop ? "text-center pt-5 pb-1" : "text-center"}>
          <div className={`flex items-center justify-center gap-2 ${isNarrowDesktop ? 'mb-1' : 'mb-4'}`}>
            <img 
              src="/schistoguard.png" 
              alt="SchistoGuard Logo" 
              style={{ 
                width: isNarrowDesktop ? 28 : 48, 
                height: isNarrowDesktop ? 28 : 48, 
                objectFit: "contain" 
              }} 
            />
            <h1 
              style={{ 
                fontFamily: 'Poppins, sans-serif', 
                color: '#357D86', 
                fontWeight: 600,
                fontSize: isNarrowDesktop ? 16 : 24
              }}
            >
              SchistoGuard
            </h1>
          </div>
          <CardTitle style={{ fontSize: isNarrowDesktop ? 16 : 24 }}>Create Account</CardTitle>
          <p className="text-muted-foreground" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>
            Join the water quality monitoring network
          </p>
        </CardHeader>
        <CardContent className={isNarrowDesktop ? "px-5 pb-5 pt-1" : ""}>
          <form onSubmit={handleSubmit} className={isNarrowDesktop ? "space-y-2" : "space-y-4"}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Dela Cruz"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="email" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-9"
                  style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="role" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Designation</Label>
              <Select value={formData.role} onValueChange={(value: string) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                  <SelectItem value="lgu">LGU Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="organization" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Organization</Label>
              <Input
                id="organization"
                placeholder="Department of Health - Leyte"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                required
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="password" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-9 pr-9"
                  style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" style={{ fontSize: isNarrowDesktop ? 11 : 14 }}>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-9 pr-9"
                  style={{ height: isNarrowDesktop ? 32 : 40, fontSize: isNarrowDesktop ? 12 : 14 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
              disabled={loading}
              style={{ height: isNarrowDesktop ? 36 : 44, fontSize: isNarrowDesktop ? 12 : 15 }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            
            <div className="text-center mt-1">
              <div className="text-sm text-muted-foreground" style={{ fontSize: isNarrowDesktop ? 11 : 13 }}>
                Already have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  onClick={handleSwitchToLogin}
                  className="p-0 h-auto text-schistoguard-teal"
                  style={{ fontSize: isNarrowDesktop ? 11 : 13 }}
                >
                  Sign in here
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.5s ease-in forwards;
        }
      `}</style>
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
              <h3 className="font-medium text-yellow-700">Moderate Possible Risk Levels</h3>
              <p className="text-sm text-muted-foreground">
                Yellow alerts indicate parameters approaching unsafe levels. 
                Monitor closely and consider precautionary measures.
              </p>
            </div>
            
            <div className="border-l-4 border-l-red-500 pl-4">
              <h3 className="font-medium text-red-700">High Possible Risk Levels</h3>
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
                <br />High Possible Risk: &lt;5 NTU • Moderate Possible Risk: 5-15 NTU • Safe: &gt;15 NTU
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