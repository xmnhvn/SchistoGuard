import React, { useState, useEffect, useRef } from "react";
import { AlertItem } from "./AlertItem";
import { AlertDetailsModal } from "./AlertDetailsModal";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Bell,
  X,
  ChevronRight,
  Trash2,
  Check,
} from "lucide-react";
import { apiGet, apiPost } from "../utils/api";

const POPPINS = "'Poppins', sans-serif";

let _alertsFirstLoadDone = false;

export function AlertsPage({ onNavigate, visible = true, user, deviceConnected = true }: { onNavigate?: (view: string) => void; visible?: boolean; user?: any; deviceConnected?: boolean }) {
  // Use logged-in user for acknowledge
  const userName = user ? `${user.firstName} ${user.lastName} (${user.role ? user.role.toUpperCase() : ''})` : "Unknown";
  function formatDateTime(dt: string) {
    if (!dt) return '-';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  const [alerts, setAlerts] = useState<any[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenAlerts, setHiddenAlerts] = useState<string[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(!_alertsFirstLoadDone);

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!deleteMode) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAlerts.length) {
      setSelectedIds(new Set()); // deselect all
    } else {
      setSelectedIds(new Set(filteredAlerts.map(a => a.id)));
    }
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    setHiddenAlerts(prev => {
      return [...prev, ...ids];
    });
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
  };
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1100;

  useEffect(() => {
    if (visible && !_alertsFirstLoadDone) {
      setAnimationEnabled(true);
      const timer = setTimeout(() => {
        setAnimationEnabled(false);
        _alertsFirstLoadDone = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !_alertsFirstLoadDone) {
      setTimeout(() => { _alertsFirstLoadDone = true; }, 50);
    }
  }, [visible]);

  useEffect(() => {
    const fetchAlerts = () => {
      apiGet("/api/sensors/alerts")
        .then((data) => {
          console.log('Fetched alerts:', data); // DEBUG LOG
          if (Array.isArray(data)) {
            const sanitized = data
              .filter(alert => ["Temperature", "Turbidity", "pH"].includes(alert.parameter))
              .map(alert => ({
                ...alert,
                barangay: (!alert.barangay || alert.barangay === "Unknown") && alert.siteName === "Matina Site"
                  ? "Matina Crossing"
                  : (alert.barangay === "Unknown" ? "N/A" : alert.barangay)
              }));
            setAlerts(sanitized);
          }
        })
        .catch((err) => { console.error('Error fetching alerts:', err); });
    };
    fetchAlerts();
    // Check for new alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [deviceConnected]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterBarangay, setFilterBarangay] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [showMobileAlertList, setShowMobileAlertList] = useState(false);


  const handleAcknowledgeAlert = (alertId: string, fullAlert?: any) => {
    if (fullAlert) setSelectedAlert(fullAlert);
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? {
        ...alert,
        isAcknowledged: true,
        acknowledgedBy: userName
      } : alert
    ));
    apiPost(`/api/sensors/alerts/${alertId}/acknowledge`, {
      acknowledgedBy: userName,
    })
      .then((data) => {
        if (data.success && data.alert) {
          setAlerts(prev => prev.map(alert => {
            if (alert.id !== alertId) return alert;
            return { ...alert, ...data.alert };
          }));
          if (selectedAlert?.id === alertId) {
            setSelectedAlert({ ...selectedAlert, ...data.alert });
          }
        }
      });
  };


  const filteredAlerts = alerts.filter(alert => {
    if (hiddenAlerts.includes(alert.id)) return false;
    const matchesSearch = alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.parameter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "acknowledged" && alert.isAcknowledged) ||
      (filterStatus === "unacknowledged" && !alert.isAcknowledged);
    const matchesLevel = filterLevel === "all" || alert.level === filterLevel;
    const matchesBarangay = filterBarangay === "all" || alert.barangay === filterBarangay;

    return matchesSearch && matchesStatus && matchesLevel && matchesBarangay;
  });

  const unacknowledgedCount = alerts.filter(alert => !alert.isAcknowledged).length;
  const criticalCount = alerts.filter(alert => alert.level === "critical" && !alert.isAcknowledged).length;

  function getAverageResponseTime(alerts: any[]): string {
    const acknowledged = alerts.filter(a => a.isAcknowledged && a.timestamp && a.acknowledgedAt);
    if (acknowledged.length === 0) return "-";
    const totalMs = acknowledged.reduce((sum, a) => {
      const created = new Date(a.timestamp).getTime();
      const acked = new Date(a.acknowledgedAt).getTime();
      return sum + (acked - created);
    }, 0);
    const avgMs = totalMs / acknowledged.length;
    const avgMin = Math.round(avgMs / 60000);
    return avgMin < 1 ? "<1m" : `${avgMin}m`;
  }
  const avgResponseTime = getAverageResponseTime(alerts);
  const pad = isMobile ? 16 : isTablet ? 24 : 32;

  return (
    <div style={{
      fontFamily: POPPINS,
      height: "100%",
      overflow: "hidden",
      background: "#f5f7f9",
      padding: pad,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Header + Filters ── */}
      <div style={{
        display: "flex",
        flexDirection: (isMobile || isTablet) ? "column" : "row",
        justifyContent: "space-between",
        alignItems: (isMobile || isTablet) ? "flex-start" : "center",
        gap: (isMobile || isTablet) ? 12 : 16,
        marginBottom: 24,
        animation: animationEnabled ? "contentSlideIn 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 18 : 20,
            fontWeight: 700,
            color: "#1a2a3a",
            margin: 0,
            fontFamily: POPPINS,
            whiteSpace: isMobile ? "normal" : "nowrap",
            overflow: isMobile ? undefined : "hidden",
            textOverflow: isMobile ? undefined : "ellipsis",
            letterSpacing: isMobile ? 0.1 : undefined,
          }}>
            Alert Management
          </h1>
          {isMobile && (
            <span style={{
              fontSize: 12.5,
              color: "#7b8a9a",
              fontWeight: 400,
              marginTop: 2,
              fontFamily: POPPINS,
              lineHeight: 1.3,
              display: "block",
              whiteSpace: "normal",
            }}>Monitor and manage water quality alerts across all sites</span>
          )}
          {!isMobile && (
            <p style={{
              fontSize: 12,
              color: "#7b8a9a",
              margin: "2px 0 0",
              fontFamily: POPPINS,
            }}>Monitor and manage water quality alerts across all sites</p>
          )}
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 10,
          flexWrap: "nowrap" as const,
          ...(isMobile ? { width: "100%" } : {}),
        }}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger style={{
              width: isMobile ? undefined : 148, flex: isMobile ? 1 : undefined,
              minWidth: 0, borderRadius: 10, fontFamily: POPPINS, fontSize: 12,
              border: "1px solid #e2e5ea", background: "#fff", height: 34,
            }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger style={{
              width: isMobile ? undefined : 140, flex: isMobile ? 1 : undefined,
              minWidth: 0, borderRadius: 10, fontFamily: POPPINS, fontSize: 12,
              border: "1px solid #e2e5ea", background: "#fff", height: 34,
            }}>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">High Possible Risk</SelectItem>
              <SelectItem value="warning">Moderate Possible Risk</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: (isMobile) ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: (isMobile) ? 12 : 16,
        marginBottom: 24,
        animation: animationEnabled ? "contentSlideIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <StatCard
          icon={<Bell size={(isMobile) ? 18 : 20} color="#357D86" />}
          label="Total Alerts"
          value={String(alerts.length)}
          valueColor="#357D86"
          bgColor="#e6f2f3"
          sub="All alerts (history)"
          isCompact={isMobile}
        />
        <StatCard
          icon={<AlertTriangle size={(isMobile) ? 18 : 20} color="#F1A11A" />}
          label="Unacknowledged"
          value={String(unacknowledgedCount)}
          valueColor="#F1A11A"
          bgColor="#FFF9E6"
          sub="Require attention"
          isCompact={isMobile}
        />
        <StatCard
          icon={<AlertTriangle size={(isMobile) ? 18 : 20} color="#D14343" />}
          label="High Possible Risk Alerts"
          value={String(criticalCount)}
          valueColor="#D14343"
          bgColor="#FFF1F1"
          sub="For immediate verification"
          isCompact={isMobile}
        />
        <StatCard
          icon={<CheckCircle2 size={(isMobile) ? 18 : 20} color="#23B67E" />}
          label="Response Time"
          value={avgResponseTime}
          valueColor="#23B67E"
          bgColor="#E9FBF3"
          sub="Avg response"
          isCompact={isMobile}
        />
      </div>

      {/* ── Alert List ── */}
      <div style={{
        background: "#fff",
        borderRadius: 28,
        border: "1px solid #e2e5ea",
        overflow: "hidden",
        flex: isMobile ? "0 0 auto" : 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        animation: animationEnabled ? "contentSlideIn 0.7s 0.35s cubic-bezier(0.22,1,0.36,1) both" : "none",
      }}>
        <div
          onClick={() => (isMobile) && setShowMobileAlertList(true)}
          style={{
            padding: isMobile ? "12px 14px" : "14px 20px 12px",
            background: isMobile ? "linear-gradient(135deg, #ffffff 0%, #f9fdfd 100%)" : "#fff",
            borderBottom: isMobile ? "none" : "1px solid #f0f1f3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: isMobile ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#f0f8f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}>
                <Bell size={18} color="#357D86" strokeWidth={2.5} />
                {unacknowledgedCount > 0 && (
                  <div style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid #f0f8f9",
                  }} />
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h2 style={{
                fontSize: 13, fontWeight: 700, color: "#1a2a3a",
                margin: 0,
                fontFamily: POPPINS,
                lineHeight: 1.2,
              }}>
                {isMobile ? "Alert Summary" : "Alert List"}
              </h2>
              {isMobile && (
                <span style={{
                  fontSize: 11,
                  color: "#7b8a9a",
                  fontWeight: 500,
                  fontFamily: POPPINS,
                  lineHeight: 1.2,
                  marginTop: 2,
                }}>
                  Monitor and manage alerts
                </span>
              )}
            </div>
          </div>
          {(isMobile) && (
            <div style={{
              background: "#f0f8f9",
              padding: "7px 14px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#357D86", lineHeight: 1 }}>View Details</span>
              <ChevronRight size={14} color="#357D86" strokeWidth={3} />
            </div>
          )}
          {(!isMobile) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {deleteMode ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleSelectAll(); }} style={{ background: "transparent", border: "1px solid #e2e5ea", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                    Select All
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleCancelDelete(); }} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}>
                    Cancel
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSelected(); }} disabled={selectedIds.size === 0} style={{ background: selectedIds.size > 0 ? "#ef4444" : "#fca5a5", border: "none", borderRadius: 8, padding: "5px 12px", cursor: selectedIds.size > 0 ? "pointer" : "default", fontSize: 12, fontWeight: 500, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                    <Trash2 size={13} /> Delete ({selectedIds.size})
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteMode(true); }}
                  style={{
                    background: "transparent", border: "none", padding: "4px", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                  title="Select Alerts to Delete"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>
        {(isMobile) ? null : (
          <div style={{
            padding: 20,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert, index) => (
                  <div key={alert.id} style={{
                    animation: animationEnabled ? `cardDataFadeIn 0.6s ${0.35 + index * 0.07}s cubic-bezier(0.22,1,0.36,1) both` : "none",
                    display: "flex", alignItems: "center", gap: deleteMode ? 16 : 0, transition: "gap 0.2s ease"
                  }}>
                    {deleteMode && (
                      <div
                        onClick={(e) => toggleSelection(alert.id, e)}
                        style={{ cursor: "pointer", paddingLeft: 4, flexShrink: 0 }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          border: `2px solid ${selectedIds.has(alert.id) ? "#ef4444" : "#d1d5db"}`,
                          background: selectedIds.has(alert.id) ? "#ef4444" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s ease"
                        }}>
                          {selectedIds.has(alert.id) && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, opacity: deleteMode && !selectedIds.has(alert.id) ? 0.7 : 1, transition: "opacity 0.2s ease" }}>
                      <div onClick={(e) => {

                        if (deleteMode) {

                          e.preventDefault();

                          toggleSelection(alert.id, e as unknown as React.MouseEvent);

                        } else {

                          setSelectedAlert(alert);

                        }

                      }} style={{ cursor: "pointer" }}>

                        <AlertItem

                          {...alert}

                          isSelected={deleteMode ? selectedIds.has(alert.id) : selectedAlert?.id === alert.id}

                          onAcknowledge={(id) => handleAcknowledgeAlert(id, alert)}

                          DetailsButtonComponent={() => (

                            <ChevronRight

                              size={22}

                              strokeWidth={2.5}

                              className="text-schistoguard-teal transition-transform group-hover:translate-x-1"

                            />

                          )}

                        />

                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#8E8B8B" }}>
                  <AlertTriangle size={48} style={{ margin: "0 auto 16px", display: "block", opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: 15 }}>No alerts found matching your filters.</p>
                  <p style={{ fontSize: 13, margin: "6px 0 0" }}>Try adjusting your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        *::-webkit-scrollbar { display: none; }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
         @keyframes scaleIn {
           from { opacity: 0; transform: scale(0.9); }
           to { opacity: 1; transform: scale(1); }
         }
        }
        @keyframes cardDataFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mobileAlertListIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <AlertDetailsModal
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        onAcknowledge={handleAcknowledgeAlert}
      />


      {/* ── Mobile Alert List Modal ── */}
      {(isMobile) && showMobileAlertList && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center",
          padding: isMobile ? "92px 20px 20px" : "40px 20px",
          animation: "fadeIn 0.2s ease-out both"
        }} onClick={() => setShowMobileAlertList(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 540,
              maxHeight: isMobile ? "calc(100vh - 120px)" : "85vh",
              background: "#fff",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              animation: "mobileAlertListIn 0.25s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #eef0f2",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2a3a", margin: 0, fontFamily: POPPINS }}>
                All Alerts
              </h2>
              <button
                onClick={() => setShowMobileAlertList(false)}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "none", background: "#f3f4f6",
                  color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                className="hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal Scrollable List */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: 20,
              position: "relative",
            } as React.CSSProperties}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <div key={alert.id} onClick={() => setSelectedAlert(alert)}>
                      <AlertItem
                        {...alert}
                        isSelected={selectedAlert?.id === alert.id}
                        onAcknowledge={(id) => handleAcknowledgeAlert(id, alert)}
                        DetailsButtonComponent={() => (
                          <ChevronRight
                            size={20}
                            strokeWidth={2.5}
                            className="text-schistoguard-teal"
                          />
                        )}
                      />
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#8E8B8B" }}>
                    <AlertTriangle size={48} style={{ margin: "0 auto 16px", display: "block", opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: 15 }}>No alerts found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, valueColor, bgColor, sub, isCompact }: {
  icon: React.ReactNode; label: string; value: string; valueColor: string; bgColor: string; sub: string; isCompact?: boolean;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: isCompact ? 16 : 16,
      padding: isCompact ? "14px 16px" : 14,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Poppins', sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      border: "1px solid rgba(0,0,0,0.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isCompact ? 8 : 10 }}>
        <span style={{ fontSize: isCompact ? 11 : 11, fontWeight: 500, color: "#8E8B8B", letterSpacing: isCompact ? 0.3 : 0 }}>{label}</span>
        <div style={{
          width: isCompact ? 30 : 32,
          height: isCompact ? 30 : 32,
          borderRadius: isCompact ? 8 : 8,
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: isCompact ? 22 : 22, fontWeight: 700, color: valueColor, lineHeight: 1 }}>{value}</div>
      <span style={{ fontSize: isCompact ? 10 : 10, color: "#8E8B8B", marginTop: isCompact ? 6 : 3, fontWeight: 400 }}>{sub}</span>
    </div>
  );
}