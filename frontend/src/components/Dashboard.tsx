import React, { useState, useRef, useEffect } from "react";
import { AlertItem } from "./AlertItem";
import { DashboardMap } from "./DashboardMap";
import type { DashboardMapHandle } from "./DashboardMap";
import {
  Bell,
  Asterisk,
  LocateFixed,
  type LucideProps,
} from "lucide-react";
import { createPortal } from "react-dom";
import { apiGet, apiPut } from "../utils/api";

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
}: {
  onNavigate?: (view: string) => void;
  setSystemStatus?: (status: "operational" | "down") => void;
  viewMode?: "full" | "sensors-only";
  visible?: boolean;
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  // Interval config state
  const [intervalValue, setIntervalValue] = useState(5);
  const [intervalUnit, setIntervalUnit] = useState("min");
  const [mapReady, setMapReady] = useState(false);
  // Only animate on the very first load — not on re-navigation (Dashboard stays mounted)
  const animate = !_dashboardFirstLoadDone;

  // When the Dashboard becomes visible again (after being hidden), resize the map
  useEffect(() => {
    if (visible && mapReady) {
      // Small delay so the container has non-zero dimensions after display switches
      const t = setTimeout(() => mapRef.current?.resize(), 50);
      return () => clearTimeout(t);
    }
  }, [visible, mapReady]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [alertsClosing, setAlertsClosing] = useState(false);
  const alertsOpenRef = useRef(false);
  const alertsClosingRef = useRef(false);
  const mapRef = useRef<DashboardMapHandle>(null);
  const [alertsDropdownPosition, setAlertsDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 600);
      setIsTablet(w >= 600 && w < 1100); // tablets, iPads, Nest Hub, iPad Pro
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setSidebarOpen((e as CustomEvent).detail?.open ?? false);
    };
    window.addEventListener("sidebarDrawerChanged", handler);
    return () => window.removeEventListener("sidebarDrawerChanged", handler);
  }, []);
  const [siteData, setSiteData] = useState<any>({
    siteName: "Mang Jose's Fish Pond",
    barangay: "San Miguel",
    municipality: "Tacloban City",
    area: "100 square meters",
  });
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
          setLatestReading(data);
          setBackendOk(true);
          setDataOk(true);
          if (data && data.siteName)
            setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
        })
        .catch(() => {
          setBackendOk(false);
          setDataOk(false);
        });
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible && !_dashboardFirstLoadDone) {
      setTimeout(() => { _dashboardFirstLoadDone = true; }, 50);
    }
  }, [visible]);

  // Load interval config from backend
  useEffect(() => {
    let lastIntervalMs = null;
    const fetchIntervalConfig = async () => {
      try {
        const data = await apiGet("/api/sensors/interval-config");
        let ms = data.intervalMs || 300000;
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
      setSystemStatus(!backendOk || !dataOk ? "down" : "operational");
    }
  }, [backendOk, dataOk, setSystemStatus]);

  useEffect(() => {
    const fetchAlerts = () => {
      apiGet("/api/sensors/alerts")
        .then((data) => {
          if (Array.isArray(data)) {
            setAlerts(
              data.filter((alert) =>
                ["Temperature", "Turbidity", "pH"].includes(alert.parameter)
              )
            );
          }
        })
        .catch(() => { });
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, isAcknowledged: true } : alert
      )
    );
    apiPut(`/api/sensors/alerts/${alertId}/acknowledge`, {
      acknowledgedBy: "Current User (LGU)",
    })
      .then((data) => {
        if (data.success && data.alert) {
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === alertId ? { ...alert, ...data.alert } : alert
            )
          );
        }
      })
      .catch(() => { });
  };

  const unacknowledgedAlerts = alerts.filter(
    (alert) =>
      !alert.isAcknowledged &&
      (alert.level === "critical" || alert.level === "warning")
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
    if (temp >= 25 && temp <= 30) tempRisk = "critical";
    else if ((temp >= 20 && temp < 25) || (temp > 30 && temp <= 32)) tempRisk = "warning";

    let turbidityRisk: "critical" | "warning" | "safe" = "safe";
    if (turbidity < 5) turbidityRisk = "critical";
    else if (turbidity >= 5 && turbidity <= 15) turbidityRisk = "warning";

    let phRisk: "critical" | "warning" | "safe" = "safe";
    if (ph >= 7.0 && ph <= 8.5) phRisk = "critical";
    else if ((ph >= 6.5 && ph < 7.0) || (ph > 8.5 && ph <= 9.0)) phRisk = "warning";

    if ([tempRisk, turbidityRisk, phRisk].includes("critical")) overallRisk = "critical";
    else if ([tempRisk, turbidityRisk, phRisk].includes("warning")) overallRisk = "warning";
  }

  const riskColor =
    overallRisk === "critical"
      ? "#ef4444"
      : overallRisk === "warning"
        ? "#f59e0b"
        : "#22c55e";

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
    const panelLeft = isMobilePanel
      ? SIDEBAR_W + CARD_PAD
      : vw - Math.min(500, vw - 80) - 16;
    const panelW = isMobilePanel
      ? vw - SIDEBAR_W - CARD_PAD * 2
      : Math.min(500, vw - 80);
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
        <div style={{ maxHeight: bodyMaxH, overflowY: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
          {alerts.filter((a) => !a.isAcknowledged).length > 0 ? (
            alerts.filter((a) => !a.isAcknowledged).map((alert) => {
              const level: "critical" | "warning" = alert.level === "critical" ? "critical" : "warning";
              return (
                <div key={alert.id} style={{ padding: sm ? "10px 14px" : "14px 22px", borderBottom: "1px solid #f5f5f5" }}>
                  <AlertItem
                    {...alert} level={level}
                    onAcknowledge={handleAcknowledgeAlert}
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
            <DashboardMap mobileMode={true} interactive={isTablet} />
          ) : (
            <DashboardMap />
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
            padding: compactCards ? "18px 14px 18px" : "30px 30px 30px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
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
                paddingLeft: isMobile ? 40 : 0,
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
                {(backendOk && dataOk) ? "System Operational" : "System Down"}
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
              value={latestReading ? `${latestReading.temperature}` : "—"}
              unit="°C"
              sub={latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
              dot={latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
              active={!!latestReading}
              compact={compactCards}
              fadeIn={animate}
            />

            <SensorMiniCard
              label="Turbidity"
              iconSrc="/icons/icon-turbidity.svg"
              value={latestReading ? `${latestReading.turbidity}` : "—"}
              unit="NTU"
              sub={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).label : ""}
              dot={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af"}
              active={!!latestReading}
              compact={compactCards}
              fadeIn={animate}
            />

            <SensorMiniCard
              label="pH Level"
              iconSrc="/icons/icon-ph.svg"
              value={latestReading ? `${latestReading.ph}` : "—"}
              unit=""
              sub={latestReading ? getSensorStatus("ph", latestReading.ph).label : ""}
              dot={latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af"}
              active={!!latestReading}
              compact={compactCards}
              fadeIn={animate}
            />
          </div>
        </div>

        <style>{`
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
            60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
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

  // ─── Mobile layout ───────────────────────────────────────────────────────
  if (viewMode === "full" && (isMobile || isTablet)) {
    const isTab = isTablet;
    return (
      /* Outer: full viewport height, map fills background, content scrolls on top */
      <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#e8eff1" }}>

        {/* ── MAP BACKGROUND — real MapLibre map ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: mapReady ? 1 : 0, transition: "opacity 0.8s ease" }}>
          <DashboardMap ref={mapRef} mobileMode={true} interactive={isTablet} onMapReady={() => setMapReady(true)} />
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
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          pointerEvents: isTab ? "none" : "auto",
        } as React.CSSProperties}>

          {/* ── HERO SECTION: site info ── transparent so map shows through */}
          <div style={{ padding: isTab ? "28px 28px 0" : "22px 18px 0 18px", flexShrink: 0, pointerEvents: "auto", animation: animate ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
            {/* Site name */}
            <h1 style={{
              fontSize: isTab ? 32 : 24, fontWeight: 700, color: "#fff", margin: 0,
              fontFamily: POPPINS, lineHeight: 1.2,
              textShadow: "0 1px 6px rgba(0,0,0,0.18)"
            }}>
              {siteData.siteName}
            </h1>
            {/* Address */}
            <p style={{
              fontSize: isTab ? 15 : 13, color: "rgba(255,255,255,0.9)", margin: "5px 0 10px",
              fontFamily: POPPINS
            }}>
              {siteData.area} • {siteData.barangay}, {siteData.municipality}
            </p>
            {/* System Operational badge — left-aligned, under address */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.92)", borderRadius: 999,
                padding: "5px 13px", fontSize: 12, fontWeight: 600, color: "#15803d",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)", backdropFilter: "blur(4px)",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: (backendOk && dataOk) ? "#22c55e" : "#9ca3af",
                  display: "inline-block",
                  animation: (backendOk && dataOk) ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": (backendOk && dataOk) ? "rgba(34,197,94,0.5)" : "transparent",
                } as React.CSSProperties} />
                {(backendOk && dataOk) ? "System Operational" : "System Down"}
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
          <div style={{ flex: 1, minHeight: isTab ? 40 : 80 }} />

          {/* ── CARDS — anchored to bottom, no solid section bg ── */}
          <div style={{ padding: isTab ? "0 28px 28px" : "0 14px 20px", display: "flex", flexDirection: "column", gap: isTab ? 16 : 16, pointerEvents: "auto" }}>

            {/* 3-col on tablet, 2x2 on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isTab ? "1fr 1fr 1fr" : "1fr 1fr", gap: isTab ? 16 : 16, animation: animate ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
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
                  fadeIn={animate}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
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
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 13, color: "#77ABB2" }}>Temperature</p>
                  <div style={{ animation: animate ? 'cardDataFadeIn 0.8s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 26, color: "#6b7280" }}>
                        {latestReading ? latestReading.temperature : "—"}
                      </span>
                      {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: "#6b7280" }}> °C</span>}
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
                  fadeIn={animate}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
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
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 13, color: "#77ABB2" }}>Turbidity</p>
                  <div style={{ animation: animate ? 'cardDataFadeIn 0.8s 0.15s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 26, color: "#6b7280" }}>
                        {latestReading ? latestReading.turbidity : "—"}
                      </span>
                      {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: "#6b7280" }}> NTU</span>}
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
                  fadeIn={animate}
                />
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.96)", borderRadius: 20,
                  padding: "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  position: "relative", display: "flex", flexDirection: "column",
                  minHeight: 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
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
                  <p style={{ margin: "0 0 4px", fontWeight: 500, fontSize: 13, color: "#77ABB2" }}>pH Level</p>
                  <div style={{ animation: animate ? 'cardDataFadeIn 0.8s 0.3s ease both' : undefined }}>
                    <p style={{ margin: "0 0 4px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 26, color: "#6b7280" }}>
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
                  padding: "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  minHeight: 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#337C85", lineHeight: 1.3 }}>
                      Total Parameter Readings
                    </p>
                    <p style={{ margin: "5px 0 0", color: "#9ca3af", fontSize: 10, lineHeight: 1.4 }}>
                      Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
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
                  padding: "20px 22px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontFamily: POPPINS,
                  animation: animate ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 20, color: "#337C85", lineHeight: 1.3 }}>
                      Total Parameter Readings
                    </p>
                    <p style={{ margin: "4px 0 10px", color: "#9ca3af", fontSize: 12, lineHeight: 1.4 }}>
                      Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
                    </p>
                    <p style={{ margin: 0, fontSize: 40, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
                      {readings.length}
                    </p>
                  </div>
                  <img src="/icons/icon-readings.svg" alt="readings"
                    style={{ width: 54, height: 54, objectFit: "contain", flexShrink: 0 }} />
                </div>

                {/* Risk Level + Active Alerts — full width */}
                <div style={{
                  background: "#fff", borderRadius: 24,
                  padding: "20px 22px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  display: "flex", alignItems: "stretch", gap: 14,
                  animation: animate ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 20, color: "#337C85", fontFamily: POPPINS }}>
                      Risk Level
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <img src="/icons/icon-risk.svg" alt="risk"
                        style={{ width: 36, height: 36, objectFit: "contain" }} />
                      <span style={{
                        background: "#3d3d3d", color: "#fff", borderRadius: 999,
                        padding: "5px 18px",
                        fontWeight: 700, fontSize: 14,
                        fontFamily: POPPINS, textTransform: "capitalize" as const,
                      }}>
                        {overallRisk.charAt(0).toUpperCase() + overallRisk.slice(1)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontFamily: POPPINS }}>
                      Based on temperature, turbidity, and pH
                    </p>
                  </div>
                  <div style={{
                    flex: 1, background: "linear-gradient(160deg, #2a7d8c, #3a9aad)",
                    borderRadius: 18, padding: "20px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff", textAlign: "center", fontFamily: POPPINS, letterSpacing: 0.3 }}>
                      Active Alerts
                    </p>
                    <p style={{ margin: 0, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: POPPINS }}>
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
                animation: animate ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
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
                      background: "#3d3d3d", color: "#fff", borderRadius: 999,
                      padding: "5px 16px", fontWeight: 700, fontSize: 13,
                      fontFamily: POPPINS, textTransform: "capitalize" as const,
                    }}>
                      {overallRisk.charAt(0).toUpperCase() + overallRisk.slice(1)}
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
  const vw = window.innerWidth;
  const isNarrowDesktop = vw < 1400;
  const panelWidth = isNarrowDesktop ? "58%" : "44%";
  const panelPadding = isNarrowDesktop ? "40px 32px 40px 32px" : "50px 50px 50px 50px";
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
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          zIndex: 2,
        } as React.CSSProperties}
      >
        {/* Site header */}
        <div style={{ marginBottom: 24, animation: animate ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
          <h1 style={{
            fontSize: 38,
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
            fontSize: 16,
            margin: "6px 0 0 0",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 400,
          }}>
            {siteData.area} • {siteData.barangay}, {siteData.municipality}
          </p>
        </div>

        {/* ── 3 Sensor mini-cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 30, animation: animate ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none" }}>
          {/* Temperature */}
          <SensorMiniCard
            label="Temperature"
            iconSrc="/icons/icon-temperature.svg"
            value={latestReading ? `${latestReading.temperature}` : "—"}
            unit="°C"
            sub={latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
            dot={latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
            active={!!latestReading}
            fadeIn={animate}
          />
          {/* Turbidity */}
          <SensorMiniCard
            label="Turbidity"
            iconSrc="/icons/icon-turbidity.svg"
            value={latestReading ? `${latestReading.turbidity}` : "—"}
            unit="NTU"
            sub={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).label : ""}
            dot={latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af"}
            active={!!latestReading}
            fadeIn={animate}
          />
          {/* pH */}
          <SensorMiniCard
            label="pH Level"
            iconSrc="/icons/icon-ph.svg"
            value={latestReading ? `${latestReading.ph}` : "—"}
            unit=""
            sub={latestReading ? getSensorStatus("ph", latestReading.ph).label : ""}
            dot={latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af"}
            active={!!latestReading}
            fadeIn={animate}
          />
        </div>

        {/* ── Total Parameter Readings ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "24px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 30,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            animation: animate ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 27, color: "#337C85" }}>
              Total Parameter Readings
            </p>
            <p style={{ margin: "4px 0 12px", color: "#9ca3af", fontSize: 13 }}>
              Total readings ({intervalValue} {intervalUnit} interval, last 24 hours)
            </p>
            <p style={{ margin: 0, fontSize: 44, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
              {readings.length}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 10, flexShrink: 0 }}>
            <img src="/icons/icon-readings.svg" alt="readings" style={{ width: 68, height: 68, objectFit: "contain" }} />
          </div>
        </div>

        {/* ── Risk Level + Active Alerts (ONE outer white card) ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "24px 26px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "stretch",
            gap: 16,
            animation: animate ? "contentSlideIn 0.7s 0.45s cubic-bezier(0.22,1,0.36,1) both" : "none",
          }}
        >
          {/* LEFT: Risk Level */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{
              margin: "0 0 10px",
              fontWeight: 600,
              fontSize: 27,
              color: "#337C85",
              fontFamily: "'Poppins', sans-serif",
            }}>
              Risk Level
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
              <img src="/icons/icon-risk.svg" alt="risk" style={{ width: 40, height: 40, objectFit: "contain" }} />
              <span
                style={{
                  background: "#3d3d3d",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "6px 22px",
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: "'Poppins', sans-serif",
                  textTransform: "capitalize",
                }}
              >
                {overallRisk.charAt(0).toUpperCase() + overallRisk.slice(1)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontFamily: "'Poppins', sans-serif" }}>
              Based on temperature, turbidity, and pH
            </p>
          </div>

          {/* RIGHT: Active Alerts — inset teal card (display only, no click) */}
          <div
            style={{
              flex: 1,
              background: "linear-gradient(160deg, #2a7d8c, #3a9aad)",
              borderRadius: 18,
              padding: "20px 16px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <p style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
              textAlign: "center",
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: 0.3,
            }}>
              Active Alerts
            </p>
            <p style={{
              margin: 0,
              fontSize: 52,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
              fontFamily: "'Poppins', sans-serif",
            }}>
              {unacknowledgedAlerts}
            </p>
          </div>
        </div>
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
        <DashboardMap ref={mapRef} onMapReady={() => setMapReady(true)} />
      </div>

      {/* System Operational badge — top right, above gradient */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
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
        {(backendOk && dataOk) ? "System Operational" : "System Down"}
      </div>

      {/* Reset map position button — below System Operational badge */}
      <button
        onClick={() => mapRef.current?.resetView()}
        style={{
          position: "absolute",
          top: 54,
          right: 16,
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
  padding: "20px 26px 20px 26px",   // matches bottom cards' 26px sides
  borderRadius: 20,
  height: 205,

  // Icon
  iconSize: 44,
  iconGap: 12,            // space below icon before label

  // Label (e.g. "Temperature")
  labelColor: "#77ABB2",
  labelSize: 15,
  labelWeight: 500,
  labelGap: 6,            // space below label before value

  // Value number (e.g. "31.19")
  valueColor: "#6b7280",
  valueSize: 30,
  valueWeight: 600,

  // Unit (e.g. "°C", "NTU")
  unitColor: "#6b7280",
  unitSize: 20,
  unitWeight: 700,
  valueGap: 6,            // space below value before sub-text

  // Sub-text (e.g. "Moderate Risk")
  subColor: "#8E8B8B",
  subSize: 13,
  subWeight: 400,

  // Status dot
  dotSize: 10,
  dotInset: 20,           // distance from card corner (more inward = not at very edge)
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
  fadeIn,
}: {
  label: string;
  iconSrc: string;
  value: string;
  unit: string;
  sub: string;
  dot: string;
  active: boolean;
  compact?: boolean;
  fadeIn?: boolean;
}) {

  const S = SENSOR_CARD_STYLE;
  const cardHeight = compact ? "auto" : S.height;
  const cardPad = compact ? "16px 18px 14px" : S.padding;
  const iconSize = compact ? 36 : S.iconSize;
  const iconGap = compact ? 8 : S.iconGap;
  const labelSize = compact ? 14 : S.labelSize;
  const labelGap = compact ? 5 : S.labelGap;
  const valueSize = compact ? 26 : S.valueSize;
  const unitSize = compact ? 16 : S.unitSize;
  const valueGap = compact ? 4 : S.valueGap;
  const subSize = compact ? 11 : S.subSize;
  const dotInset = compact ? 14 : S.dotInset;
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
    if (value >= 25 && value <= 30)
      return { label: "Possible Schistosomiasis Risk", color: "#E7B213" };
    if ((value >= 20 && value < 25) || (value > 30 && value <= 32))
      return { label: "Moderate Risk", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "turbidity") {
    if (value < 5) return { label: "Clear Water – Higher Schisto Risk", color: "#ef4444" };
    if (value <= 15) return { label: "Moderate Turbidity", color: "#E7B213" };
    return { label: "High Turbidity", color: "#22c55e" };
  }
  if (type === "ph") {
    if (value >= 7.0 && value <= 8.5) return { label: "Critical Range", color: "#ef4444" };
    if ((value >= 6.5 && value < 7.0) || (value > 8.5 && value <= 9.0))
      return { label: "Warning Range", color: "#f59e0b" };
    return { label: "Safe", color: "#22c55e" };
  }
  return { label: "", color: "#9ca3af" };
}
