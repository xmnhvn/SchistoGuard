import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "./ui/sidebar";
import { 
  Home, 
  Map, 
  AlertTriangle, 
  BarChart3, 
  Bell,
  LogOut,
  Shield,
  FileText,
  MapPin,
  CheckCircle,
  Info
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { UserProfileDetails } from "./UserProfileDetails";
import React, { useState } from "react";
import { User } from "lucide-react";

interface NavigationProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
}

const getNavigationItems = (currentView?: string, onNavigate?: (view: string) => void) => [
  {
    title: "Monitoring",
    items: [
      { 
        title: "Dashboard", 
        icon: Home, 
        view: "dashboard", 
        isActive: currentView === "dashboard",
        onClick: () => onNavigate?.("dashboard")
      },
      { 
        title: "Map View", 
        icon: Map, 
        view: "map", 
        isActive: currentView === "map",
        onClick: () => onNavigate?.("map")
      },
      { 
        title: "Sites Directory", 
        icon: MapPin, 
        view: "sites", 
        isActive: currentView === "sites",
        onClick: () => onNavigate?.("sites")
      },
      {
        title: "Site Details",
        icon: Info,
        view: "site-details",
        isActive: currentView === "site-details",
        onClick: () => onNavigate?.("site-details")
      },
    ],
  },
  {
    title: "Reports",
    items: [
      { 
        title: "Reports", 
        icon: FileText, 
        view: "reports", 
        isActive: currentView === "reports",
        onClick: () => onNavigate?.("reports")
      },
    ],
  },
];

export function AppSidebar({ currentView, onNavigate, onLogout }: NavigationProps & { onLogout?: () => void }) {
  const navigationItems = getNavigationItems(currentView, onNavigate);
  const [showProfile, setShowProfile] = useState(false);
  // Sidebar always open, not collapsible
  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="border-b bg-white">
        <div className="flex items-center gap-3 px-4 py-4 ">
          <img src="/schistoguard.png" alt="SchistoGuard Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl" style={{ fontFamily: 'Poppins, sans-serif', color: '#357D86', fontWeight: 600 }}>
            SchistoGuard
          </h1>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {navigationItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-base font-medium mb-2 mt-2">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      isActive={item.isActive}
                      className="data-[active=true]:bg-schistoguard-teal data-[active=true]:text-white cursor-pointer gap-3 px-4 py-6 text-md font-normal"
                      onClick={item.onClick}
                      data-active={item.isActive ? 'true' : undefined}
                    >
                      <item.icon className="w-7 h-7" />
                      <span className="text-md font-normal">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <div className="mt-auto p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-start gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">JD</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-xs">
                <span>Juan Dela Cruz</span>
                <span className="text-muted-foreground">LGU Officer</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowProfile(true)}>
              <User className="w-4 h-4 mr-2" />
              User Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
          <Popover open={showProfile} onOpenChange={setShowProfile}>
            <PopoverContent align="end" className="z-50">
              <UserProfileDetails />
            </PopoverContent>
          </Popover>
        </DropdownMenu>
      </div>
    </Sidebar>
  );
}

export function NavigationHeader({ currentView, onNavigateToAlerts, systemStatus = "operational" }: { 
  currentView?: string;
  onNavigateToAlerts?: () => void;
  systemStatus?: "operational" | "down";
}) {
  const getPageTitle = (view?: string) => {
    switch (view) {
      case 'dashboard': return { title: 'Dashboard', subtitle: 'Water Quality Monitoring Overview' };
      case 'map': return { title: 'Map View', subtitle: 'Real-time Site Locations' };
      case 'sites': return { title: 'Sites Directory', subtitle: 'Browse All Monitoring Stations' };
      case 'alerts': return { title: 'Alerts', subtitle: 'Water Quality Notifications' };
      case 'reports': return { title: 'Reports & Analytics', subtitle: 'Water Quality Insights' };
      case 'site-details': return { title: 'Site Details', subtitle: 'Detailed Site Information' };
      default: return { title: 'Dashboard', subtitle: 'Water Quality Monitoring Overview' };
    }
  };

  const pageInfo = getPageTitle(currentView);

  let statusBg = "bg-green-100";
  let statusText = "text-green-700";
  let dotColor = "bg-green-500";
  let label = "System Operational";
  if (systemStatus === "down") {
    statusBg = "bg-red-100";
    statusText = "text-red-700";
    dotColor = "bg-red-500";
    label = "System Down";
  }
  return (
    <header className="border-b bg-white px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6 px-4 py-1.5 min-h-[48px]">
        <div className="flex flex-col justify-center h-full">
          <h2 className="font-semibold text-schistoguard-navy leading-tight">{pageInfo.title}</h2>
          <p className="text-sm text-muted-foreground leading-tight">{pageInfo.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center px-4 py-1.5 rounded-full ${statusBg} ${statusText} text-sm font-medium`}>
          <span className={`w-2 h-2 rounded-full ${dotColor} inline-block mr-2`}></span>
          {label}
        </span>
      </div>
    </header>
  );
}

export function NavigationProvider({ 
  children, 
  currentView, 
  onNavigate, 
  onLogout, 
  systemStatus = "operational"
}: { 
  children: React.ReactNode;
  currentView?: string;
  onNavigate?: (view: string) => void;
  onLogout?: () => void;
  systemStatus?: "operational" | "down";
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-schistoguard-light-bg">
        <AppSidebar 
          currentView={currentView}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <NavigationHeader 
            currentView={currentView}
            onNavigateToAlerts={() => onNavigate?.('alerts')}
            systemStatus={systemStatus}
          />
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}