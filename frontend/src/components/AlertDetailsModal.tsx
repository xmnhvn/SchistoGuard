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
        
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
          }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, color: "#1a2a3a" }}>
                Alert Information
              </h4>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Alert ID:</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14 }}>{alert.id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Level:</td>
                    <td>
                      <Badge
                        variant={alert.level === "critical" ? "destructive" : "secondary"}
                        className={alert.level === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                      >
                        {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Parameter:</td>
                    <td style={{ fontWeight: 600 }}>{alert.parameter}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Value:</td>
                    <td style={{ fontWeight: 600 }}>{alert.value} <span style={{ fontWeight: 400, fontSize: 11 }}>NTU</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Duration:</td>
                    <td>{alert.duration || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, color: "#1a2a3a" }}>
                Site Information
              </h4>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Site:</td>
                    <td style={{ fontWeight: 600 }}>{alert.siteName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Barangay:</td>
                    <td>{alert.barangay}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px 6px 0", color: "#8E8B8B", fontWeight: 500 }}>Timestamp:</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(alert.timestamp)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f0f1f3", paddingTop: 16 }}>
            <h4 style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>Alert Message</h4>
            <p style={{
              fontSize: 13, color: "#8E8B8B", background: "#f9fafb",
              borderRadius: 10, padding: 14, marginBottom: 20,
            }}>
              {alert.message}
            </p>
            {alert.acknowledgedBy && (
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <span style={{ fontSize: 12, color: "#8E8B8B", display: "block" }}>Acknowledged by</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{alert.acknowledgedBy}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
            {!alert.isAcknowledged ? (
              <Button
                onClick={() => onAcknowledge(alert.id, alert)}
                className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 px-8 py-6 rounded-xl flex items-center gap-3 shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span style={{ fontSize: 15, fontWeight: 600 }}>Acknowledge Alert</span>
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
