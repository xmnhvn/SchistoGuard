import React, { useState, useRef, useEffect } from "react";
import SensorCard from "./SensorCard";
import { AlertItem } from "./AlertItem";
import { DashboardMap } from "./DashboardMap";
import {
  Bell,
  Asterisk,
  type LucideProps,
} from "lucide-react";
import { createPortal } from "react-dom";
import { apiGet, apiPut } from "../utils/api";

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
}: {
  onNavigate?: (view: string) => void;
  setSystemStatus?: (status: "operational" | "down") => void;
  viewMode?: "full" | "sensors-only";
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [alertsDropdownPosition, setAlertsDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1400); // tablets, iPads, Nest Hub, Nest Hub Max, iPad Pro
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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

  const openAlertsDropdown = () => {
    setAlertsDropdownPosition({ top: 68, left: window.innerWidth - 400 });
    setShowAlertsDropdown((prev) => !prev);
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
    const fetchReadings = () => {
      apiGet("/api/sensors/history?interval=5min&range=24h")
        .then((data) => {
          if (Array.isArray(data)) setReadings(data);
          setBackendOk(true);
        })
        .catch(() => setBackendOk(false));
    };
    fetchReadings();
    const interval = setInterval(fetchReadings, 60000);
    return () => clearInterval(interval);
  }, []);

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
      if (!alertsPanelRef.current?.contains(target)) setShowAlertsDropdown(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Listen for the bell icon click from NavigationHeader
  useEffect(() => {
    const handler = () => openAlertsDropdown();
    window.addEventListener("openAlertsDropdown", handler);
    return () => window.removeEventListener("openAlertsDropdown", handler);
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

  // ─── sensors-only mode (unchanged) ──────────────────────────────────────
  if (viewMode === "sensors-only") {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">
            Water Quality Information
          </h1>
          <p className="text-gray-600 mb-6">
            Real-time sensor data for monitoring barangay water quality
          </p>
        </div>
        <div className="mb-6 mt-2 animate-fade-up animate-delay-200 max-w-2xl">
          <SensorCard
            readings={
              latestReading && backendOk && dataOk
                ? {
                  turbidity: latestReading.turbidity,
                  temperature: latestReading.temperature,
                  ph: latestReading.ph,
                }
                : { turbidity: null, temperature: null, ph: null }
            }
            offline={!backendOk || !dataOk}
          />
        </div>
      </div>
    );
  }

  // ─── Mobile layout ───────────────────────────────────────────────────────
  if (viewMode === "full" && isMobile) {
    return (
      /* Outer: full viewport height, map fills background, content scrolls on top */
      <div style={{ position: "relative", height: "calc(100vh - 64px)", overflow: "hidden" }}>

        {/* ── MAP BACKGROUND — fixed behind everything ── */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #e8f4f6 0%, #c8e6ea 40%, #d4ecd0 100%)",
          zIndex: 0,
        }}>
          {/* Grid lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.20 }}
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#357D86" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mgrid)" />
          </svg>
          {/* Teal gradient — strong top-left, fades to transparent bottom-right */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom right, rgba(53,125,134,0.82) 0%, rgba(53,125,134,0.35) 35%, rgba(152,244,255,0) 65%)",
            pointerEvents: "none",
          }} />
          {/* Map pin — upper-right quadrant, always visible above cards */}
          <div style={{
            position: "absolute", top: "22%", left: "68%",
            transform: "translate(-50%, -50%)",
          }}>
            <div style={{ position: "relative", width: 80, height: 80 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(53,125,134,0.13)", animation: "pulse 2s infinite" }} />
              <div style={{ position: "absolute", inset: 13, borderRadius: "50%",
                background: "rgba(53,125,134,0.22)" }} />
              <div style={{ position: "absolute", inset: 26, borderRadius: "50%",
                background: "#357D86" }} />
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT LAYER ── */}
        <div style={{
          position: "absolute", inset: 0,
          overflowY: "auto",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}>

          {/* ── HERO SECTION: site info ── transparent so map shows through */}
          <div style={{ padding: "22px 18px 0 18px", flexShrink: 0 }}>
            {/* Site name */}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0,
              fontFamily: POPPINS, lineHeight: 1.2,
              textShadow: "0 1px 6px rgba(0,0,0,0.18)" }}>
              {siteData.siteName}
            </h1>
            {/* Address */}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", margin: "5px 0 10px",
              fontFamily: POPPINS }}>
              {siteData.area} • {siteData.barangay}, {siteData.municipality}
            </p>
            {/* System Operational badge — left-aligned, under address */}
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
          </div>

          {/* spacer — gives map pin circle breathing room above cards */}
          <div style={{ height: 160, flexShrink: 0 }} />

          {/* ── CARDS — float directly on the map, no solid section bg ── */}
          <div style={{ padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* 2×2 sensor grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Temperature */}
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

              {/* Turbidity */}
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

              {/* pH */}
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

              {/* Total Parameter Readings */}
              <div style={{
                background: "rgba(255,255,255,0.96)", borderRadius: 20,
                padding: "16px 16px 14px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                minHeight: 170, boxSizing: "border-box" as const, fontFamily: POPPINS,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#337C85", lineHeight: 1.3 }}>
                    Total Parameter Readings
                  </p>
                  <p style={{ margin: "5px 0 0", color: "#9ca3af", fontSize: 10, lineHeight: 1.4 }}>
                    Total readings (5 min interval, last 24 hours)
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
            </div>

            {/* Risk Level + Active Alerts */}
            <div style={{
              background: "rgba(255,255,255,0.96)", borderRadius: 24,
              padding: "20px 18px", boxShadow: "0 4px 18px rgba(0,0,0,0.11)",
              display: "flex", alignItems: "stretch", gap: 14,
            }}>
              {/* Risk Level */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 20,
                  color: "#337C85", fontFamily: POPPINS }}>Risk Level</p>
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
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff",
                  textAlign: "center", fontFamily: POPPINS }}>Active Alerts</p>
                <p style={{ margin: 0, fontSize: 48, fontWeight: 700, color: "#fff",
                  lineHeight: 1, fontFamily: POPPINS }}>{unacknowledgedAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.7; }
          }
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
            60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
          }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    );
  }

  // ─── Tablet layout (768–1023 px) — full-screen floating map ─────────────
  if (viewMode === "full" && isTablet) {
    return (
      <div style={{ position: "relative", height: "calc(100vh - 64px)", overflow: "hidden" }}>

        {/* MAP BACKGROUND */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #e8f4f6 0%, #c8e6ea 40%, #d4ecd0 100%)",
          zIndex: 0,
        }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.20 }}
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#357D86" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tgrid)" />
          </svg>
          {/* Teal gradient overlay — strong top-left, fades to transparent */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom right, rgba(53,125,134,0.82) 0%, rgba(53,125,134,0.30) 30%, rgba(152,244,255,0) 60%)",
            pointerEvents: "none",
          }} />
          {/* Map pin — right side, upper area */}
          <div style={{
            position: "absolute", top: "32%", left: "72%",
            transform: "translate(-50%, -50%)",
          }}>
            <div style={{ position: "relative", width: 100, height: 100 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(53,125,134,0.13)", animation: "pulse 2s infinite" }} />
              <div style={{ position: "absolute", inset: 16, borderRadius: "50%",
                background: "rgba(53,125,134,0.22)" }} />
              <div style={{ position: "absolute", inset: 32, borderRadius: "50%",
                background: "#357D86" }} />
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT LAYER */}
        <div style={{
          position: "absolute", inset: 0,
          overflowY: "auto",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}>

          {/* Hero */}
          <div style={{ padding: "28px 28px 0 28px", flexShrink: 0 }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: "#fff", margin: 0,
              fontFamily: POPPINS, lineHeight: 1.2,
              textShadow: "0 1px 6px rgba(0,0,0,0.18)" }}>
              {siteData.siteName}
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", margin: "6px 0 12px",
              fontFamily: POPPINS }}>
              {siteData.area} • {siteData.barangay}, {siteData.municipality}
            </p>
            {/* System Operational badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.92)", borderRadius: 999,
              padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#15803d",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)", backdropFilter: "blur(4px)",
            }}>
              <span style={{
                width: 9, height: 9, borderRadius: "50%",
                background: (backendOk && dataOk) ? "#22c55e" : "#9ca3af",
                display: "inline-block",
                animation: (backendOk && dataOk) ? "dotPulse 3s ease-in-out infinite" : "none",
                "--dot-glow": (backendOk && dataOk) ? "rgba(34,197,94,0.5)" : "transparent",
              } as React.CSSProperties} />
              {(backendOk && dataOk) ? "System Operational" : "System Down"}
            </div>
          </div>

          {/* Spacer — lets map pin breathe above cards */}
          <div style={{ height: 180, flexShrink: 0 }} />

          {/* CARDS — float on the map */}
          <div style={{ padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* 2×2 sensor grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

              {/* Temperature */}
              <div style={{
                background: "rgba(255,255,255,0.97)", borderRadius: 22,
                padding: "20px 20px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                position: "relative", display: "flex", flexDirection: "column",
                minHeight: 180, boxSizing: "border-box" as const, fontFamily: POPPINS,
              }}>
                <span style={{
                  position: "absolute", top: 16, right: 16, width: 10, height: 10, borderRadius: "50%",
                  background: latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af",
                  display: "inline-block",
                  animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus("temperature", latestReading.temperature).color, 0.5) : "transparent",
                } as React.CSSProperties} />
                <img src="/icons/icon-temperature.svg" alt="temp"
                  style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 10 }} />
                <p style={{ margin: "0 0 5px", fontWeight: 500, fontSize: 14, color: "#77ABB2" }}>Temperature</p>
                <p style={{ margin: "0 0 5px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 28, color: "#6b7280" }}>{latestReading ? latestReading.temperature : "—"}</span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: "#6b7280" }}> °C</span>}
                </p>
                {latestReading && <p style={{ margin: 0, fontSize: 12, color: "#8E8B8B", lineHeight: 1.3 }}>{getSensorStatus("temperature", latestReading.temperature).label}</p>}
              </div>

              {/* Turbidity */}
              <div style={{
                background: "rgba(255,255,255,0.97)", borderRadius: 22,
                padding: "20px 20px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                position: "relative", display: "flex", flexDirection: "column",
                minHeight: 180, boxSizing: "border-box" as const, fontFamily: POPPINS,
              }}>
                <span style={{
                  position: "absolute", top: 16, right: 16, width: 10, height: 10, borderRadius: "50%",
                  background: latestReading ? getSensorStatus("turbidity", latestReading.turbidity).color : "#9ca3af",
                  display: "inline-block",
                  animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus("turbidity", latestReading.turbidity).color, 0.5) : "transparent",
                } as React.CSSProperties} />
                <img src="/icons/icon-turbidity.svg" alt="turbidity"
                  style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 10 }} />
                <p style={{ margin: "0 0 5px", fontWeight: 500, fontSize: 14, color: "#77ABB2" }}>Turbidity</p>
                <p style={{ margin: "0 0 5px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 28, color: "#6b7280" }}>{latestReading ? latestReading.turbidity : "—"}</span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: "#6b7280" }}> NTU</span>}
                </p>
                {latestReading && <p style={{ margin: 0, fontSize: 12, color: "#8E8B8B", lineHeight: 1.3 }}>{getSensorStatus("turbidity", latestReading.turbidity).label}</p>}
              </div>

              {/* pH */}
              <div style={{
                background: "rgba(255,255,255,0.97)", borderRadius: 22,
                padding: "20px 20px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                position: "relative", display: "flex", flexDirection: "column",
                minHeight: 180, boxSizing: "border-box" as const, fontFamily: POPPINS,
              }}>
                <span style={{
                  position: "absolute", top: 16, right: 16, width: 10, height: 10, borderRadius: "50%",
                  background: latestReading ? getSensorStatus("ph", latestReading.ph).color : "#9ca3af",
                  display: "inline-block",
                  animation: latestReading ? "dotPulse 3s ease-in-out infinite" : "none",
                  "--dot-glow": latestReading ? hexToRgba(getSensorStatus("ph", latestReading.ph).color, 0.5) : "transparent",
                } as React.CSSProperties} />
                <img src="/icons/icon-ph.svg" alt="ph"
                  style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 10 }} />
                <p style={{ margin: "0 0 5px", fontWeight: 500, fontSize: 14, color: "#77ABB2" }}>pH Level</p>
                <p style={{ margin: "0 0 5px", lineHeight: 1.1, display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 28, color: "#6b7280" }}>{latestReading ? latestReading.ph : "—"}</span>
                </p>
                {latestReading && <p style={{ margin: 0, fontSize: 12, color: "#8E8B8B", lineHeight: 1.3 }}>{getSensorStatus("ph", latestReading.ph).label}</p>}
              </div>

              {/* Total Parameter Readings */}
              <div style={{
                background: "rgba(255,255,255,0.97)", borderRadius: 22,
                padding: "20px 20px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                minHeight: 180, boxSizing: "border-box" as const, fontFamily: POPPINS,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#337C85", lineHeight: 1.3 }}>
                    Total Parameter Readings
                  </p>
                  <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 12, lineHeight: 1.4 }}>
                    Total readings (5 min interval, last 24 hours)
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, color: "#6b7280", lineHeight: 1 }}>
                    {readings.length}
                  </span>
                  <img src="/icons/icon-readings.svg" alt="readings"
                    style={{ width: 38, height: 38, objectFit: "contain" }} />
                </div>
              </div>
            </div>

            {/* Risk Level + Active Alerts */}
            <div style={{
              background: "rgba(255,255,255,0.97)", borderRadius: 24,
              padding: "22px 22px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
              display: "flex", alignItems: "stretch", gap: 16,
            }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 22,
                  color: "#337C85", fontFamily: POPPINS }}>Risk Level</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <img src="/icons/icon-risk.svg" alt="risk"
                    style={{ width: 36, height: 36, objectFit: "contain" }} />
                  <span style={{
                    background: "#3d3d3d", color: "#fff", borderRadius: 999,
                    padding: "6px 20px", fontWeight: 700, fontSize: 14,
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
                borderRadius: 18, padding: "20px 14px",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 8,
              }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#fff",
                  textAlign: "center", fontFamily: POPPINS }}>Active Alerts</p>
                <p style={{ margin: 0, fontSize: 52, fontWeight: 700, color: "#fff",
                  lineHeight: 1, fontFamily: POPPINS }}>{unacknowledgedAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.7; }
          }
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
            60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
          }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    );
  }

  // ─── Full dashboard ──────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", height: "calc(100vh - 64px)", overflow: "hidden" }}>

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
          width: "44%",
          minWidth: 460,
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          padding: "50px 50px 50px 50px",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          zIndex: 2,
        } as React.CSSProperties}
      >
        {/* Site header */}
        <div style={{ marginBottom: 24 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: 30, marginBottom: 30 }}>
          {/* Temperature */}
          <SensorMiniCard
            label="Temperature"
            iconSrc="/icons/icon-temperature.svg"
            value={latestReading ? `${latestReading.temperature}` : "—"}
            unit="°C"
            sub={latestReading ? getSensorStatus("temperature", latestReading.temperature).label : ""}
            dot={latestReading ? getSensorStatus("temperature", latestReading.temperature).color : "#9ca3af"}
            active={!!latestReading}
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
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 27, color: "#337C85" }}>
              Total Parameter Readings
            </p>
            <p style={{ margin: "4px 0 12px", color: "#9ca3af", fontSize: 13 }}>
              Total readings (5 min interval, last 24 hours)
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

      {/* ── MAP LAYER — full background, interactive ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #e8f4f6 0%, #c8e6ea 40%, #d4ecd0 100%)",
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "auto",
          touchAction: "pan-x pan-y",
        }}
      >
        {/* Leaflet Map */}
        <DashboardMap sites={[
          { id: 'site-1', name: siteData.siteName || "Mang Jose's Fish Pond", lat: 11.2447, lng: 125.0041 }
        ]} />

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

      {/* Map attribution placeholder — above gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          fontSize: 11,
          color: "#9ca3af",
          background: "rgba(255,255,255,0.7)",
          borderRadius: 4,
          padding: "2px 8px",
          zIndex: 3,
        }}
      >
        Map placeholder — Google Maps API
      </div>

      {/* ── Alerts dropdown portal ── */}
      {showAlertsDropdown &&
        alertsDropdownPosition &&
        createPortal(
          <div
            ref={alertsPanelRef}
            className="fixed w-96 bg-white border rounded-md shadow-xl"
            style={{
              zIndex: 9999,
              top: `${alertsDropdownPosition.top}px`,
              left: `${alertsDropdownPosition.left}px`,
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-bold text-schistoguard-navy text-sm">Alerts Stream</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${unacknowledgedAlerts > 0
                  ? "bg-schistoguard-teal text-white"
                  : "bg-gray-100 text-gray-500"
                  }`}
              >
                {unacknowledgedAlerts} unread
              </span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              {alerts.filter((a) => !a.isAcknowledged).length > 0 ? (
                alerts
                  .filter((a) => !a.isAcknowledged)
                  .map((alert) => {
                    const level: "critical" | "warning" =
                      alert.level === "critical" ? "critical" : "warning";
                    return (
                      <div key={alert.id} className="px-4 py-3 border-b last:border-b-0">
                        <AlertItem
                          {...alert}
                          level={level}
                          onAcknowledge={handleAcknowledgeAlert}
                          siteName={siteData.siteName}
                          value={alert.value}
                          timestamp={alert.timestamp}
                          message={alert.message ?? ""}
                        />
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                  <Bell className="w-6 h-6 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No alerts</p>
                  <p className="text-xs text-gray-400 mt-1">All clear!</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow); }
          60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
        }
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
}: {
  label: string;
  iconSrc: string;
  value: string;
  unit: string;
  sub: string;
  dot: string;
  active: boolean;
}) {
  const S = SENSOR_CARD_STYLE;
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: S.borderRadius,
        padding: S.padding,
        boxShadow: "0 2px 12px rgba(0,0,0,0.09)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: S.height,
        boxSizing: "border-box",
        fontFamily: POPPINS,
      }}
    >
      {/* Status dot — pulses when active, grey+static when no data */}
      <span
        style={{
          position: "absolute",
          top: S.dotInset,
          right: S.dotInset,
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
        style={{ width: S.iconSize, height: S.iconSize, objectFit: "contain", marginBottom: S.iconGap }}
      />

      {/* Label */}
      <p style={{
        margin: `0 0 ${S.labelGap}px`,
        fontFamily: POPPINS,
        fontWeight: S.labelWeight,
        fontSize: S.labelSize,
        color: S.labelColor,
        lineHeight: 1.2,
      }}>
        {label}
      </p>

      {/* Value + Unit */}
      <p style={{ margin: `0 0 ${S.valueGap}px`, lineHeight: 1.2, display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontFamily: POPPINS, fontWeight: S.valueWeight, fontSize: S.valueSize, color: S.valueColor }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: POPPINS, fontWeight: S.unitWeight, fontSize: S.unitSize, color: S.unitColor }}>
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
          fontSize: S.subSize,
          color: S.subColor,
          lineHeight: 1.3,
        }}>
          {sub}
        </p>
      )}
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
