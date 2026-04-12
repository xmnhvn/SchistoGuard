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
  compact?: boolean;
  onAcknowledge?: (id: string) => void;
  onExpand?: (id: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  DetailsButtonComponent?: React.FC<{ onClick?: (e: React.MouseEvent) => void }>;
}

import { useEffect, useState } from "react";

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
  compact = false,
  onAcknowledge,
  onExpand,
  onClick,
  DetailsButtonComponent
}: AlertItemProps) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isNarrowDesktop = windowWidth < 1600;
  const useColumnLayout = isMobile || compact;

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
        onClick={onClick}
        style={{
          display: "flex",
          overflow: "hidden",
          position: "relative",
          minHeight: useColumnLayout ? 0 : (isNarrowDesktop ? 72 : 80),
          borderRadius: 12,
          border: isSelected ? `1px solid ${accentColor}` : "1px solid #f1f5f9",
          background: isSelected
            ? (accentColor === "#D14343" ? "#FFF1F1" : accentColor === "#F1A11A" ? "#FFF9E6" : "#F5FBFB")
            : "#fff",
          boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
        }}
      >
        {/* Premium Folder-Style Side Accent — color based on alert level */}
        <div style={{
          width: 6,
          backgroundColor: accentColor,
          flexShrink: 0
        }} />

        <div 
          className="flex flex-1" 
          style={{ 
            flexDirection: useColumnLayout ? "column" : "row",
            alignItems: useColumnLayout ? "flex-start" : "center",
            justifyContent: "space-between",
            paddingLeft: compact ? 12 : (useColumnLayout ? 14 : (isNarrowDesktop ? 14 : 16)), 
            paddingRight: compact ? 12 : (useColumnLayout ? 14 : (isNarrowDesktop ? 14 : 16)), 
            paddingTop: compact ? 12 : (useColumnLayout ? 14 : (isNarrowDesktop ? 14 : 16)), 
            paddingBottom: compact ? 12 : (useColumnLayout ? 14 : (isNarrowDesktop ? 14 : 16)), 
            gap: compact ? 10 : (useColumnLayout ? 12 : (isNarrowDesktop ? 16 : 20)) 
          }}
        >
          <div className="flex flex-1 flex-col justify-center overflow-hidden w-full">
            {/* Alert Message — Title */}
            <h4
              style={{
                fontFamily: POPPINS,
                fontWeight: isSelected ? 700 : 500,
                color: "#1a2a3a",
                letterSpacing: "-0.01em",
                lineHeight: "1.4",
                margin: 0,
                fontSize: compact ? "12px" : (isMobile ? "12.5px" : (isNarrowDesktop ? "12.5px" : "13.5px")),
                display: "-webkit-box",
                WebkitLineClamp: useColumnLayout ? 3 : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                whiteSpace: "normal",
                width: "100%"
              }}
            >{message}</h4>

            {/* Timestamp — Grey Subtitle */}
            <div
              className="mt-2"
              style={{
                fontFamily: POPPINS,
                fontWeight: 500,
                color: "#64748b",
                fontSize: compact ? "10px" : (isNarrowDesktop ? "10px" : "11px"),
                letterSpacing: "0.01em"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} style={{ opacity: 0.6 }} />
                <span>{timestamp ? new Date(timestamp).toLocaleString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  hour12: true
                }) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Right side for desktop / Bottom side for mobile: Status Elements + Actions */}
          <div 
            className="flex shrink-0 w-full md:w-auto" 
            style={{ 
              flexDirection: "row",
              alignItems: "center",
              justifyContent: useColumnLayout ? "space-between" : "flex-end",
              gap: compact ? 8 : (isMobile ? 10 : (isNarrowDesktop ? 16 : 24)),
              marginTop: useColumnLayout ? 8 : 0,
              width: useColumnLayout ? "100%" : "auto"
            }}
          >
            {/* Status Icon & Badges together */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {level === 'critical' ? (
                  <span style={{
                    backgroundColor: "#FFF1F1",
                    color: "#D14343",
                    padding: compact ? "3px 8px" : (isNarrowDesktop ? "4px 8px" : "4px 10px"),
                    borderRadius: "6px",
                    fontSize: compact ? "9px" : (isNarrowDesktop ? "9px" : "10px"),
                    fontWeight: 700,
                    fontFamily: POPPINS,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>High Possible Risk</span>
                ) : (
                  <span style={{
                    backgroundColor: "#FFF9E6",
                    color: "#F1A11A",
                    padding: compact ? "3px 8px" : (isNarrowDesktop ? "4px 8px" : "4px 10px"),
                    borderRadius: "6px",
                    fontSize: compact ? "9px" : (isNarrowDesktop ? "9px" : "10px"),
                    fontWeight: 700,
                    fontFamily: POPPINS,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Moderate Possible Risk</span>
                ) }
                {isAcknowledged && (
                  <span style={{
                    backgroundColor: "#E9FBF3",
                    color: "#23B67E",
                    padding: compact ? "3px 8px" : (isNarrowDesktop ? "4px 8px" : "4px 10px"),
                    borderRadius: "6px",
                    fontSize: compact ? "9px" : (isNarrowDesktop ? "9px" : "10px"),
                    fontWeight: 700,
                    fontFamily: POPPINS,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Acknowledged</span>
                )}
              </div>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: `${accentColor}10` }}>
                {getAlertIcon(level, isAcknowledged)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!isAcknowledged && onAcknowledge && (
                <Button
                  size="sm"
                  onClick={handleAcknowledge}
                  className={`${compact ? "h-6 px-3" : "h-7 px-4"} bg-schistoguard-teal hover:bg-schistoguard-teal/90 rounded-md shadow-sm`}
                  style={{
                    fontSize: compact ? "9px" : "10px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontFamily: POPPINS,
                  }}
                >
                  Acknowledge
                </Button>
              )}
              {DetailsButtonComponent ? (
                <div className="flex items-center justify-center p-1 hover:bg-black/5 rounded-full transition-colors">
                  <DetailsButtonComponent />
                </div>
              ) : (
                <div className="flex items-center justify-center p-1 hover:bg-black/5 rounded-full transition-colors">
                  <ChevronRight
                    size={22}
                    strokeWidth={2.5}
                    style={{ color: "#64748b" }}
                    className="shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </div>
              ) }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
