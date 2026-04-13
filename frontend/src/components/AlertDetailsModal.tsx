import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Clock } from "lucide-react";

const POPPINS = "'Poppins', sans-serif";

function calculateDuration(start: string, end?: string) {
  if (!start) return '-';
  const startTime = new Date(start).getTime();
  if (isNaN(startTime)) return '-';
  
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (isNaN(endTime)) return '-';

  const diffMs = Math.max(0, endTime - startTime);
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '< 1m';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ${diffMins % 60}m`;
  return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
}

function getDisplayBarangay(barangay: string, siteName: string) {
  const isUnknown = !barangay || barangay.toLowerCase() === 'unknown' || barangay.trim() === '';
  
  if (isUnknown) {
    if (siteName === 'Matina Site') return 'Matina Crossing';

    return 'N/A';
  }
  return barangay;
}

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

interface AlertDetailsModalProps {
  alert: any | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: (alertId: string, alert: any) => void;
}

export function AlertDetailsModal({
  alert,
  isOpen,
  onOpenChange,
  onAcknowledge,
}: AlertDetailsModalProps) {
  if (!alert) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" style={{ fontFamily: POPPINS }}>
        <DialogHeader>
          <DialogTitle style={{ textAlign: "center", fontWeight: 700, marginTop: 20, marginBottom: 20 }}>
            Alert Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-7">
            <div>
              <h4 className="font-semibold text-[14px] sm:text-[15px] mb-2 sm:mb-3 color-[#1a2a3a]">
                Alert Information
              </h4>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Alert ID:</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>{alert.id}</td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Level:</td>
                    <td>
                      <Badge
                        variant={alert.level === "critical" ? "destructive" : "secondary"}
                        className={alert.level === "critical" ? "bg-red-500 hover:bg-red-600 h-6 px-2 text-[11px]" : "bg-yellow-500 hover:bg-yellow-600 text-black h-6 px-2 text-[11px]"}
                      >
                        {alert.level === "critical" ? "High Possible Risk" : "Moderate Risk"}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Parameter:</td>
                    <td style={{ fontWeight: 600 }}>{alert.parameter}</td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Value:</td>
                    <td style={{ fontWeight: 600 }}>{alert.value}</td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Handling Time:</td>
                    <td style={{ fontWeight: 600 }}>{alert.isAcknowledged ? calculateDuration(alert.timestamp, alert.acknowledgedAt) : "Active"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold text-[14px] sm:text-[15px] mb-2 sm:mb-3 color-[#1a2a3a]">
                Site Information
              </h4>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Site:</td>
                    <td style={{ fontWeight: 600 }}>{alert.siteName}</td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Address:</td>
                    <td style={{ wordBreak: "break-word", fontWeight: 600 }}>{alert.address || getDisplayBarangay(alert.barangay, alert.siteName)}</td>
                  </tr>
                  <tr>
                    <td style={{ width: 200, padding: "4px 8px 4px 0", color: "#8E8B8B", fontWeight: 500 }}>Timestamp:</td>
                    <td style={{ wordBreak: "break-all", fontSize: 12 }}>{formatDateTime(alert.timestamp)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f0f1f3", paddingTop: 12 }}>
            <h4 style={{ fontWeight: 500, marginBottom: 8, fontSize: 13.5 }}>Alert Message</h4>
            <p style={{
              fontSize: 12.5, color: "#64748b", background: "#f9fafb",
              borderRadius: 10, padding: 12, marginBottom: 16,
              lineHeight: "1.5",
              wordBreak: "break-word"
            }}>
              {alert.message}
            </p>
            {alert.acknowledgedBy && (
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 2 }}>Acknowledged by</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{alert.acknowledgedBy}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            {!alert.isAcknowledged ? (
              <Button
                onClick={() => onAcknowledge(alert.id, alert)}
                className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 px-6 py-5 sm:px-8 sm:py-6 rounded-xl flex items-center gap-3 shadow-md transition-all active:scale-95 text-sm sm:text-base font-semibold"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Acknowledge Alert</span>
              </Button>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#23B67E",
                animation: "scaleInModal 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both"
              }}>
                <CheckCircle2 className="w-6 h-6" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Acknowledged</span>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes scaleInModal {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
