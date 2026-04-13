import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Shield,
  Users,
  ArrowRight,
  Activity,
  ChevronLeft,
  LocateFixed,
  Download,
  Thermometer,
  Droplets,
  Info,
} from "lucide-react";
import { DashboardMap } from "../DashboardMap";
import type { DashboardMapHandle } from "../DashboardMap";
import {
  CTAButton,
  TrustBadge,
  AlertsQuickviewModal,
  SensorIcon,
} from "./LandingComponents";
import { PWAInstructionsModal } from "../PWAInstructionsModal";
import SensorMiniCard from "../SensorMiniCard";
import { apiGet } from "../../utils/api";
import { reverseGeocode } from "../../utils/reverseGeocode";

interface LandingPageProps {
  onViewMap?: () => void;
  onLearnMore?: () => void;
  onEnterApp?: () => void;
}

// Sensor status helper
function getSensorStatus(
  type: "temperature" | "turbidity" | "ph",
  value: number
): { label: string; color: string } {
  if (type === "temperature") {
    if (value >= 22 && value <= 30)
      return { label: "High Possible Risk", color: "#ef4444" };
    if ((value >= 20 && value < 22) || (value > 30 && value <= 35))
      return { label: "Moderate Possible Risk", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "turbidity") {
    if (value < 5) return { label: "Clear Water – Higher Schisto Risk", color: "#ef4444" };
    if (value <= 15) return { label: "Moderate Turbidity", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "ph") {
    if (value >= 6.5 && value <= 8.0) return { label: "High Possible Risk", color: "#ef4444" };
    if ((value >= 6.0 && value < 6.5) || (value > 8.0 && value <= 8.5))
      return { label: "Moderate Possible Risk", color: "#f59e0b" };
    return { label: "Safe", color: "#22c55e" };
  }
  return { label: "", color: "#9ca3af" };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onViewMap,
  onLearnMore,
  onEnterApp,
}) => {
  const [screenWidth, setScreenWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 1100 : false
  );
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);
  const [isMonitoringHovered, setIsMonitoringHovered] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [showLiveUpdates, setShowLiveUpdates] = useState(false);
  const [isExitingLiveUpdates, setIsExitingLiveUpdates] = useState(false);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [backendOk, setBackendOk] = useState(true);
  const [dataOk, setDataOk] = useState(true);
  const [deviceConnected, setDeviceConnected] = useState(true);
  const [siteData, setSiteData] = useState<any>(() => {
    try {
      if (typeof window !== "undefined") {
        const cachedName = localStorage.getItem('sg_global_latest_siteName');
        return {
          siteName: cachedName || "Matina Site",
          barangay: "Matina Crossing",
          municipality: "Davao City",
          area: "C. Enclabo St",
        };
      }
    } catch { }
    return {
      siteName: "Matina Site",
      barangay: "Matina Crossing",
      municipality: "Davao City",
      area: "C. Enclabo St",
    };
  });

  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  // PWA Detection and Installation tracking
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsPWAInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA was successfully installed');
      setIsPWAInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Also handle dynamic changes (e.g. if the user installs while browsing)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPWAInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  // Fetch device name from global config
  useEffect(() => {
    apiGet("/api/sensors/interval-config")
      .then((data: any) => {
        if (data && data.deviceName && data.deviceName !== "Site Name") {
          setSiteData((prev: any) => ({ ...prev, siteName: data.deviceName }));
        }
      })
      .catch(console.error);
  }, []);
  // Address from reverse geocoding (sync with dashboard)
  const [gpsAddress, setGpsAddress] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('sg_global_latest_address');
        if (cached) return cached;
      }
    } catch { }
    return null;
  });
  // Cache last lat/lng to avoid unnecessary API calls
  const lastLatLngRef = useRef<{ lat: number, lng: number } | null>(null);
  // Fallback logic for marker and address (sync with dashboard)
  const [gpsSites, setGpsSites] = useState<Array<{ id: string; name: string; lat: number; lng: number }> | undefined>(undefined);
  const [lastSavedLocation, setLastSavedLocation] = useState<{ lat: number; lng: number; siteName?: string; address?: string | null } | null>(null);

  const metaAddress = [siteData.area, siteData.barangay, siteData.municipality]
    .map((v: any) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(", ");

  const displayAddress =
    (typeof latestReading?.address === "string" && latestReading.address.trim() ? latestReading.address.trim() : null) ||
    gpsAddress ||
    (typeof lastSavedLocation?.address === "string" ? lastSavedLocation.address : null) ||
    metaAddress ||
    "Device Address";

  useEffect(() => {
    if (typeof latestReading?.address === 'string' && latestReading.address.trim()) {
      const resolved = latestReading.address.trim();
      setGpsAddress(resolved);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sg_global_latest_address', resolved);
      }
    }
  }, [latestReading?.address]);

  // Strictly follow real sensor device location (from GSM/GPS data)
  // Fallback to last known location in localStorage if sensor is not yet available
  useEffect(() => {
    let sites;
    let lastLoc;

    // 1. Prioritize real-time data from latestReading
    if (
      latestReading &&
      typeof latestReading.latitude === 'number' &&
      typeof latestReading.longitude === 'number' &&
      latestReading.latitude !== null &&
      latestReading.longitude !== null
    ) {
      sites = [{
        id: 'device-gps',
        name: siteData.siteName || 'Device Location',
        lat: latestReading.latitude,
        lng: latestReading.longitude,
      }];
      lastLoc = { lat: latestReading.latitude, lng: latestReading.longitude, siteName: siteData.siteName };

      // Persist to localStorage for immediate loading on next visit
      localStorage.setItem('lastGpsLocation', JSON.stringify(lastLoc));
      setGpsSites(sites);
      setLastSavedLocation(lastLoc);
    }
    // 2. Fallback to cached location if no live reading yet
    else {
      let cachedSet = false;
      if (typeof window !== "undefined") {
        const last = localStorage.getItem('lastGpsLocation');
        if (last) {
          try {
            const parsed = JSON.parse(last);
            if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
              sites = [{
                id: 'device-gps',
                name: parsed.siteName || 'Last Known Location',
                lat: parsed.lat,
                lng: parsed.lng,
              }];
              lastLoc = parsed;
              setGpsSites(sites);
              setLastSavedLocation(lastLoc);
              cachedSet = true;
            }
          } catch { }
        }
      }

      // 3. If no live/cached location, keep map marker empty to avoid fake location pins
      if (!cachedSet) {
        setGpsSites(undefined);
        setLastSavedLocation(null);
      }
    }
  }, [latestReading, siteData.siteName]);

  // Reverse geocode when GPS changes (sync with dashboard logic)
  useEffect(() => {
    if (gpsSites && gpsSites.length > 0) {
      const { lat, lng } = gpsSites[0];
      if (!lastLatLngRef.current || lastLatLngRef.current.lat !== lat || lastLatLngRef.current.lng !== lng) {
        lastLatLngRef.current = { lat, lng };
        setGpsAddress(null); // reset while loading
        reverseGeocode(lat, lng).then(addr => {
          setGpsAddress(addr);
          // Sync with dashboard global cache
          if (addr && addr !== "Unnamed Road" && addr !== "Device Address") {
            localStorage.setItem('sg_global_latest_address', addr);
          }
        });
      }
    } else {
      setGpsAddress(null);
      lastLatLngRef.current = null;
    }
  }, [gpsSites]);
  // Smart Discovery: If global cache is empty, hunt for any site-specific address in localStorage
  useEffect(() => {
    if (!gpsAddress && !latestReading && typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      const siteNameKey = keys.find(k => k.startsWith('sg_') && k.endsWith('_siteName'));
      if (siteNameKey && siteData.siteName === "Matina Site") {
        const cachedName = localStorage.getItem(siteNameKey);
        if (cachedName && cachedName !== "Site Name") {
          setSiteData((prev: any) => ({ ...prev, siteName: cachedName }));
          localStorage.setItem('sg_global_latest_siteName', cachedName);
        }
      }
    }
  }, [gpsAddress, latestReading, siteData.siteName]);

  const mapRef = useRef<DashboardMapHandle>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsMobileOrTablet(width < 1100);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lazy-mount map to reduce initial landing page jank
  React.useEffect(() => {
    if (showLiveUpdates) {
      setShouldRenderMap(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const run = () => setShouldRenderMap(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(run, 600);
    }

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showLiveUpdates]);

  // Fetch sensor data when live updates is shown
  useEffect(() => {
    const fetchLatest = () => {
      apiGet("/api/sensors/latest")
        .then((data) => {
          console.log('[LandingPage] /api/sensors/latest response:', data);
          if (data && data.deviceConnected === false) {
            console.log('[LandingPage] Device disconnected, checking for fallback coords:', { hasLat: typeof data.latitude === 'number', hasLng: typeof data.longitude === 'number', lat: data.latitude, lng: data.longitude });
            if (data.siteName && data.siteName !== "Site Name") setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              console.log('[LandingPage] Fallback coords found, setting gpsSites and lastSavedLocation');
              const fallbackLoc = {
                lat: data.latitude,
                lng: data.longitude,
                siteName: data.siteName || 'Last Known Location',
                address: data.address || null,
              };
              setLastSavedLocation(fallbackLoc);
              setGpsSites([
                {
                  id: 'device-gps',
                  name: fallbackLoc.siteName,
                  lat: fallbackLoc.lat,
                  lng: fallbackLoc.lng,
                },
              ]);
              localStorage.setItem('lastGpsLocation', JSON.stringify(fallbackLoc));
            } else {
              console.log('[LandingPage] NO fallback coords, clearing map');
            }
            setDeviceConnected(false);
            setLatestReading(null);
            setBackendOk(true);
            setDataOk(false);
            return;
          }
          console.log('[LandingPage] Device connected, setting latestReading');
          setLatestReading(data);
          setBackendOk(true);
          setDataOk(true);
          setDeviceConnected(true);
          if (data && data.siteName && data.siteName !== "Site Name") {
            setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
          }
        })
        .catch(() => {
          setBackendOk(false);
          setDataOk(false);
          setDeviceConnected(false);
        });
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 1000); // Match dashboard interval for real-time sync
    return () => clearInterval(interval);
  }, []);

  const handleLiveUpdatesClick = () => {
    setShowLiveUpdates(true);
    // Trigger resetView to animate to the new offset point
    setTimeout(() => {
      mapRef.current?.resize();
      mapRef.current?.resetView();
    }, 100);
  };

  // Removed manual pixel measurement (positionPin). 
  // DasboardMap handles the map offsets natively.

  const handleBackFromLiveUpdates = () => {
    setIsExitingLiveUpdates(true);

    // Animate map back to its natural centered position (0 offset)
    setTimeout(() => {
      mapRef.current?.resize();
      mapRef.current?.resetView();
    }, 50);

    // Hide component after all animations complete
    setTimeout(() => {
      setShowLiveUpdates(false);
      setIsExitingLiveUpdates(false);
    }, 600); // Slightly more than 0.5s to ensure completion
  };

  const getHeroFontSize = () => {
    if (screenWidth < 480) return '30px'; // Small mobile
    if (screenWidth < 768) return '40px'; // Large mobile
    if (screenWidth < 1024) return '55px'; // Tablet
    return '44px'; // Desktop (refined for better scaling)
  };

  const getHeroParagraphFontSize = () => {
    if (screenWidth < 480) return '14px'; // Small mobile
    if (screenWidth < 768) return '16px'; // Large mobile
    if (screenWidth < 1024) return '18px'; // Tablet
    return '17px'; // Desktop (refined)
  };

  // Sample data
  const sampleAlerts = [
    {
      id: "1",
      title: "High Possible Risk Turbidity Level",
      details: "Turbidity 18.2 NTU — Barangay San Miguel River",
      level: "critical" as const,
      timestamp: "2025-09-15 14:31",
    },
    {
      id: "2",
      title: "Temperature Moderate Possible Risk",
      details: "Water temp 32°C — Barangay Riverside",
      level: "warning" as const,
      timestamp: "2025-09-15 13:45",
    },
  ];

  const headlines = [
    "Protect your community from schistosomiasis with real-time water monitoring",
    "Early detection saves lives — Monitor water quality in your barangay",
    "Community safety starts with clean water — Track schistosomiasis risk together",
  ];

  // Upstream implementation uses state for gpsSites, procedural logic removed.

  const isPreviewActive = showLiveUpdates && !isExitingLiveUpdates;

  // ─── Risk Calculation Logic (Sync with Dashboard) ───────────────────────
  const getOverallRisk = () => {
    if (!latestReading) return "no-data";
    const temp = latestReading.temperature;
    const turbidity = latestReading.turbidity;
    const ph = latestReading.ph;

    let risks = [];
    if (temp >= 22 && temp <= 30) risks.push("critical");
    else if ((temp >= 20 && temp < 22) || (temp > 30 && temp <= 35)) risks.push("warning");

    if (turbidity < 5) risks.push("critical");
    else if (turbidity <= 15) risks.push("warning");

    if (ph >= 6.5 && ph <= 8.0) risks.push("critical");
    else if ((ph >= 6.0 && ph < 6.5) || (ph > 8.0 && ph <= 8.5)) risks.push("warning");

    if (risks.includes("critical")) return "critical";
    if (risks.includes("warning")) return "warning";
    return "safe";
  };

  const renderAnalysisCard = () => {
    const overallRisk = getOverallRisk();
    const riskData = {
      safe: {
        title: "Safe Environment",
        message: "Conditions are currently unfavorable for Schistosomiasis snails.",
        color: "#22c55e",
        bgColor: "rgba(34,197,94,0.08)",
        borderColor: "rgba(34,197,94,0.2)"
      },
      warning: {
        title: "Moderate Risk",
        message: "Parameters are approaching optimal breeding ranges for snails.",
        color: "#f59e0b",
        bgColor: "rgba(245,158,11,0.08)",
        borderColor: "rgba(245,158,11,0.2)"
      },
      critical: {
        title: "High Risk",
        message: "Environment is highly favorable for Schistosomiasis intermediate hosts.",
        color: "#ef4444",
        bgColor: "rgba(239,68,68,0.08)",
        borderColor: "rgba(239,68,68,0.2)"
      },
      "no-data": {
        title: "Waiting for Data",
        message: "Establishing connection to SchistoGuard sensor for live analysis.",
        color: "#64748b",
        bgColor: "rgba(100,116,139,0.08)",
        borderColor: "rgba(100,116,139,0.2)"
      }
    };

    const current = riskData[overallRisk as keyof typeof riskData];

    return (
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: screenWidth < 600 ? "16px" : screenWidth >= 1100 ? "18px" : "22px",
        boxShadow: screenWidth < 600 ? "0 4px 18px rgba(0,0,0,0.11)" : "0 2px 12px rgba(0,0,0,0.09)",
        fontFamily: "'Poppins', sans-serif",
        animation: 'cardFadeIn 0.6s 0.6s ease-out both',
        gridColumn: '1 / -1',
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 4, // Added margin to separate from the cards above
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #357D86, #4EA8B1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Activity size={18} color="#fff" />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#337C85" }}>
            Data Interpretation
          </h3>
        </div>

        {/* Current Risk Interpretation */}
        <div style={{
          padding: "12px 14px",
          borderRadius: 14,
          background: current.bgColor,
          border: `1px solid ${current.borderColor}`,
          display: "flex",
          gap: 10,
          alignItems: "flex-start"
        }}>
          <Info size={16} color={current.color} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: current.color }}>
              {current.title}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
              {current.message}
            </p>
          </div>
        </div>

        {/* Threshold Quick Guide */}
        <div style={{ marginTop: 4 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Snail Breeding Danger Zones
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Thermometer size={14} color="#77ABB2" />
                <span style={{ fontSize: 12, color: "#475569" }}>Temperature</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                22°C - 30°C
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Droplets size={14} color="#77ABB2" />
                <span style={{ fontSize: 12, color: "#475569" }}>Turbidity</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                Clear (&lt; 5 NTU)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Info size={14} color="#77ABB2" />
                <span style={{ fontSize: 12, color: "#475569" }}>pH Levels</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                6.5 - 8.0 pH
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col overflow-hidden bg-white">
      {/* Solid White Background container */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: '#e8eff1' }}>

        {/* Map loads behind gradient, fades in when ready - Dashboard style */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          {shouldRenderMap && (
            <DashboardMap
              ref={mapRef}
              interactive={showLiveUpdates && screenWidth >= 600}
              mobileMode={isMobileOrTablet}
              sites={gpsSites}
              // On desktop preview, shift pin further right (-0.0032) to match Pic 2 framing
              lngOffset={!isMobileOrTablet ? (isPreviewActive ? -0.0020 : -0.0015) : undefined}
              latOffset={
                isMobileOrTablet
                  ? isPreviewActive
                    ? screenWidth < 380
                      ? -0.0010 // Pic 1 - Galaxy (Lowered from -0.0015)
                      : screenWidth < 600
                        ? -0.0008 // Pic 2 - iPhone 13 (Lowered from -0.0012)
                        : screenWidth < 800
                          ? -0.0016 // Pic 5 - iPad mini (Raised from -0.0008)
                          : -0.0013 // Pic 3 & 4 - iPad Air/Pro (Raised from -0.0006)
                    : -0.00099 // Dashboard default for mobile/tablet
                  : undefined
              }
              onMapReady={() => {
                // Shorter delay - just wait for initial render
                setTimeout(() => setMapLoaded(true), 300);
              }}
            />
          )}
        </div>

        {/* Gradient overlay - hidden when preview is shown */}
        <div
          className="absolute inset-0"
          style={{
            background: isMobileOrTablet
              ? "linear-gradient(to top, #357D86 0%, #357D86 1%, rgba(53,125,134,0.85) 50%, rgba(152,244,255,0) 95%)"
              : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.85) 35%, rgba(53,125,134,0.4) 55%, rgba(152,244,255,0) 85%)",
            zIndex: 1,
            pointerEvents: "none",
            opacity: showLiveUpdates ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      <header
        className="relative z-50 border-b border-gray-100"
        style={{
          backgroundColor: '#FFFFFF',
          transform: showLiveUpdates ? 'translateY(-100%)' : 'translateY(0)',
          opacity: showLiveUpdates ? 0 : 1,
          transition: isExitingLiveUpdates
            ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
            : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          pointerEvents: showLiveUpdates ? 'none' : 'auto',
        }}
      >
        <div className="w-full py-6" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img
                src="/schistoguard.png"
                alt="SchistoGuard Logo"
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
              <h1
                style={{
                  fontFamily: "Poppins, sans-serif",
                  color: "#357D86",
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                SchistoGuard
              </h1>
            </div>

            {/* Full button on tablet/desktop, icon-only on mobile */}
            <div className="flex items-center gap-3">
              {screenWidth >= 640 ? (
                <CTAButton
                  variant="primary"
                  size="sm"
                  onClick={onEnterApp}
                  ariaLabel="Start monitoring"
                  className="flex rounded-full px-5 py-2 border-2 transition-all duration-300 shadow-lg"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '14px',
                    backgroundColor: isMonitoringHovered ? '#FFFFFF' : '#357D86',
                    color: isMonitoringHovered ? '#357D86' : '#FFFFFF',
                    borderColor: '#357D86',
                    boxShadow: isMonitoringHovered ? '0 10px 25px -5px rgba(53, 125, 134, 0.3)' : '0 10px 15px -3px rgba(53, 125, 134, 0.2)',
                    transform: isMonitoringHovered ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                  onMouseEnter={() => setIsMonitoringHovered(true)}
                  onMouseLeave={() => setIsMonitoringHovered(false)}
                >
                  Start monitoring
                </CTAButton>
              ) : (
                <button
                  onClick={onEnterApp}
                  aria-label="Start monitoring"
                  className="flex items-center justify-center rounded-full border-2 transition-all duration-300 shadow-lg"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#357D86',
                    borderColor: '#357D86',
                    color: '#FFFFFF'
                  }}
                >
                  <Activity className="w-4 h-4" />
                </button>
              )}

              {/* PWA Install Button - visible only on mobile/tablet AND if not already installed */}
              {isMobileOrTablet && !isPWAInstalled && (
                <button
                  onClick={() => setShowPWAInstructions(true)}
                  aria-label="Install App"
                  className="flex items-center justify-center rounded-full border-2 border-schistoguard-teal bg-white text-schistoguard-teal transition-all duration-300 shadow-lg hover:bg-schistoguard-teal hover:text-white"
                  style={{
                    width: 40,
                    height: 40,
                  }}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center" style={{
        transform: showLiveUpdates ? 'translateX(-100%)' : 'translateX(0)',
        opacity: showLiveUpdates ? 0 : 1,
        transition: isExitingLiveUpdates
          ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
          : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        pointerEvents: showLiveUpdates ? 'none' : 'auto',
      }}>
        <section className="hidden lg:block w-full py-8">
          <div className="w-full" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6 max-w-4xl py-8 animate-fade-up">
                <div className="space-y-4">
                  <h2
                    className="animate-fade-up animate-delay-50"
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      fontSize: getHeroFontSize(),
                      fontWeight: 800,
                      lineHeight: '1.2',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Know Your Water.<br />
                    Early detection for a schisto-free community.
                  </h2>

                  <p
                    className="leading-relaxed animate-fade-up animate-delay-100"
                    style={{
                      color: 'rgba(255,255,255,0.95)',
                      textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                      fontSize: getHeroParagraphFontSize()
                    }}
                  >
                    Real-time monitoring of water
                    sites to help prevent schistosomiasis.
                  </p>
                </div>

                <div
                  className="flex flex-wrap animate-fade-up animate-delay-150"
                  style={{ gap: '12px' }}
                >
                  <TrustBadge
                    icon={
                      <Shield className="w-3.5 h-3.5 text-schistoguard-green" />
                    }
                    label="Real-time monitoring"
                    small
                  />
                  <TrustBadge
                    icon={
                      <SensorIcon className="w-3.5 h-3.5 text-schistoguard-teal" />
                    }
                    label="Multiple locations"
                    small
                  />
                  <TrustBadge
                    icon={
                      <Users className="w-3.5 h-3.5 text-schistoguard-coral" />
                    }
                    label="Public health focus"
                    small
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-up animate-delay-200" style={{ marginTop: '70px' }}>
                  <CTAButton
                    variant="primary"
                    size="md"
                    onClick={handleLiveUpdatesClick}
                    ariaLabel="Live updates"
                    className="group transition-transform duration-500 transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#ffffffff',
                      borderRadius: '9999px',
                      padding: '12px 36px',
                      boxShadow: `
                        inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                        inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                        0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                        0 0 15px rgba(53, 125, 134, 0.3), 
                        0 0 30px rgba(53, 125, 134, 0.2)
                      `,
                      fontWeight: 600,
                      fontSize: '15px',
                      fontFamily: 'Poppins, sans-serif',
                      letterSpacing: '0.05em',
                      textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'inline-flex'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Live Updates
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
                  </CTAButton>
                </div>
              </div>

              {/* Removed HeroIllustration */}
              <div className="relative h-96 flex items-center justify-center">
                {/* Empty container to maintain layout balance without animations */}
              </div>
            </div>
          </div>
        </section>

        <section
          className="lg:hidden w-full px-4"
          style={{
            position: 'absolute',
            bottom: screenWidth >= 768 ? '120px' : '80px',
            left: 0,
            right: 0,
            zIndex: 20
          }}
        >
          <div className="text-center p-6 flex flex-col items-center">
            <div className="space-y-3 mb-6 animate-fade-up">
              <h2
                className="animate-fade-up animate-delay-50"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  fontSize: getHeroFontSize(),
                  fontWeight: 800,
                  lineHeight: '1.1',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Know Your Water.<br />
                Early detection for a schisto-free community.
              </h2>

              <p
                className="leading-relaxed max-w-2xl mx-auto animate-fade-up animate-delay-100"
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                  lineHeight: '1.2',
                  fontSize: getHeroParagraphFontSize()
                }}
              >
                Free, real-time monitoring of water
                sites to help prevent schistosomiasis.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-10 animate-fade-up animate-delay-150">
              <TrustBadge
                icon={
                  <Shield className="w-3 h-3 text-schistoguard-green" />
                }
                label="Real-time monitoring"
                small
              />
              <TrustBadge
                icon={
                  <SensorIcon className="w-3 h-3 text-schistoguard-teal" />
                }
                label="Multiple locations"
                small
              />
              <TrustBadge
                icon={
                  <Users className="w-3 h-3 text-schistoguard-coral" />
                }
                label="Public health focus"
                small
              />
            </div>
            <div className="flex justify-center w-full mx-auto animate-fade-up animate-delay-200" style={{ marginTop: '80px' }}>
              <CTAButton
                variant="primary"
                size="md"
                onClick={handleLiveUpdatesClick}
                ariaLabel="Live updates"
                className="group transition-transform duration-500 transform active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#ffffffff',
                  borderRadius: '9999px',
                  padding: '16px 48px',
                  boxShadow: `
                    inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                    inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                    0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                    0 0 15px rgba(53, 125, 134, 0.3), 
                    0 0 30px rgba(53, 125, 134, 0.2)
                  `,
                  fontWeight: 600,
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.05em',
                  textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Live Updates
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
              </CTAButton>
            </div>
          </div>
        </section>
      </main>

      {/* Live Updates Overlay */}
      {(showLiveUpdates || isExitingLiveUpdates) && (
        <div
          className="fixed inset-0 z-40"
          style={{
            animation: isExitingLiveUpdates ? 'fadeOut 0.5s ease-out forwards' : 'fadeIn 0.3s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {/* Dashboard-style gradient overlay - exact match to dashboard */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isMobileOrTablet
                ? "linear-gradient(to bottom, #357D86 0%, rgba(53,125,134,0.85) 5%, rgba(53,125,134,0.3) 35%, rgba(152,244,255,0) 55%)"
                : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.9) 5%, rgba(53,125,134,0.4) 30%, rgba(152,244,255,0) 50%)",
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Content overlay on left side */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: isMobileOrTablet ? '100%' : '50%',
              padding: isMobileOrTablet
                ? (screenWidth < 400 ? '72px 16px 16px' :
                  screenWidth < 600 ? '76px 20px 20px' :
                    screenWidth < 800 ? '80px 24px 24px' :
                      '88px 28px 28px')
                : '100px 50px 120px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              scrollbarWidth: 'none' as const,
              msOverflowStyle: 'none' as const,
              animation: 'contentSlideIn 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both',
              zIndex: 2,
              pointerEvents: 'none', // Changed from 'auto' so clicks pass through to map
            }}
          >
            {/* Back button */}
            <button
              onClick={handleBackFromLiveUpdates}
              className="hover:scale-105 active:scale-95 transition-transform duration-200"
              style={{
                position: 'absolute',
                top: isMobileOrTablet
                  ? (screenWidth < 400 ? 18 : screenWidth < 600 ? 20 : screenWidth < 800 ? 22 : 26)
                  : 32,
                left: isMobileOrTablet
                  ? (screenWidth < 400 ? 16 : screenWidth < 600 ? 20 : screenWidth < 800 ? 24 : 28)
                  : 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                border: 'none',
                color: '#357D86',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'auto', // Back button should be clickable
              }}
              aria-label="Back to Home"
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>

            {/* Header */}
            <div style={{ pointerEvents: 'none', marginTop: 0, maxWidth: screenWidth < 1100 ? '100%' : 580 }}>
              <h1
                style={{
                  margin: 0,
                  color: '#fff',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: isMobileOrTablet ? (screenWidth < 600 ? 26 : 32) : 38,
                  lineHeight: 1.15,
                  textShadow: '0 1px 6px rgba(0,0,0,0.18)',
                  animation: 'slideInFromRight 0.6s 0.2s ease-out both',
                }}
              >
                {siteData.siteName}
              </h1>
              <p
                style={{
                  margin: '6px 0 0',
                  color: 'rgba(255,255,255,0.92)',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isMobileOrTablet ? 13 : 16,
                  animation: 'slideInFromRight 0.6s 0.3s ease-out both',
                }}
              >
                {displayAddress}
              </p>

              {/* System Status Capsule (Dashboard style) + Location Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                pointerEvents: 'auto',
                animation: 'slideInFromRight 0.6s 0.4s ease-out both',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.92)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: (deviceConnected && backendOk && dataOk) ? '#15803d' : '#6b7280',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(4px)',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: (deviceConnected && backendOk && dataOk) ? '#22c55e' : '#9ca3af',
                    display: 'inline-block',
                    animation: (deviceConnected && backendOk && dataOk) ? 'dotPulse 3s ease-in-out infinite' : 'none',
                    "--dot-glow": (deviceConnected && backendOk && dataOk) ? 'rgba(34,197,94,0.5)' : 'transparent',
                  } as any} />
                  {(deviceConnected && backendOk && dataOk) ? 'System Operational' : 'System Down'}
                </div>
                {screenWidth >= 600 && (
                  <button
                    onClick={() => mapRef.current?.resetView()}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.92)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      backdropFilter: 'blur(4px)',
                    }}
                    title="Reset map position"
                  >
                    <LocateFixed size={15} color="#357D86" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* flex spacer — grows to fill remaining space so cards anchor to bottom */}
            {isMobileOrTablet && <div style={{ flex: 1, minHeight: isMobileOrTablet ? (screenWidth < 600 ? 20 : 40) : 0 }} />}

            <div
              ref={cardsGridRef}
              style={{
                display: 'grid',
                gridTemplateColumns: screenWidth >= 1100 ? '1fr 1fr 1fr' : '1fr 1fr',
                gap: 20,
                pointerEvents: 'auto',
                marginTop: 20,
                maxWidth: screenWidth < 1100 ? '100%' : 580, 
              }}
            >
              {/* Temperature Card - Full Width on Mobile */}
              <div
                style={{
                  gridColumn: 'auto',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '12px 14px' : screenWidth >= 1100 ? '14px 18px' : '20px 26px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.3s ease-out both',
                  minWidth: screenWidth < 600 ? 0 : 'auto',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: screenWidth < 600 ? 14 : 20,
                  right: screenWidth < 600 ? 14 : 20,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('temperature', latestReading.temperature).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus('temperature', latestReading.temperature).color, 0.5) : 'transparent',
                } as any} />
                <img src="/icons/icon-temperature.svg" alt="temp"
                  style={{ width: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, height: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, objectFit: 'contain', marginBottom: screenWidth < 600 ? 6 : 8 }} />
                <p style={{ margin: '0 0 6px', fontWeight: 500, fontSize: screenWidth < 600 ? 11.5 : screenWidth >= 1100 ? 12 : 15, color: '#77ABB2' }}>Temperature</p>
                <p style={{ margin: '0 0 6px', lineHeight: 1.2, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: screenWidth < 600 ? 22 : screenWidth >= 1100 ? 24 : 30, color: '#6b7280' }}>
                    {latestReading ? latestReading.temperature : '—'}
                  </span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: screenWidth < 600 ? 12 : screenWidth >= 1100 ? 16 : 20, color: '#6b7280' }}> °C</span>}
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9 : 13, fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('temperature', latestReading.temperature).label}
                  </p>
                )}
              </div>

              {/* Turbidity Card */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '12px 14px' : screenWidth >= 1100 ? '16px 20px' : '20px 26px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.4s ease-out both',
                  minWidth: screenWidth < 600 ? 0 : 'auto',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: screenWidth < 600 ? 14 : 20,
                  right: screenWidth < 600 ? 14 : 20,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('turbidity', latestReading.turbidity).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus('turbidity', latestReading.turbidity).color, 0.5) : 'transparent',
                } as any} />
                <img src="/icons/icon-turbidity.svg" alt="turbidity"
                  style={{ width: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, height: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, objectFit: 'contain', marginBottom: screenWidth < 600 ? 6 : 8 }} />
                <p style={{ margin: '0 0 6px', fontWeight: 500, fontSize: screenWidth < 600 ? 12 : screenWidth >= 1100 ? 13 : 15, color: '#77ABB2' }}>Turbidity</p>
                <p style={{ margin: '0 0 6px', lineHeight: 1.2, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: screenWidth < 600 ? 22 : screenWidth >= 1100 ? 24 : 30, color: '#6b7280' }}>
                    {latestReading ? latestReading.turbidity : '—'}
                  </span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: screenWidth < 600 ? 12 : screenWidth >= 1100 ? 16 : 20, color: '#6b7280' }}> NTU</span>}
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9 : 13, fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('turbidity', latestReading.turbidity).label}
                  </p>
                )}
              </div>

              {/* pH Card */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'auto' : '1 / -1',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '12px 14px' : screenWidth >= 1100 ? '16px 20px' : '20px 26px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.5s ease-out both',
                  minWidth: screenWidth < 600 ? 0 : 'auto',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: screenWidth < 600 ? 14 : 20,
                  right: screenWidth < 600 ? 14 : 20,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('ph', latestReading.ph).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus('ph', latestReading.ph).color, 0.5) : 'transparent',
                } as any} />
                <img src="/icons/icon-ph.svg" alt="ph"
                  style={{ width: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, height: screenWidth < 600 ? 32 : screenWidth >= 1100 ? 36 : 44, objectFit: 'contain', marginBottom: screenWidth < 600 ? 6 : 8 }} />
                <p style={{ margin: '0 0 6px', fontWeight: 500, fontSize: screenWidth < 600 ? 12 : screenWidth >= 1100 ? 13 : 15, color: '#77ABB2' }}>pH Level</p>
                <p style={{ margin: '0 0 6px', lineHeight: 1.2, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: screenWidth < 600 ? 22 : screenWidth >= 1100 ? 24 : 30, color: '#6b7280' }}>
                    {latestReading ? latestReading.ph : '—'}
                  </span>
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9 : 13, fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('ph', latestReading.ph).label}
                  </p>
                )}
              </div>

              {/* Data Interpretation & Analysis Card — persistent for educational guide */}
              {renderAnalysisCard()}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow, rgba(34,197,94,0.4)); }
          60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>


      <AlertsQuickviewModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={sampleAlerts}
        onAcknowledge={(id) =>
          console.log(`Acknowledge alert ${id}`)
        }
        onViewSite={(id) =>
          console.log(`View site for alert ${id}`)
        }
      />
      {/* PWA Instructions Modal */}
      <PWAInstructionsModal
        isOpen={showPWAInstructions}
        onClose={() => setShowPWAInstructions(false)}
      />
    </div>
  );
};