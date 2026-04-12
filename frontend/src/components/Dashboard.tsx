import React, { useState, useRef, useEffect } from "react";
import { AlertItem } from "./AlertItem";
import { AlertDetailsModal } from "./AlertDetailsModal";
import { DashboardMap } from "./DashboardMap";
import type { DashboardMapHandle } from "./DashboardMap";
import {
  Bell,
  Asterisk,
  LocateFixed,
  Info,
  Thermometer,
  Droplets,
  Activity,
  type LucideProps,
} from "lucide-react";
import { createPortal } from "react-dom";

import { apiGet, apiPost, apiPut } from "../utils/api";
import { reverseGeocode } from "../utils/reverseGeocode";
import { formatAddress } from "../utils/addressFormat";

// Module-level flag: animation plays only on the very first load, not on re-navigation
let _dashboardFirstLoadDone = false;

type Alert = {
  id: string;
  parameter: string;
  level: "critical" | "warning" | "info" | string;
  isAcknowledged: boolean;
  message?: string;
  [key: string]: any;
};

export function Dashboard({
  onNavigate,
  setSystemStatus,
  viewMode = "full",
  visible = true,
  user,
}: {
  onNavigate?: (view: string) => void;
  setSystemStatus?: (status: "operational" | "down") => void;
  viewMode?: "full" | "sensors-only";
  visible?: boolean;
  user?: any;
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [siteData, setSiteData] = useState<any>({
    siteName: "Site Name",
    barangay: "",
    municipality: "",
    area: "",
  });
  // Device connection state
  const [deviceConnected, setDeviceConnected] = useState(true);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  // Cache last lat/lng to avoid unnecessary API calls
  const lastLatLngRef = useRef<{ lat: number, lng: number } | null>(null);
  // Interval config state
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState("min");
  const [mapReady, setMapReady] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(!_dashboardFirstLoadDone);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1728);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (visible && !_dashboardFirstLoadDone) {
      setAnimationEnabled(true);
      const timer = setTimeout(() => {
        setAnimationEnabled(false);
        _dashboardFirstLoadDone = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // When the Dashboard becomes visible again (after being hidden), resize the map
  useEffect(() => {
    if (visible && mapReady) {
      // Small delay so the container has non-zero dimensions after display switches
      const t = setTimeout(() => mapRef.current?.resize(), 50);
      return () => clearTimeout(t);
    }
  }, [visible, mapReady]);

  // Strictly use real sensor device location (from GSM/GPS)
  const [gpsSites, setGpsSites] = useState<Array<{ id: string; name: string; lat: number; lng: number }> | undefined>(undefined);
  const [lastSavedLocation, setLastSavedLocation] = useState<{ lat: number; lng: number; siteName?: string; address?: string | null } | null>(null);

  // Update location whenever latestReading changes
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
      lastLoc = {
        lat: latestReading.latitude,
        lng: latestReading.longitude,
        siteName: siteData.siteName,
        address: typeof latestReading.address === 'string' && latestReading.address.trim()
          ? latestReading.address.trim()
          : (lastSavedLocation?.address ?? null),
      };

      setGpsSites(sites);
      setLastSavedLocation(lastLoc);
    }
    // 2. If no live reading yet, keep the last valid marker from backend fallback
    else {
      if (lastSavedLocation && typeof lastSavedLocation.lat === 'number' && typeof lastSavedLocation.lng === 'number') {
        setGpsSites([{
          id: 'device-gps',
          name: lastSavedLocation.siteName || 'Last Known Location',
          lat: lastSavedLocation.lat,
          lng: lastSavedLocation.lng,
        }]);
      }
    }
  }, [latestReading, siteData.siteName, lastSavedLocation]);

  // Reverse geocode the location shown on the map (latestReading or lastSavedLocation)
  useEffect(() => {
    let lat: number | null = null;
    let lng: number | null = null;
    if (
      latestReading &&
      typeof latestReading.latitude === 'number' &&
      typeof latestReading.longitude === 'number' &&
      latestReading.latitude !== null &&
      latestReading.longitude !== null
    ) {
      lat = latestReading.latitude;
      lng = latestReading.longitude;
    } else if (lastSavedLocation && typeof lastSavedLocation.lat === 'number' && typeof lastSavedLocation.lng === 'number') {
      lat = lastSavedLocation.lat;
      lng = lastSavedLocation.lng;
    }
    if (lat !== null && lng !== null) {
      if (!lastLatLngRef.current || lastLatLngRef.current.lat !== lat || lastLatLngRef.current.lng !== lng) {
        lastLatLngRef.current = { lat, lng };
        // Don't reset gpsAddress to null — keep old address visible while loading new one
        reverseGeocode(lat, lng).then(addr => {
          if (addr) {
            setGpsAddress(addr);
            setLastSavedLocation(prev => prev ? { ...prev, address: addr } : prev);
          } else if (typeof latestReading?.address === 'string' && latestReading.address.trim()) {
            setGpsAddress(latestReading.address.trim());
          }
        });
      }
    } else {
      if (typeof latestReading?.address === 'string' && latestReading.address.trim()) {
        const resolvedAddress = latestReading.address.trim();
        if (gpsAddress !== resolvedAddress) {
          setGpsAddress(resolvedAddress);
        }
      }
      // Don't reset to null immediately — let the history fallback below try first
      if (!gpsAddress) {
        lastLatLngRef.current = null;
      }
    }
  }, [latestReading, lastSavedLocation, gpsAddress, siteData.siteName]);

  // Fallback: search history readings for GPS coordinates when latestReading has none
  // This mirrors the logic in SiteDetailView that finds the address from historical data
  useEffect(() => {
    // Only run if we don't already have a gpsAddress
    if (gpsAddress) return;
    if (!readings || readings.length === 0) return;

    // Find the most recent reading with valid GPS coordinates
    const latestWithGps = [...readings]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .find((r: any) => typeof r.latitude === 'number' && typeof r.longitude === 'number');

    if (latestWithGps) {
      reverseGeocode(latestWithGps.latitude, latestWithGps.longitude).then(addr => {
        if (addr) {
          setGpsAddress(addr);
        } else if (typeof latestWithGps.address === 'string' && latestWithGps.address.trim()) {
          setGpsAddress(latestWithGps.address.trim());
        }
      });
    }
  }, [readings, gpsAddress]);

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [alertsClosing, setAlertsClosing] = useState(false);
  const alertsOpenRef = useRef(false);
  const alertsClosingRef = useRef(false);
  const mapRef = useRef<DashboardMapHandle>(null);
  const [alertsDropdownPosition, setAlertsDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isNarrowDesktop = windowWidth < 1700;
  // Use a shared padding so ALL dashboard cards align perfectly
  const sharedPad = isNarrowDesktop ? "14px 18px" : "18px 24px";
  const panelWidth = isNarrowDesktop ? "44%" : "40%";

  const primaryAddress =
    (typeof latestReading?.address === "string" && latestReading.address.trim() ? latestReading.address.trim() : null) ||
    (typeof lastSavedLocation?.address === "string" && lastSavedLocation.address.trim() ? lastSavedLocation.address.trim() : null) ||
    (typeof gpsAddress === "string" && gpsAddress.trim() ? gpsAddress.trim() : null) ||
    null;

  const displayAddress = formatAddress({
    fullAddress: primaryAddress,
    locality: primaryAddress,
    area: siteData?.area,
    barangay: siteData?.barangay,
    municipality: siteData?.municipality,
    province: siteData?.province,
    fallback: "Address unavailable",
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 600);
      setIsTablet(w >= 600 && w < 1100);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const dPad = isMobile ? 16 : isTablet ? 24 : (windowWidth < 1600 ? 20 : 32);

  useEffect(() => {
    const handler = (e: Event) => {
      setSidebarOpen((e as CustomEvent).detail?.open ?? false);
    };
    window.addEventListener("sidebarDrawerChanged", handler);
    return () => window.removeEventListener("sidebarDrawerChanged", handler);
  }, []);
  // (removed duplicate declaration)
  const [backendOk, setBackendOk] = useState(true);
  const [dataOk, setDataOk] = useState(true);
  const alertsPanelRef = useRef<HTMLDivElement>(null);

  const calcPanelPos = () => {
    const w = window.innerWidth;
    const panelTop = 72;
    const panelWidth = w < 480 ? w - 32 : Math.min(500, w - 80);
    const panelLeft = w - panelWidth - 16;
    return { top: panelTop, left: panelLeft };
  };

  const closeAlertsDropdown = () => {
    if (!alertsOpenRef.current || alertsClosingRef.current) return;
    alertsClosingRef.current = true;
    setAlertsClosing(true);
    window.dispatchEvent(new CustomEvent("alertsDropdownStateChanged", { detail: { open: false } }));
    setTimeout(() => {
      setShowAlertsDropdown(false);
      setAlertsClosing(false);
      alertsOpenRef.current = false;
      alertsClosingRef.current = false;
    }, 200);
  };

  const openAlertsDropdown = () => {
    if (alertsOpenRef.current) {
      closeAlertsDropdown();
      return;
    }
    setAlertsDropdownPosition(calcPanelPos());
    setShowAlertsDropdown(true);
    setAlertsClosing(false);
    alertsOpenRef.current = true;
    alertsClosingRef.current = false;
    window.dispatchEvent(new CustomEvent("alertsDropdownStateChanged", { detail: { open: true } }));
    // Close other UI elements like Navigation dropdowns when this opens
    window.dispatchEvent(new CustomEvent("sg_closeAllPopups"));
  };

  useEffect(() => {
    const fetchLatest = () => {
      apiGet("/api/sensors/latest")
        .then((data) => {
          console.log('[Dashboard] /api/sensors/latest response:', data);
          // If backend says deviceConnected: false, treat as disconnected
          if (data && data.deviceConnected === false) {
            console.log('[Dashboard] Device disconnected, checking for fallback coords:', { hasLat: typeof data.latitude === 'number', hasLng: typeof data.longitude === 'number', lat: data.latitude, lng: data.longitude });
            if (data.siteName && data.siteName !== "Site Name") setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
            if (typeof data.address === 'string' && data.address.trim()) {
              const resolvedAddress = data.address.trim();
              setGpsAddress(resolvedAddress);
            }
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              console.log('[Dashboard] Fallback coords found, setting gpsSites and lastSavedLocation');
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
            } else {
              console.log('[Dashboard] NO fallback coords, clearing map');
            }
            setDeviceConnected(false);
            setLatestReading(null);
            setBackendOk(true);
            setDataOk(false);
            return;
          }
          console.log('[Dashboard] Device connected, setting latestReading');
          setLatestReading(data);
          if (typeof data?.address === 'string' && data.address.trim()) {
            const resolvedAddress = data.address.trim();
            setGpsAddress(resolvedAddress);
          }
          setBackendOk(true);
          setDataOk(true);
          setDeviceConnected(true);
          // Only update siteName from telemetry if it's not the generic default, 
          // to prevent overwriting custom Admin settings.
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
    const interval = setInterval(fetchLatest, 1000);
    return () => clearInterval(interval);
  }, []);



  // Load interval config from backend
  useEffect(() => {
    let lastIntervalMs: number | null = null;
    const fetchIntervalConfig = async () => {
      try {
        const data = await apiGet("/api/sensors/interval-config");
        let ms = data.intervalMs || 300000;
        if (data.deviceName && data.deviceName !== "Site Name") {
          setSiteData((prev: any) => ({ ...prev, siteName: data.deviceName }));
        }
        if (ms !== lastIntervalMs) {
          lastIntervalMs = ms;
          if (ms % 3600000 === 0) {
            setIntervalValue(ms / 3600000);
            setIntervalUnit("hr");
          } else if (ms % 60000 === 0) {
            setIntervalValue(ms / 60000);
            setIntervalUnit("min");
          } else {
            setIntervalValue(ms / 1000);
            setIntervalUnit("sec");
          }
        }
      } catch {
        setIntervalValue(5);
        setIntervalUnit("min");
      }
    };
    fetchIntervalConfig();
    const interval = setInterval(fetchIntervalConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get interval string for API and label
  const getIntervalString = () => {
    if (intervalUnit === "hr") return `${intervalValue}hr`;
    if (intervalUnit === "min") return `${intervalValue}min`;
    if (intervalUnit === "sec") return `${intervalValue}sec`;
    return `${intervalValue}min`;
  };

  useEffect(() => {
    const fetchReadings = () => {
      apiGet(`/api/sensors/history?interval=${getIntervalString()}&range=24h`)
        .then((data) => {
          if (Array.isArray(data)) setReadings(data);
          setBackendOk(true);
        })
        .catch(() => setBackendOk(false));
    };
    fetchReadings();
    const interval = setInterval(fetchReadings, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalValue, intervalUnit]);

  useEffect(() => {
    if (setSystemStatus) {
      if (!deviceConnected) {
        setSystemStatus("down");
      } else {
        setSystemStatus(!backendOk || !dataOk ? "down" : "operational");
      }
    }
  }, [backendOk, dataOk, setSystemStatus]);

  useEffect(() => {
    const fetchAlerts = () => {
      apiGet("/api/sensors/alerts")
        .then((data) => {
          if (Array.isArray(data)) {
            const sanitized = data
              .filter((alert) =>
                ["Temperature", "Turbidity", "pH"].includes(alert.parameter)
              )
              .map(alert => ({
                ...alert,
                barangay: (!alert.barangay || alert.barangay === "Unknown") && alert.siteName === "Matina Site"
                  ? "Matina Crossing"
                  : (alert.barangay === "Unknown" ? "N/A" : alert.barangay)
              }));
            setAlerts(sanitized);
          }
        })
        .catch(() => { });
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [deviceConnected]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      // Exclude the bell button — its own click handler handles the toggle cleanly
      const isBell = (event.target as Element).closest?.('[data-alerts-bell]');
      if (isBell) return;
      if (!alertsPanelRef.current?.contains(target)) {
        closeAlertsDropdown();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Recalculate panel position on resize so it flows with screen size
  useEffect(() => {
    const handleResize = () => {
      if (showAlertsDropdown) setAlertsDropdownPosition(calcPanelPos());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showAlertsDropdown]);

  useEffect(() => {
    const openHandler = () => openAlertsDropdown();
    const closeHandler = () => closeAlertsDropdown();
    window.addEventListener("openAlertsDropdown", openHandler);
    window.addEventListener("sg_closeAlerts", closeHandler);
    return () => {
      window.removeEventListener("openAlertsDropdown", openHandler);
      window.removeEventListener("sg_closeAlerts", closeHandler);
    };
  }, []);
  // Use logged-in user for acknowledge (same as AlertsPage)
  const [userName] = useState(() => user ? `${user.firstName} ${user.lastName} (${user.role ? user.role.toUpperCase() : ''})` : "Unknown");

  const handleAcknowledgeAlert = (alertId: string, fullAlert?: Alert) => {
    if (fullAlert) setSelectedAlert(fullAlert);
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isAcknowledged: true, acknowledgedBy: userName } : alert
      )
    );
    apiPost(`/api/sensors/alerts/${alertId}/acknowledge`, {
      acknowledgedBy: userName,
    })
      .then((data) => {
        if (data.success && data.alert) {
          setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
          if (selectedAlert && selectedAlert.id === alertId) {
            setSelectedAlert({ ...selectedAlert, ...data.alert });
          }
        }
      })
      .catch(() => { });
  };

  const unacknowledgedAlerts = alerts.filter(
    (alert) => !alert.isAcknowledged
  ).length;

  // Broadcast unread count so the bell icon in NavigationHeader can show a red dot
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("alertsUnreadCount", { detail: { count: unacknowledgedAlerts } })
    );
  }, [unacknowledgedAlerts]);

  // ─── Risk Level computation ──────────────────────────────────────────────
  let overallRisk: "critical" | "warning" | "safe" = "safe";
  if (latestReading) {
    const temp = latestReading.temperature;
    const turbidity = latestReading.turbidity;
    const ph = latestReading.ph;

    let tempRisk: "critical" | "warning" | "safe" = "safe";
    if (temp >= 22 && temp <= 30) tempRisk = "critical";
    else if ((temp >= 20 && temp < 22) || (temp > 30 && temp <= 35)) tempRisk = "warning";

    let turbidityRisk: "critical" | "warning" | "safe" = "safe";
    if (turbidity < 5) turbidityRisk = "critical";
    else if (turbidity >= 5 && turbidity <= 15) turbidityRisk = "warning";

    let phRisk: "critical" | "warning" | "safe" = "safe";
    if (ph >= 6.5 && ph <= 8.0) phRisk = "critical";
    else if ((ph >= 6.0 && ph < 6.5) || (ph > 8.0 && ph <= 8.5)) phRisk = "warning";

    if ([tempRisk, turbidityRisk, phRisk].includes("critical")) overallRisk = "critical";
    else if ([tempRisk, turbidityRisk, phRisk].includes("warning")) overallRisk = "warning";
  }

  const renderDataInterpretation = (compact: boolean = false) => {
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
      }
    };

    const current = riskData[overallRisk];

    return (
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        padding: compact ? "16px" : "22px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        fontFamily: POPPINS,
        border: "1px solid rgba(255,255,255,0.5)",
        backdropFilter: "blur(10px)",
        animation: animationEnabled ? "contentSlideIn 0.7s 0.3s cubic-bezier(0.22,1,0.36,1) both" : "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #357D86, #4EA8B1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Activity size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: compact ? 15 : 17, fontWeight: 700, color: "#337C85" }}>
              Environmental Analysis
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Based on last {intervalValue}{intervalUnit} interval</p>
          </div>
        </div>

        {/* Current Risk Interpretation */}
        <div style={{
          padding: "14px",
          borderRadius: 16,
          background: current.bgColor,
          border: `1px solid ${current.borderColor}`,
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start"
        }}>
          <Info size={18} color={current.color} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: current.color }}>
              {current.title}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
              {current.message}
            </p>
          </div>
        </div>

        {/* Threshold Quick Guide */}
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Snail Breeding Danger Zones
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Thermometer size={14} color="#77ABB2" />
                <span style={{ fontSize: 13, color: "#475569" }}>Temperature</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                22°C - 30°C
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Droplets size={14} color="#77ABB2" />
                <span style={{ fontSize: 13, color: "#475569" }}>Turbidity</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                Clear (&lt; 5 NTU)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Info size={14} color="#77ABB2" />
                <span style={{ fontSize: 13, color: "#475569" }}>pH Levels</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                6.5 - 8.0 pH
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const riskColor =
    overallRisk === "critical"
      ? "#ef4444"
      : overallRisk === "warning"
        ? "#f59e0b"
        : "#22c55e";

  const riskGradient =
    overallRisk === "critical"
      ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      : overallRisk === "warning"
        ? "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)"
        : "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)";

  const getOverallRiskLabel = (risk: "critical" | "warning" | "safe") => {
    if (risk === "critical") return "High Possible Risk";
    if (risk === "warning") return "Moderate Risk";
    return "Safe";
  };

  // ─── Alerts portal — rendered in ALL layout branches ─────────────────────
  const alertsPortal = (() => {
    if (!showAlertsDropdown || !alertsDropdownPosition) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const NAV_H = 76;
    const SIDEBAR_W = 64;   // AppSidebar is always 64 px wide
    const CARD_PAD = 14;    // mobile card horizontal padding
    const BOTTOM_GAP = 16;
    const panelTop = NAV_H + 8;
    // On mobile: left-align with cards (sidebar + card padding), span the same content width
    // On wider screens: right-aligned, capped at 500 px
    const isMobilePanel = vw < 600;
    const panelW = isMobilePanel
      ? vw - 32 // 16px margin on each side for mobile
      : Math.min(500, vw - 80);
    const panelLeft = isMobilePanel
      ? 16      // Left margin for mobile
      : vw - panelW - 16;
    const bodyMaxH = Math.max(120, vh - panelTop - BOTTOM_GAP - 60);
    const sm = vw < 480;
    return createPortal(
      <div
        ref={alertsPanelRef}
        style={{
          position: "fixed",
          top: panelTop,
          left: panelLeft,
          width: panelW,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          border: "1px solid #e8e8e8",
          zIndex: 40,
          overflow: "hidden",
          fontFamily: POPPINS,
          animation: alertsClosing
            ? "alertsPanelOut 0.2s cubic-bezier(0.4,0,0.2,1) both"
            : "alertsPanelIn 0.25s cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: sm ? "12px 14px 10px" : "18px 22px 16px",
          borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontWeight: 700, fontSize: sm ? 14 : 16, color: "#1a3a4a", fontFamily: POPPINS }}>
            Alerts Stream
          </span>
          <span style={{
            padding: sm ? "3px 10px" : "4px 14px",
            borderRadius: 999,
            fontSize: sm ? 11 : 12,
            fontWeight: 600,
            background: unacknowledgedAlerts > 0 ? "#357D86" : "#f3f4f6",
            color: unacknowledgedAlerts > 0 ? "#fff" : "#6b7280",
          }}>
            {unacknowledgedAlerts} unread
          </span>
        </div>
        {/* Body — height capped so panel never leaves the viewport */}
        <div style={{ maxHeight: bodyMaxH, overflowY: "auto" } as React.CSSProperties}>
          {alerts.filter((a) => !a.isAcknowledged).length > 0 ? (
            alerts.filter((a) => !a.isAcknowledged).map((alert) => {
              const level: "critical" | "warning" = alert.level === "critical" ? "critical" : "warning";
              return (
                <div key={alert.id} style={{ padding: sm ? "4px 14px" : "6px 22px", borderBottom: "1px solid #f5f5f5" }}>
                  <AlertItem
                    {...alert} level={level}
                    compact={true}
                    onClick={() => setSelectedAlert({ ...alert, siteName: siteData.siteName, barangay: siteData.barangay })}
                    onAcknowledge={(id) => handleAcknowledgeAlert(id, { ...alert, siteName: siteData.siteName, barangay: siteData.barangay })}
                    siteName={siteData.siteName}
                    value={alert.value} timestamp={alert.timestamp}
                    message={alert.message ?? ""}
                  />
                </div>
              );
            })
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center",
              padding: sm ? "28px 14px" : "48px 24px",
              animation: "alertItemIn 0.35s 0.1s cubic-bezier(0.4,0,0.2,1) both",
            }}>
              <Bell size={sm ? 24 : 32} style={{ color: "#d1d5db", marginBottom: sm ? 8 : 12 }} />
              <p style={{ fontSize: sm ? 13 : 15, color: "#6b7280", margin: 0, fontWeight: 500, fontFamily: POPPINS }}>
                No alerts
              </p>
              <p style={{ fontSize: sm ? 11 : 13, color: "#9ca3af", margin: "5px 0 0", fontFamily: POPPINS }}>
                All clear!
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  })();

  // ─── sensors-only mode (map + sensor cards only) ───────────────────────
  if (viewMode === "sensors-only") {
    const compactCards = isMobile || isTablet;
    return (
      <div
        style={{
          position: "relative",
          minHeight: isMobile ? '100vh' : 560,
          height: compactCards ? (isMobile ? '100vh' : "calc(100vh - 48px)") : "calc(100vh - 48px)",
          maxHeight: isMobile ? 'none' : 1200,
          borderRadius: isMobile ? 0 : 24,
          overflow: "hidden",
          boxShadow: isMobile ? 'none' : "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {compactCards ? (
            <DashboardMap ref={mapRef} mobileMode={true} interactive={true} sites={gpsSites} />
          ) : (
            <DashboardMap ref={mapRef} sites={gpsSites} />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom right, #357D86 0%, rgba(53,125,134,0.6) 10%, rgba(152,244,255,0) 55%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: compactCards ? "100%" : "46%",
            height: "100%",
            padding: `${isMobile ? 18 : 30}px ${dPad}px ${isMobile ? 18 : 30}px`,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflow: "hidden",
            pointerEvents: "none",
          } as React.CSSProperties}
        >
          <div style={{ pointerEvents: "none" }}>
            <h1
              style={{
                margin: 0,
                color: "#fff",
                fontFamily: POPPINS,
                fontWeight: 700,
                fontSize: compactCards ? 28 : 34,
                lineHeight: 1.15,
                textShadow: "0 1px 6px rgba(0,0,0,0.18)",
                paddingLeft: isMobile ? 0 : 0,
              }}
            >
              Water Quality Information
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.92)",
                fontFamily: POPPINS,
                fontSize: compactCards ? 13 : 15,
                paddingLeft: isMobile ? 40 : 0,
              }}
            >
              Real-time data For monitoring Schistosomiasis Risk
            </p>
            {/* System Status & Recenter Button for Preview Mode */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              paddingLeft: isMobile ? 40 : 0,
              pointerEvents: "auto"
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.92)",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "#15803d",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                backdropFilter: "blur(4px)",
                fontFamily: POPPINS
              }}>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: (backendOk && dataOk) ? "#22c55e" : "#9ca3af",
                  display: "inline-block",
                  animation: (backendOk && dataOk) ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": (backendOk && dataOk) ? "rgba(34,197,94,0.5)" : "transparent",
                } as any} />
                {(backendOk && dataOk) ? "System Operational" : "Device Not Connected"}
              </div>

              <button
                onClick={() => mapRef.current?.resetView()}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.92)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  backdropFilter: "blur(4px)",
                }}
                title="Reset map position"
              >
                <LocateFixed size={13} color="#357D86" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
              pointerEvents: "auto",
            }}
          >
            <SensorMiniCard
              label="Temperature"
              iconSrc="/icons/icon-temperature.svg"
              value={!deviceConnected ? "NO DATA" : latestReading ? `${latestReading.temperature}` : "—"}
              unit="°C"
              sub={!deviceConnected ? "Device not connected" : latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
              dot={!deviceConnected ? "#9ca3af" : latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
              active={deviceConnected && !!latestReading}
              compact={compactCards}
              fadeIn={animationEnabled}
              isNarrow={isNarrowDesktop}
            />

            <SensorMiniCard
              label="Turbidity"
              iconSrc="/icons/icon-turbidity.svg"
              value={!deviceConnected ? "NO DATA" : latestReading ? `${latestReading.turbidity}` : "—"}
              unit="NTU"
              sub={!deviceConnected ? "Device not connected" : latestReading ? getSensorStatus("turbidity", latestReading.turbidity).label : ""}
              dot={!deviceConnected ? "#9ca3af" : latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af"}
              active={deviceConnected && !!latestReading}
              compact={compactCards}
              fadeIn={animationEnabled}
              isNarrow={isNarrowDesktop}
            />

            <SensorMiniCard
              label="pH Level"
              iconSrc="/icons/icon-ph.svg"
              value={!deviceConnected ? "NO DATA" : latestReading ? `${latestReading.ph}` : "—"}
              unit=""
              sub={!deviceConnected ? "Device not connected" : latestReading ? getSensorStatus("ph", latestReading.ph).label : ""}
              dot={!deviceConnected ? "#9ca3af" : latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af"}
              active={deviceConnected && !!latestReading}
              compact={compactCards}
              fadeIn={animationEnabled}
              isNarrow={isNarrowDesktop}
            />
          </div>
        </div>

        <style>{`
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
            60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
          }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ─── Mobile layout ───────────────────────────────────────────────────────
  if (viewMode === "full" && (isMobile || isTablet)) {
    const isTab = isTablet;
    return (
      /* Outer: full viewport height, map fills background, content scrolls on top */
      <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#e8eff1" }}>

        {/* ── MAP BACKGROUND — real MapLibre map ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: mapReady ? 1 : 0, transition: "opacity 0.8s ease" }}>
          <DashboardMap ref={mapRef} mobileMode={true} interactive={isTablet} onMapReady={() => setMapReady(true)} sites={gpsSites} latOffset={-0.00099} />
        </div>

        {/* ── GRADIENT OVERLAY — matches desktop: upper-left teal fading to transparent ── */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom right, #357D86 0%, rgba(53,125,134,0.6) 10%, rgba(152,244,255,0) 55%)",
          zIndex: 1,
          pointerEvents: "none",
        }} />

        {/* ── SCROLLABLE CONTENT LAYER ── */}
        <div style={{
          position: "absolute", inset: 0,
          overflowY: "auto",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          pointerEvents: isTab ? "none" : "auto",
        } as React.CSSProperties}>

          {/* Dashboard Site Info Header (Site Name, Barangay) */}
          <div style={{ padding: `${dPad}px ${dPad}px 0`, display: "flex", flexDirection: "column", pointerEvents: "auto", animation: animationEnabled ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
            {/* Site name */}
            <h1 style={{
              fontSize: windowWidth < 1600 ? 22 : (isTab ? 30 : 26), fontWeight: 700, color: "#fff", margin: 0,
              fontFamily: POPPINS, lineHeight: 1.2,
              textShadow: "0 1px 6px rgba(0,0,0,0.18)"
            }}>
              {siteData.siteName}
            </h1>
            {/* Address (sync with LandingPage logic) */}
            <p style={{
              fontSize: windowWidth < 1600 ? 11.8 : (isTab ? 15 : 13), color: "rgba(255,255,255,0.9)",
              margin: "5px 0 12px",
              fontFamily: POPPINS,
              minHeight: "auto",
              lineHeight: 1.4
            }}>
              {displayAddress}
            </p>
            {/* System Operational badge — left-aligned, under address */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.92)", borderRadius: 999,
                padding: windowWidth < 1600 ? "4px 10px" : "5px 13px", fontSize: windowWidth < 1600 ? 11 : 12, fontWeight: 600, color: "#15803d",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)", backdropFilter: "blur(4px)",
                width: "fit-content"
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: (backendOk && dataOk) ? "#22c55e" : "#9ca3af",
                  display: "inline-block",
                  animation: (backendOk && dataOk) ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": (backendOk && dataOk) ? "rgba(34,197,94,0.5)" : "transparent",
                } as React.CSSProperties} />
                {(backendOk && dataOk) ? "System Operational" : "Device Not Connected"}
              </div>
              {isTab && (
                <button
                  onClick={() => mapRef.current?.resetView()}
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)", backdropFilter: "blur(4px)",
                  }}
                  title="Reset map position"
                >
                  <LocateFixed size={15} color="#357D86" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* flex spacer — grows to fill remaining space so cards anchor to bottom */}
          <div style={{ flex: 1, minHeight: windowWidth < 1600 ? 12 : (isTab ? 20 : 40) }} />



          {/* ── CARDS — anchored to bottom, no solid section bg ── */}
          <div style={{ padding: `0 ${dPad}px ${isTab || isMobile ? 28 : (windowWidth < 1600 ? 14 : 20)}px`, display: "flex", flexDirection: "column", gap: 16, pointerEvents: "auto" }}>

            {/* 3-col on tablet, 2x2 on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isTab ? "1fr 1fr 1fr" : "1fr 1fr", gap: windowWidth < 1600 ? 16 : 16, animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
              {/* Temperature — tablet uses the same SensorMiniCard as desktop */}
              {isTab ? (
                <SensorMiniCard
                  label="Temperature"
                  iconSrc="/icons/icon-temperature.svg"
                  value={latestReading ? `${latestReading.temperature}` : "—"}
                  unit="°C"
                  sub={latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
                  dot={latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
                  active={!!latestReading}
                  compact
                  fixedHeight={150}
                  fadeIn={animationEnabled}
                  isNarrow={isNarrowDesktop}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: windowWidth < 1600 ? "12px 12px 10px" : "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: windowWidth < 1600 ? 145 : 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
                }}>
                  <span style={{
                    position: "absolute", top: 14, right: 14,
                    width: 9, height: 9, borderRadius: "50%",
                    background: latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af",
                    display: "inline-block",
                    animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                    "--dot-glow": latestReading ? hexToRgba(getSensorStatus("temperature", latestReading.temperature).color, 0.5) : "transparent",
                  } as React.CSSProperties} />
                  <img src="/icons/icon-temperature.svg" alt="temp"
                    style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 8 }} />
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: windowWidth < 1600 ? 11.5 : 13, color: "#77ABB2" }}>Temperature</p>
                  <div style={{ animation: animationEnabled ? 'cardDataFadeIn 0.8s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: windowWidth < 1600 ? 22 : 26, color: "#6b7280" }}>
                        {latestReading ? latestReading.temperature : "—"}
                      </span>
                      {latestReading && <span style={{ fontWeight: 700, fontSize: windowWidth < 1600 ? 12 : 14, color: "#6b7280" }}> °C</span>}
                    </p>
                    {latestReading && (
                      <p style={{ margin: 0, fontSize: 11, color: "#8E8B8B", lineHeight: 1.3 }}>
                        {getSensorStatus("temperature", latestReading.temperature).label}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Turbidity */}
              {isTab ? (
                <SensorMiniCard
                  label="Turbidity"
                  iconSrc="/icons/icon-turbidity.svg"
                  value={latestReading ? `${latestReading.turbidity}` : "—"}
                  unit="NTU"
                  sub={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).label : ""}
                  dot={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af"}
                  active={!!latestReading}
                  compact
                  fixedHeight={150}
                  fadeIn={animationEnabled}
                  isNarrow={isNarrowDesktop}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: windowWidth < 1600 ? "12px 12px 10px" : "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: windowWidth < 1600 ? 145 : 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
                }}>
                  <span style={{
                    position: "absolute", top: 14, right: 14,
                    width: 9, height: 9, borderRadius: "50%",
                    background: latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af",
                    display: "inline-block",
                    animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                    "--dot-glow": latestReading ? hexToRgba(getSensorStatus("turbidity", latestReading.turbidity).color, 0.5) : "transparent",
                  } as React.CSSProperties} />
                  <img src="/icons/icon-turbidity.svg" alt="turbidity"
                    style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 8 }} />
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: windowWidth < 1600 ? 11.5 : 13, color: "#77ABB2" }}>Turbidity</p>
                  <div style={{ animation: animationEnabled ? 'cardDataFadeIn 0.8s 0.15s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: windowWidth < 1600 ? 22 : 26, color: "#6b7280" }}>
                        {latestReading ? latestReading.turbidity : "—"}
                      </span>
                      {latestReading && <span style={{ fontWeight: 700, fontSize: windowWidth < 1600 ? 12 : 14, color: "#6b7280" }}> NTU</span>}
                    </p>
                    {latestReading && (
                      <p style={{ margin: 0, fontSize: 11, color: "#8E8B8B", lineHeight: 1.3 }}>
                        {getSensorStatus("turbidity", latestReading.turbidity).label}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* pH */}
              {isTab ? (
                <SensorMiniCard
                  label="pH Level"
                  iconSrc="/icons/icon-ph.svg"
                  value={latestReading ? `${latestReading.ph}` : "—"}
                  unit=""
                  sub={latestReading ? getSensorStatus("ph", latestReading.ph).label : ""}
                  dot={latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af"}
                  active={!!latestReading}
                  compact
                  fixedHeight={150}
                  fadeIn={animationEnabled}
                  isNarrow={isNarrowDesktop}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: windowWidth < 1600 ? "12px 12px 10px" : "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: windowWidth < 1600 ? 145 : 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
                }}>
                  <span style={{
                    position: "absolute", top: 14, right: 14,
                    width: 9, height: 9, borderRadius: "50%",
                    background: latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af",
                    display: "inline-block",
                    animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                    "--dot-glow": latestReading ? hexToRgba(getSensorStatus("ph", latestReading.ph).color, 0.5) : "transparent",
                  } as React.CSSProperties} />
                  <img src="/icons/icon-ph.svg" alt="ph"
                    style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 8 }} />
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: windowWidth < 1600 ? 11.5 : 13, color: "#77ABB2" }}>pH Level</p>
                  <div style={{ animation: animationEnabled ? 'cardDataFadeIn 0.8s 0.3s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: windowWidth < 1600 ? 22 : 26, color: "#6b7280" }}>
                        {latestReading ? latestReading.ph : "—"}
                      </span>
                    </p>
                    {latestReading && (
                      <p style={{ margin: 0, fontSize: 11, color: "#8E8B8B", lineHeight: 1.3 }}>
                        {getSensorStatus("ph", latestReading.ph).label}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Total Parameter Readings — hidden on tablet (moved to bottom row) */}
              {!isTab && (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: windowWidth < 1600 ? "12px 12px 10px" : "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  minHeight: windowWidth < 1600 ? 155 : 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
                }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: windowWidth < 1600 ? 15 : 18, color: "#337C85", lineHeight: 1.3 }}>
                      Total Parameter Readings
                    </p>
                    <p style={{ margin: "5px 0 0", color: "#9ca3af", fontSize: 10, lineHeight: 1.4 }}>
                      Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: windowWidth < 1600 ? 22 : 26, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
                      {readings.length}
                    </span>
                    <img src="/icons/icon-readings.svg" alt="readings"
                      style={{ width: 34, height: 34, objectFit: "contain" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Tablet bottom rows: stacked full-width cards */}
            {isTab && (
              <>
                {/* Total Parameter Readings — full width */}
                <div style={{
                  background: "#fff", borderRadius: 20,
                  padding: windowWidth < 1600 ? "14px 20px" : "18px 24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "stretch", justifyContent: "space-between",
                  fontFamily: POPPINS,
                  minHeight: windowWidth < 1600 ? 130 : 140,
                  boxSizing: "border-box" as const,
                  animation: animationEnabled ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: windowWidth < 1600 ? 15 : 22, color: "#337C85", lineHeight: 1.3 }}>
                        Total Parameter Readings
                      </p>
                      <p style={{ margin: "4px 0 10px", color: "#9ca3af", fontSize: windowWidth < 1600 ? 10 : 13, lineHeight: 1.4 }}>
                        Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: windowWidth < 1600 ? 32 : 44, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
                      {readings.length}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src="/icons/icon-readings.svg" alt="readings"
                      style={{ width: 60, height: 60, objectFit: "contain" }} />
                  </div>
                </div>

                {/* Risk Level + Active Alerts — full width */}
                <div style={{
                  background: "#fff", borderRadius: 24,
                  padding: windowWidth < 1600 ? "14px 20px" : "18px 24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "stretch", gap: 14,
                  minHeight: windowWidth < 1600 ? 130 : 140,
                  boxSizing: "border-box" as const,
                  animation: animationEnabled ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: windowWidth < 1600 ? 15 : 22, color: "#337C85", fontFamily: POPPINS }}>
                      Risk Level
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <img src="/icons/icon-risk.svg" alt="risk"
                        style={{ width: 38, height: 38, objectFit: "contain" }} />
                      <span style={{
                        background: "transparent", color: riskColor, borderRadius: 999,
                        border: `1.5px solid ${riskColor}`,
                        padding: windowWidth < 1600 ? "4px 14px" : "6px 20px",
                        fontWeight: 700, fontSize: windowWidth < 1600 ? 13 : 15,
                        fontFamily: POPPINS, textTransform: "capitalize" as const,
                      }}>
                        {getOverallRiskLabel(overallRisk)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: windowWidth < 1600 ? 10 : 13, color: "#9ca3af", fontFamily: POPPINS }}>
                      Based on temperature, turbidity, and pH
                    </p>
                  </div>
                  <div style={{
                    flex: 1, background: "linear-gradient(160deg, #2a7d8c, #3a9aad)",
                    borderRadius: 18, padding: windowWidth < 1600 ? "12px 12px" : "16px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: windowWidth < 1600 ? 11 : 15, color: "#fff", textAlign: "center", fontFamily: POPPINS, letterSpacing: 0.3 }}>
                      Active Alerts
                    </p>
                    <p style={{ margin: 0, fontSize: windowWidth < 1600 ? 36 : 52, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: POPPINS }}>
                      {unacknowledgedAlerts}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Risk Level + Active Alerts — mobile only (tablet has it in the 2-col row above) */}
            {!isTab && (
              <div style={{
                background: "rgba(255,255,255,0.96)", borderRadius: 24,
                padding: "20px 18px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                display: "flex", alignItems: "stretch", gap: 14,
                animation: animationEnabled ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
              }}>
                {/* Risk Level */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <p style={{
                    margin: "0 0 10px", fontWeight: 700, fontSize: 20,
                    color: "#337C85", fontFamily: POPPINS
                  }}>Risk Level</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <img src="/icons/icon-risk.svg" alt="risk"
                      style={{ width: 32, height: 32, objectFit: "contain" }} />
                    <span style={{
                      background: "transparent", color: riskColor, borderRadius: 999,
                      border: `1.5px solid ${riskColor}`,
                      padding: "5px 16px", fontWeight: 700, fontSize: 13,
                      fontFamily: POPPINS, textTransform: "capitalize" as const,
                    }}>
                      {getOverallRiskLabel(overallRisk)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontFamily: POPPINS }}>
                    Based on temperature, turbidity, and pH
                  </p>
                </div>
                {/* Active Alerts */}
                <div style={{
                  flex: 1, background: "linear-gradient(160deg, #2a7d8c, #3a9aad)",
                  borderRadius: 18, padding: "18px 12px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}>
                  <p style={{
                    margin: 0, fontWeight: 700, fontSize: 14, color: "#fff",
                    textAlign: "center", fontFamily: POPPINS
                  }}>Active Alerts</p>
                  <p style={{
                    margin: 0, fontSize: 48, fontWeight: 700, color: "#fff",
                    lineHeight: 1, fontFamily: POPPINS
                  }}>{unacknowledgedAlerts}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {alertsPortal}

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.7; }
          }
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
            60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
          }
          @keyframes contentSlideIn {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardDataFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    );
  }

  // ─── Full dashboard ──────────────────────────────────────────────────────
  const panelPadding = `${isNarrowDesktop ? dPad : 40}px ${dPad}px ${isNarrowDesktop ? dPad : 40}px ${dPad}px`;
  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#e8eff1" }}>

      {/* ── GRADIENT OVERLAY — upper-left to lower-right, seamless fade across full screen ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom right, #357D86 0%, rgba(53,125,134,0.6) 10%, rgba(152,244,255,0) 55%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── LEFT PANEL ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: panelWidth,
          minWidth: 0,
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          padding: panelPadding,
          overflow: "hidden",
          zIndex: 2,
        } as React.CSSProperties}
      >
        {/* Site header */}
        <div style={{ marginBottom: isNarrowDesktop ? 8 : 12, animation: animationEnabled ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
          <h1 style={{
            fontSize: isNarrowDesktop ? 20 : 26,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            lineHeight: 1.15,
            fontFamily: "'Poppins', sans-serif",
          }}>
            {siteData.siteName}
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: isNarrowDesktop ? 10 : 12,
            margin: "1px 0 0 0",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 400,
          }}>
            {displayAddress}
          </p>
        </div>

        {/* ── UNIFIED CARDS GRID (Forces all 5 cards to be identically tall!) ── */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))", 
          gridAutoRows: "1fr", // MAGIC: Forces all implicitly created rows to share exactly the same height as the tallest row.
          gap: isNarrowDesktop ? 10 : 14, 
          marginBottom: isNarrowDesktop ? 12 : 20, 
          animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none" 
        }}>
          {/* Temperature */}
          <div style={{ height: "100%" }}>
            <SensorMiniCard
              label="Temperature"
              iconSrc="/icons/icon-temperature.svg"
              value={latestReading ? `${latestReading.temperature}` : "—"}
              unit="°C"
              sub={latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
              dot={latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
              active={!!latestReading}
              compact
              fadeIn={animationEnabled}
              style={{ padding: sharedPad, height: "100%", justifyContent: "space-between" }}
            />
          </div>
          {/* Turbidity */}
          <div style={{ height: "100%" }}>
            <SensorMiniCard
              label="Turbidity"
              iconSrc="/icons/icon-turbidity.svg"
              value={latestReading ? `${latestReading.turbidity}` : "—"}
              unit="NTU"
              sub={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).label : ""}
              dot={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af"}
              active={!!latestReading}
              compact
              fadeIn={animationEnabled}
              style={{ padding: sharedPad, height: "100%", justifyContent: "space-between" }}
            />
          </div>
          {/* pH */}
          <div style={{ height: "100%" }}>
            <SensorMiniCard
              label="pH Level"
              iconSrc="/icons/icon-ph.svg"
              value={latestReading ? `${latestReading.ph}` : "—"}
              unit=""
              sub={latestReading ? getSensorStatus("ph", latestReading.ph).label : ""}
              dot={latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af"}
              active={!!latestReading}
              compact
              fadeIn={animationEnabled}
              style={{ padding: sharedPad, height: "100%", justifyContent: "space-between" }}
            />
          </div>

          {/* ── Total Parameter Readings ── */}
          <div
            style={{
              gridColumn: "1 / -1", // Span all 3 columns
              background: "#fff",
              borderRadius: 16,
              padding: sharedPad,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              height: "100%", // Fill its grid row
              boxSizing: "border-box" as const,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              animation: animationEnabled ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: isNarrowDesktop ? 17 : 20, color: "#337C85" }}>
                  Total Parameter Readings
                </p>
                <p style={{ margin: isNarrowDesktop ? "2px 0 2px" : "1px 0 4px", color: "#9ca3af", fontSize: isNarrowDesktop ? 11 : 12 }}>
                  Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
                </p>
              </div>
              <p style={{ margin: 0, fontSize: isNarrowDesktop ? 38 : 42, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
                {readings.length}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 4, flexShrink: 0 }}>
              <img src="/icons/icon-readings.svg" alt="readings" style={{ width: isNarrowDesktop ? 38 : 44, height: isNarrowDesktop ? 38 : 44, objectFit: "contain" }} />
            </div>
          </div>

          {/* ── Risk Level + Active Alerts (ONE outer white card) ── */}
          <div
            style={{
              gridColumn: "1 / -1", // Span all 3 columns
              background: "#fff",
              borderRadius: 16,
              padding: sharedPad,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "stretch",
              gap: isNarrowDesktop ? 8 : 12,
              height: "100%", // Fill its grid row
              boxSizing: "border-box" as const,
              animation: animationEnabled ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
            }}
          >
          {/* LEFT: Risk Level */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{
              margin: isNarrowDesktop ? "0 0 4px" : "0 0 5px",
              fontWeight: 700,
              fontSize: isNarrowDesktop ? 17 : 20,
              color: "#337C85",
              fontFamily: "'Poppins', sans-serif",
            }}>
              Risk Level
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: isNarrowDesktop ? 8 : 10, marginBottom: isNarrowDesktop ? 5 : 8 }}>
              <img src="/icons/icon-risk.svg" alt="risk" style={{ width: isNarrowDesktop ? 24 : 28, height: isNarrowDesktop ? 24 : 28, objectFit: "contain" }} />
              <span
                style={{
                  background: "transparent",
                  color: riskColor,
                  border: `1.2px solid ${riskColor}`,
                  borderRadius: 999,
                  padding: isNarrowDesktop ? "4px 12px" : "4px 14px",
                  fontWeight: 700,
                  fontSize: isNarrowDesktop ? 11.5 : 13,
                  fontFamily: "'Poppins', sans-serif",
                  textTransform: "capitalize",
                }}
              >
                {getOverallRiskLabel(overallRisk)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: isNarrowDesktop ? 10.5 : 12, color: "#9ca3af", fontFamily: "'Poppins', sans-serif" }}>
              Based on temperature, turbidity, and pH
            </p>
          </div>

          {/* RIGHT: Active Alerts Container */}
          <div
            style={{
              flex: "0 0 40%", // Fixed smaller width proportion
              background: "#337C85", // Solid teal to match reference
              borderRadius: 12, // Adjusted to pair nicely inside the 16px outer box
              padding: isNarrowDesktop ? "10px 8px" : "14px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: isNarrowDesktop ? 3 : 5,
            }}
          >
            <p style={{
              margin: 0,
              fontWeight: 700,
              fontSize: isNarrowDesktop ? 12 : 14,
              color: "#fff",
              textAlign: "center",
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: 0.2,
            }}>
              Active Alerts
            </p>
            <p style={{
              margin: 0,
              fontSize: isNarrowDesktop ? 38 : 42,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
              fontFamily: "'Poppins', sans-serif",
            }}>
              {unacknowledgedAlerts}
            </p>
          </div>
        </div>
        </div> {/* ── END OF UNIFIED CARDS GRID ── */}
      </div>

      {/* ── MAP LAYER — real MapLibre map ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "auto",
          opacity: mapReady ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <DashboardMap ref={mapRef} onMapReady={() => setMapReady(true)} sites={gpsSites} lngOffset={-0.0015} />
      </div>

      {/* System Operational badge — top right, above gradient */}
      <div
        style={{
          position: "absolute",
          top: dPad,
          right: dPad,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 999,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: "#15803d",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          backdropFilter: "blur(4px)",
          zIndex: 3,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: (backendOk && dataOk) ? "#22c55e" : "#9ca3af",
            display: "inline-block",
            animation: (backendOk && dataOk) ? "dotPulse 3s ease-in-out infinite" : "none",
            transition: "background 0.4s",
            "--dot-glow": (backendOk && dataOk) ? hexToRgba("#22c55e", 0.5) : "transparent",
          } as React.CSSProperties}
        />
        {(backendOk && dataOk) ? "System Operational" : "Device Not Connected"}
      </div>

      {/* Reset map position button — below System Operational badge */}
      <button
        onClick={() => mapRef.current?.resetView()}
        style={{
          position: "absolute",
          top: dPad + 38,
          right: dPad,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          backdropFilter: "blur(4px)",
          zIndex: 3,
        }}
        title="Reset map position"
      >
        <LocateFixed size={17} color="#357D86" strokeWidth={2.5} />
      </button>

      {/* Alert Details Modal */}
      <AlertDetailsModal
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        onAcknowledge={handleAcknowledgeAlert}
      />

      {/* Alerts portal — shared across all layouts */}
      {alertsPortal}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
          60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
        }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardDataFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Sensor card style config — edit here to customize ───────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const POPPINS = "'Poppins', sans-serif";

const SENSOR_CARD_STYLE = {
  // Card
  padding: (isNarrow: boolean) => isNarrow ? "10px 14px 10px 14px" : "20px 26px 20px 26px",
  borderRadius: 20,
  height: (isNarrow: boolean) => isNarrow ? 135 : 205,

  // Icon
  iconSize: (isNarrow: boolean) => isNarrow ? 24 : 44,
  iconGap: (isNarrow: boolean) => isNarrow ? 8 : 12,

  // Label
  labelColor: "#77ABB2",
  labelSize: (isNarrow: boolean) => isNarrow ? 11 : 15,
  labelWeight: 500,
  labelGap: (isNarrow: boolean) => isNarrow ? 2 : 6,

  // Value number
  valueColor: "#6b7280",
  valueSize: (isNarrow: boolean) => isNarrow ? 18 : 30,
  valueWeight: 600,

  // Unit
  unitColor: "#6b7280",
  unitSize: (isNarrow: boolean) => isNarrow ? 12 : 20,
  unitWeight: 700,
  valueGap: (isNarrow: boolean) => isNarrow ? 2 : 6,

  // Sub-text
  subColor: "#8E8B8B",
  subSize: (isNarrow: boolean) => isNarrow ? 10 : 13,
  subWeight: 400,

  // Status dot
  dotSize: 10,
  dotInset: (isNarrow: boolean) => isNarrow ? 12 : 20,
};

function SensorMiniCard({
  label,
  iconSrc,
  value,
  unit,
  sub,
  dot,
  active,
  compact,
  fixedHeight,
  fadeIn,
  isNarrow,
  style,
}: {
  label: string;
  iconSrc: string;
  value: string;
  unit: string;
  sub: string;
  dot: string;
  active: boolean;
  compact?: boolean;
  fixedHeight?: number;
  fadeIn?: boolean;
  isNarrow?: boolean;
  style?: React.CSSProperties;
}) {

  const S = SENSOR_CARD_STYLE;
  const isN = !!isNarrow;
  const cardHeight = fixedHeight ? fixedHeight : compact ? "auto" : (typeof S.height === 'function' ? S.height(isN) : S.height);
  const cardPad = compact ? "16px 18px 14px" : (typeof S.padding === 'function' ? S.padding(isN) : S.padding);
  const iconSize = compact ? 36 : (typeof S.iconSize === 'function' ? S.iconSize(isN) : S.iconSize);
  const iconGap = compact ? 8 : (typeof S.iconGap === 'function' ? S.iconGap(isN) : S.iconGap);
  const labelSize = compact ? 14 : (typeof S.labelSize === 'function' ? S.labelSize(isN) : S.labelSize);
  const labelGap = compact ? 5 : (typeof S.labelGap === 'function' ? S.labelGap(isN) : S.labelGap);
  const valueSize = compact ? 26 : (typeof S.valueSize === 'function' ? S.valueSize(isN) : S.valueSize);
  const unitSize = compact ? 16 : (typeof S.unitSize === 'function' ? S.unitSize(isN) : S.unitSize);
  const valueGap = compact ? 4 : (typeof S.valueGap === 'function' ? S.valueGap(isN) : S.valueGap);
  const subSize = compact ? 11 : (typeof S.subSize === 'function' ? S.subSize(isN) : S.subSize);
  const dotInset = compact ? 14 : (typeof S.dotInset === 'function' ? S.dotInset(isN) : S.dotInset);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: S.borderRadius,
        padding: cardPad,
        boxShadow: "0 2px 12px rgba(0,0,0,0.09)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: cardHeight as any,
        boxSizing: "border-box",
        fontFamily: POPPINS,
        ...style
      }}
    >
      {/* Status dot — pulses when active, grey+static when no data */}
      <span
        style={{
          position: "absolute",
          top: dotInset,
          right: dotInset,
          width: S.dotSize,
          height: S.dotSize,
          borderRadius: "50%",
          background: active ? dot : "#9ca3af",
          display: "inline-block",
          animation: active ? "dotPulse 3s ease-in-out infinite" : "none",
          transition: "background 0.4s",
          "--dot-glow": active ? hexToRgba(dot, 0.5) : "transparent",
        } as React.CSSProperties}
      />

      {/* Icon */}
      <img
        src={iconSrc}
        alt={label}
        style={{ width: iconSize, height: iconSize, objectFit: "contain", marginBottom: iconGap }}
      />

      {/* Label */}
      <p style={{
        margin: `0 0 ${labelGap}px`,
        fontFamily: POPPINS,
        fontWeight: S.labelWeight,
        fontSize: labelSize,
        color: S.labelColor,
        lineHeight: 1.2,
      }}>
        {label}
      </p>

      {/* Value + Unit + Sub — fade in on first data load */}
      <div style={{ animation: fadeIn ? 'cardDataFadeIn 0.8s ease both' : undefined }}>
        <p style={{ margin: `0 0 ${valueGap}px`, lineHeight: 1.2, display: "flex", alignItems: "baseline", gap: 3 }}>
          <span style={{ fontFamily: POPPINS, fontWeight: S.valueWeight, fontSize: valueSize, color: S.valueColor }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontFamily: POPPINS, fontWeight: S.unitWeight, fontSize: unitSize, color: S.unitColor }}>
              {" "}{unit}
            </span>
          )}
        </p>

        {/* Sub-text */}
        {sub && (
          <p style={{
            margin: 0,
            fontFamily: POPPINS,
            fontWeight: S.subWeight,
            fontSize: subSize,
            color: S.subColor,
            lineHeight: 1.3,
          }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helper: sensor status label + color ─────────────────────────────────
function getSensorStatus(
  type: "temperature" | "turbidity" | "ph",
  value: number
): { label: string; color: string } {
  if (type === "temperature") {
    if (value >= 22 && value <= 30)
      return { label: "High Possible Risk", color: "#ef4444" };
    if ((value >= 20 && value < 22) || (value > 30 && value <= 35))
      return { label: "Moderate Risk", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "turbidity") {
    if (value < 5) return { label: "High Possible Risk", color: "#ef4444" };
    if (value <= 15) return { label: "Moderate Risk", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "ph") {
    if (value >= 6.5 && value <= 8.0) return { label: "High Possible Risk", color: "#ef4444" };
    if ((value >= 6.0 && value < 6.5) || (value > 8.0 && value <= 8.5))
      return { label: "Moderate Risk", color: "#f59e0b" };
    return { label: "Safe", color: "#22c55e" };
  }
  return { label: "", color: "#9ca3af" };
}
