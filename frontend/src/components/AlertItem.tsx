import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import React, { useState } from "react";

interface AlertItemProps {
  id: string;
  level: "warning" | "critical";
  message: string;
  siteName: string;
  parameter: string;
  value: string;
  timestamp: string;
  isAcknowledged: boolean;
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
  onAcknowledge,
  onExpand,
  DetailsButtonComponent
}: AlertItemProps) {
  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAcknowledge?.(id);
  };

  const getStatusBadge = () => {
    if (level === 'critical') {
      return (
        <span style={{
          backgroundColor: "#FFF1F1",
          color: "#D14343",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: POPPINS,
          textTransform: 'uppercase',
          letterSpacing: '0.02em'
        }}>Critical</span>
      );
    }
    return (
      <span style={{
        backgroundColor: "#FFF9E6",
        color: "#F1A11A",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        fontFamily: POPPINS,
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
      }}>Warning</span>
    );
  };

  return (
    <Card
      className="w-full border-none transition-all duration-200"
      style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: isAcknowledged ? "#f8fafb" : "#fff",
        borderLeft: "4px solid #357D86",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        border: "1px solid #eef2f3",
        borderLeftWidth: 4,
        marginBottom: 4,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getAlertIcon(level, isAcknowledged)}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {isAcknowledged && (
                <span style={{
                  backgroundColor: "#E9FBF3",
                  color: "#23B67E",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: POPPINS,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>Acknowledged</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAcknowledged && (
                <Button
                  size="sm"
                  onClick={handleAcknowledge}
                  className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 py-1 px-3 text-xs h-7 rounded-lg font-medium"
                >
                  Acknowledge
                </Button>
              )}
              {DetailsButtonComponent && (
                <DetailsButtonComponent />
              )}
            </div>
          </div>

          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1a2a3a",
            fontFamily: POPPINS,
            margin: 0,
            lineHeight: 1.4
          }}>{message}</p>

          <div style={{
            fontSize: 12,
            color: "#7b8a9a",
            fontWeight: 500,
            fontFamily: POPPINS
          }}>
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
    </Card>
  );
}
