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

export function AppSidebar({ currentView, onNavigate, onLogout, user, onToggleDrawer, drawerOpen }: NavigationProps & { onLogout?: () => void; onToggleDrawer?: () => void; drawerOpen?: boolean }) {
  const expanded = !!drawerOpen;
  return (
    <aside
      style={{
        position: "fixed",
        top: 76,
        left: 0,
        bottom: 0,
        width: expanded ? 260 : 80,
        background: "#fff",
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        paddingTop: 18,
        paddingBottom: 16,
        gap: 4,
        zIndex: 50,
        overflowY: "hidden",
        overflowX: "hidden",
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, padding: "0 10px" }}>
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              title={item.title}
              onClick={() => onNavigate?.(item.view)}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 14,
                padding: "0 0 0 19px",
                background: isActive
                  ? "linear-gradient(135deg, #357D86, #026366)"
                  : "transparent",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.25s",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  background: isActive ? "#fff" : "#ABABAB",
                  WebkitMaskImage: `url('${item.iconSrc}')`,
                  maskImage: `url('${item.iconSrc}')`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  transition: "background 0.25s",
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fff" : "#6b7280",
                  fontFamily: "Poppins, sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 180 : 0,
                  transition: "opacity 0.25s cubic-bezier(0.4,0,0.2,1), max-width 0.3s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
      {/* User info — only when expanded */}
      {user && (
        <div style={{
          padding: "16px 22px",
          borderTop: "1px solid #f0f0f0",
          overflow: "hidden",
          clipPath: expanded ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: "clip-path 0.7s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1a3a4a", fontFamily: "Poppins, sans-serif", whiteSpace: "nowrap" }}>
            {user.firstName} {user.lastName}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9ca3af", fontFamily: "Poppins, sans-serif", whiteSpace: "nowrap" }}>
            {user.role === 'bhw' ? 'Barangay Health Worker' : user.role === 'lgu' ? 'Local Government Unit Personnel' : user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
      )}
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
  onToggleDrawer,
}: {
  currentView?: string;
  onNavigateToAlerts?: () => void;
  systemStatus?: "operational" | "down";
  user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
  onToggleDrawer?: () => void;
}) {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Load profile photo from localStorage and listen for changes
  useEffect(() => {
    const saved = localStorage.getItem("sg_profilePhoto");
    if (saved) setProfilePhoto(saved);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setProfilePhoto(detail?.photo || null);
    };
    window.addEventListener("profilePhotoChanged", handler);
    return () => window.removeEventListener("profilePhotoChanged", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsAlertsOpen(detail?.open ?? false);
    };
    window.addEventListener("alertsDropdownStateChanged", handler);
    return () => window.removeEventListener("alertsDropdownStateChanged", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setUnreadCount(detail?.count ?? 0);
    };
    window.addEventListener("alertsUnreadCount", handler);
    return () => window.removeEventListener("alertsUnreadCount", handler);
  }, []);
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
      case "user-profile": return { title: "My Profile", subtitle: "Manage your account information" };
      default: return { title: "Dashboard", subtitle: "Water Quality Monitoring Overview" };
    }
  };

  const pageInfo = getPageTitle(currentView);

  const [isPhone, setIsPhone] = useState(false);
  const [isNarrowTablet, setIsNarrowTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsPhone(w < 600);
      setIsNarrowTablet(w >= 600 && w < 900);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "U";



  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e8e8e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px 0 0",
        height: 76,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
      }}
    >
      {/* Left slot */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {isPhone ? (
          /* Phone: hamburger + SchistoGuard logo */
          <>
            <button
              onClick={onToggleDrawer}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 60, height: 76, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{
                width: 20, height: 20,
                background: "linear-gradient(to bottom, #357D86, #036366)",
                WebkitMaskImage: "url('/icons/icon-nav-menu.svg')",
                maskImage: "url('/icons/icon-nav-menu.svg')",
                WebkitMaskSize: "contain", maskSize: "contain",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                WebkitMaskPosition: "center", maskPosition: "center",
              }} />
            </button>
            <button onClick={() => onNavigate?.("dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <img src="/schistoguard.png" alt="SchistoGuard" style={{ width: 26, height: 26, objectFit: "contain" }} />
              <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 17, color: "#357D86" }}>SchistoGuard</span>
            </button>
          </>
        ) : (
          /* Tablet / Desktop: hamburger separate from page title */
          <>
            <button
              onClick={onToggleDrawer}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 80, height: 76, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 0,
              }}
            >
              <div style={{
                width: 20, height: 20,
                background: "linear-gradient(to bottom, #357D86, #036366)",
                WebkitMaskImage: "url('/icons/icon-nav-menu.svg')",
                maskImage: "url('/icons/icon-nav-menu.svg')",
                WebkitMaskSize: "contain", maskSize: "contain",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                WebkitMaskPosition: "center", maskPosition: "center",
              }} />
            </button>
            {!isNarrowTablet && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 4 }}>
                <span style={{ fontWeight: 600, color: "#1a3a4a", fontSize: 15, lineHeight: 1.2, fontFamily: "Poppins, sans-serif" }}>{pageInfo.title}</span>
                <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.2, fontFamily: "Poppins, sans-serif" }}>{pageInfo.subtitle}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Center logo — clickable, navigates to dashboard */}
      {!isPhone && (
        <button
          onClick={() => onNavigate?.("dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 8, position: "absolute", left: "50%", transform: "translateX(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <img src="/schistoguard.png" alt="SchistoGuard" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 18, color: "#357D86" }}>
            SchistoGuard
          </span>
        </button>
      )}

      {/* Right: bell + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          data-alerts-bell="true"
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
          <div style={{ position: "relative", width: 22, height: 22 }}>
            <div
              title="Alerts"
              style={{
                width: 22, height: 22,
                background: isAlertsOpen
                  ? "linear-gradient(to bottom, #357D86, #036366)"
                  : "#9ca3af",
                WebkitMaskImage: "url('/icons/icon-nav-alertstream.svg')",
                maskImage: "url('/icons/icon-nav-alertstream.svg')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: 0, right: 0,
                width: 8, height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                border: "1.5px solid #fff",
                display: "block",
              }} />
            )}
          </div>
        </button>

        <DropdownMenu onOpenChange={(open) => {
          if (open) {
            window.dispatchEvent(new CustomEvent("sg_closeAlerts"));
          }
        }}>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: profilePhoto ? "transparent" : "#357D86",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                overflow: "hidden",
                padding: 0,
              }}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={27}
            alignOffset={12}
            className="w-56 p-2"
            style={{
              borderRadius: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              border: "1px solid #e8e8e8",
              background: "#fff",
            }}
          >
            <DropdownMenuItem
              onClick={() => onNavigate?.("user-profile")}
              style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}
            >
              <User className="w-4 h-4 mr-3" style={{ color: "#6b7280" }} />
              <span style={{ fontWeight: 500, color: "#1a3a4a" }}>User Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onNavigate?.("admin-settings")}
              style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}
            >
              <Settings className="w-4 h-4 mr-3" style={{ color: "#6b7280" }} />
              <span style={{ fontWeight: 500, color: "#1a3a4a" }}>Admin Settings</span>
            </DropdownMenuItem>
            <div style={{ height: 1, background: "#f0f0f0", margin: "4px 8px" }} />
            <DropdownMenuItem
              className="text-red-600"
              onClick={onLogout}
              style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span style={{ fontWeight: 500 }}>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

const POPPINS_NAV = "Poppins, sans-serif";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const check = () => setIsPhone(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close drawer only on phone when navigating; tablet/desktop stays open
  const handleNavigate = (view: string) => {
    if (isPhone) setDrawerOpen(false);
    onNavigate?.(view);
  };

  // Mobile overlay drawer (phone only) — always rendered, animated via transform
  const mobileDrawer = isPhone ? (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 90,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
      {/* Drawer panel */}
      <aside
        style={{
          position: "fixed",
          top: 76, left: 0, bottom: 0,
          width: 260,
          background: "#fff",
          borderRight: "1px solid #e8e8e8",
          display: "flex",
          flexDirection: "column",
          fontFamily: POPPINS_NAV,
          zIndex: 95,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 10px 10px", display: "flex", flexDirection: "column", gap: 6, scrollbarWidth: "none" } as React.CSSProperties}>
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  height: 44, padding: "0 12px 0 22px", borderRadius: 8,
                  background: isActive ? "#357D86" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  flexShrink: 0, transition: "background 0.15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, flexShrink: 0,
                  background: isActive ? "#fff" : "#ABABAB",
                  WebkitMaskImage: `url('${item.iconSrc}')`,
                  maskImage: `url('${item.iconSrc}')`,
                  WebkitMaskSize: "contain", maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center", maskPosition: "center",
                }} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? "#fff" : "#6b7280", fontFamily: POPPINS_NAV }}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
        {user && (
          <div style={{ padding: "16px 22px", borderTop: "1px solid #f0f0f0" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1a3a4a", fontFamily: POPPINS_NAV }}>{user.firstName} {user.lastName}</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9ca3af", fontFamily: POPPINS_NAV }}>{user.role === 'bhw' ? 'Barangay Health Worker' : user.role === 'lgu' ? 'Local Government Unit Personnel' : user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
          </div>
        )}
      </aside>
    </>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f5f7fa", overflow: "hidden" }}>
      {/* Fixed nav bar — always on top */}
      <NavigationHeader
        currentView={currentView}
        onNavigateToAlerts={() => handleNavigate("alerts")}
        systemStatus={systemStatus}
        user={user}
        onLogout={onLogout}
        onNavigate={handleNavigate}
        onToggleDrawer={() => {
          setDrawerOpen((p) => {
            const next = !p;
            window.dispatchEvent(new CustomEvent("sidebarDrawerChanged", { detail: { open: next } }));
            return next;
          });
        }}
      />
      {/* Mobile overlay drawer */}
      {mobileDrawer}
      {/* Desktop/tablet: single expanding sidebar */}
      {!isPhone && (
        <AppSidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          user={user}
          onToggleDrawer={() => setDrawerOpen((p) => !p)}
          drawerOpen={drawerOpen}
        />
      )}
      {/* Main content — full width on phone, offset by sidebar on tablet/desktop */}
      <main
        style={{
          position: "fixed",
          top: 76,
          left: isPhone ? 0 : (drawerOpen ? 260 : 80),
          right: 0,
          bottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {children}
      </main>
    </div>
  );
}