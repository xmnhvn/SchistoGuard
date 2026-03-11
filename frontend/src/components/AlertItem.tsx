import { Button } from "./ui/button";
import { AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import React from "react";

interface AlertItemProps {
  id: string;
  level: "warning" | "critical";
  message: string;
  siteName: string;
  parameter: string;
  value: string;
  timestamp: string;
  isAcknowledged: boolean;
  isSelected?: boolean;
  onAcknowledge?: (id: string) => void;
  onExpand?: (id: string) => void;
  DetailsButtonComponent?: React.FC<{ onClick?: (e: React.MouseEvent) => void }>;
}

const POPPINS = "'Poppins', sans-serif";

function getAlertIcon(level: string, isAcknowledged: boolean) {
  if (isAcknowledged) return <CheckCircle className="w-5 h-5 text-[#23B67E]" />;
  if (level === "critical") return <AlertTriangle className="w-5 h-5 text-[#D14343]" />;
  return <Clock className="w-5 h-5 text-[#F1A11A]" />;
}

export function AlertItem({
  id,
  level,
  message,
  siteName,
  parameter,
  value,
  timestamp,
  isAcknowledged,
  isSelected,
  onAcknowledge,
  onExpand,
  DetailsButtonComponent
}: AlertItemProps) {
  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAcknowledge?.(id);
  };

  // Determine accent bar color based on level
  const accentColor = level === "critical" ? "#D14343" : level === "warning" ? "#F1A11A" : "#357D86";

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 15,
        position: "relative"
      }}
    >
      <div
        className="group cursor-pointer transition-all"
        style={{
          display: "flex",
          overflow: "hidden",
          position: "relative",
          minHeight: 92,
          borderRadius: 15,
          border: isSelected ? `1px solid ${accentColor}` : "1px solid #f1f5f9",
          background: isSelected
            ? (accentColor === "#D14343" ? "#FFF1F1" : accentColor === "#F1A11A" ? "#FFF9E6" : "#F5FBFB")
            : "#fff",
        }}
      >
        {/* Accent Left Bar — color based on alert level */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          backgroundColor: accentColor,
          zIndex: 1
        }} />

        <div className="flex w-full items-center justify-between px-8 py-7 gap-6">
          <div className="flex flex-1 flex-col justify-center overflow-hidden">
            {/* Alert Message — Teal Title */}
            <h4
              className="truncate text-[15.5px]"
              style={{
                fontFamily: POPPINS,
                fontWeight: isSelected ? 700 : 500,
                color: "#64748b",
                letterSpacing: "-0.01em",
                lineHeight: "1.2",
                margin: 0,
              }}
            >{message}</h4>

            {/* Timestamp — Grey Subtitle */}
            <div
              className="mt-2"
              style={{
                fontFamily: POPPINS,
                fontWeight: 500,
                color: "#64748b",
                fontSize: "12px",
                letterSpacing: "0.01em"
              }}
            >
              {timestamp ? new Date(timestamp).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
              }) : '-'}
            </div>
          </div>
        </div>

        {/* Right side: Status Elements + Acknowledge + Chevron */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Status Icon & Badges together on the right */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {level === 'critical' ? (
                <span style={{
                  backgroundColor: "#FFF1F1",
                  color: "#D14343",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: POPPINS,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>Critical</span>
              ) : (
                <span style={{
                  backgroundColor: "#FFF9E6",
                  color: "#F1A11A",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: POPPINS,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>Warning</span>
              )}
              {isAcknowledged && (
                <span style={{
                  backgroundColor: "#E9FBF3",
                  color: "#23B67E",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: POPPINS,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>Acknowledged</span>
              )}
            </div>
            <div className="shrink-0">
              {getAlertIcon(level, isAcknowledged)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isAcknowledged && onAcknowledge && (
              <Button
                size="sm"
                onClick={handleAcknowledge}
                className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 py-1 px-3 text-xs h-7 rounded-lg font-medium"
              >
                Acknowledge
              </Button>
            )}
            {DetailsButtonComponent ? (
              <DetailsButtonComponent />
            ) : (
              <ChevronRight
                size={18}
                strokeWidth={2.5}
                style={{ color: "#64748b" }}
                className="shrink-0 transition-transform group-hover:translate-x-1"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
