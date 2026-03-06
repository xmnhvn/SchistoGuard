import {
  Home,
  Bell,
  MapPin,
  Info,
  FileText,
  LogOut,
  Settings,
  Users,
  AlignJustify,
  User
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent } from "./ui/dialog";
import { UserProfileDetails } from "./UserProfileDetails";
import React, { useState, useEffect } from "react";
import { apiCall } from "../utils/api";

interface NavigationProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
}

const navItems = [
  { title: "Dashboard", iconSrc: "/icons/icon-nav-home.svg", view: "dashboard" },
  { title: "Alerts", iconSrc: "/icons/icon-nav-alerts.svg", view: "alerts" },
  { title: "Sites", iconSrc: "/icons/icon-nav-sites.svg", view: "sites" },
  { title: "Site Details", iconSrc: "/icons/icon-nav-sitedetails.svg", view: "site-details" },
  { title: "Recipients", iconSrc: "/icons/icon-nav-recipients.svg", view: "recipients" },
  { title: "Reports", iconSrc: "/icons/icon-nav-reports.svg", view: "reports" },
];

export function AppSidebar({ currentView, onNavigate, onLogout, user }: NavigationProps & { onLogout?: () => void }) {
  return (
    <aside
      style={{
        width: 64,
        minHeight: "100vh",
        background: "#fff",
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 16,
        gap: 4,
        zIndex: 50,
      }}
    >
      {/* Hamburger icon at top */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width:17,
            height: 24,
            background: "linear-gradient(to bottom, #357D86, #036366)",
            WebkitMaskImage: "url('/icons/icon-nav-menu.svg')",
            maskImage: "url('/icons/icon-nav-menu.svg')",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      </div>

      {/* Nav icons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              title={item.title}
              onClick={() => onNavigate?.(item.view)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {/* CSS mask-image renders SVG in chosen color/gradient */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  background: isActive
                    ? "linear-gradient(to bottom, #357D86, #036366)"
                    : "#ABABAB",
                  WebkitMaskImage: `url('${item.iconSrc}')`,
                  maskImage: `url('${item.iconSrc}')`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  transition: "background 0.2s",
                }}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function NavigationHeader({
  currentView,
  onNavigateToAlerts,
  systemStatus = "operational",
  user,
  onLogout,
  onNavigate,
}: {
  currentView?: string;
  onNavigateToAlerts?: () => void;
  systemStatus?: "operational" | "down";
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getPageTitle = (view?: string) => {
    switch (view) {
      case "dashboard": return { title: "Dashboard", subtitle: "Water Quality Monitoring Overview" };
      case "sites": return { title: "Sites Directory", subtitle: "Browse All Monitoring Stations" };
      case "alerts": return { title: "Alerts", subtitle: "Water Quality Notifications" };
      case "reports": return { title: "Reports", subtitle: "Water Quality Insights" };
      case "site-details": return { title: "Site Details", subtitle: "Detailed Site Information" };
      case "recipients": return { title: "Recipients", subtitle: "Manage alert recipients" };
      case "admin-settings": return { title: "Admin Settings", subtitle: "Create and manage user accounts" };
      default: return { title: "Dashboard", subtitle: "Water Quality Monitoring Overview" };
    }
  };

  const pageInfo = getPageTitle(currentView);

  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const check = () => setIsPhone(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "U";

  const handleDeleteUser = async () => {
    try {
      await apiCall(`/api/auth/users/${user?.id}`, { method: "DELETE" });
      setShowProfile(false);
      onLogout?.();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e8e8e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left slot */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isPhone ? (
          /* Phone: logo on left */
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/schistoguard.png" alt="SchistoGuard" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 17, color: "#357D86" }}>SchistoGuard</span>
          </div>
        ) : (
          /* Tablet / Desktop: page title only */
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontWeight: 600, color: "#1a3a4a", fontSize: 15, lineHeight: 1.2 }}>{pageInfo.title}</span>
            <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.2 }}>{pageInfo.subtitle}</span>
          </div>
        )}
      </div>

      {/* Center logo — tablet/desktop only, hidden on phone */}
      {!isPhone && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <img src="/schistoguard.png" alt="SchistoGuard" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 18, color: "#357D86" }}>
            SchistoGuard
          </span>
        </div>
      )}

      {/* Right: bell + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("openAlertsDropdown"))}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src="/icons/icon-nav-alertstream.svg" alt="Alerts" style={{ width: 22, height: 22, objectFit: "contain" }} />
        </button>

        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#357D86",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowProfile(true)}>
                <User className="w-4 h-4 mr-2" />
                User Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("admin-settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent>
            <UserProfileDetails user={user} onDelete={handleDeleteUser} />
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}

export function NavigationProvider({
  children,
  currentView,
  onNavigate,
  onLogout,
  systemStatus = "operational",
  user,
}: {
  children: React.ReactNode;
  currentView?: string;
  onNavigate?: (view: string) => void;
  onLogout?: () => void;
  systemStatus?: "operational" | "down";
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f7fa" }}>
      <AppSidebar
        currentView={currentView}
        onNavigate={onNavigate}
        onLogout={onLogout}
        user={user}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <NavigationHeader
          currentView={currentView}
          onNavigateToAlerts={() => onNavigate?.("alerts")}
          systemStatus={systemStatus}
          user={user}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}