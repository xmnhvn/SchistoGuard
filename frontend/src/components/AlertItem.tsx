import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
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

function getAlertIcon(level: string, isAcknowledged: boolean) {
  if (isAcknowledged) return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (level === "critical") return <AlertTriangle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function getAlertBorderStyle(level: string, isAcknowledged: boolean) {
  if (isAcknowledged) return "border-l-4 border-l-green-500";
  if (level === "critical") return "border-l-4 border-l-red-500";
  return "border-l-4 border-l-yellow-500";
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
  const handleAcknowledge = () => {
    onAcknowledge?.(id);
  };

  return (
    <Card className={`w-full ${getAlertBorderStyle(level, isAcknowledged)} ${isAcknowledged ? 'bg-muted/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {getAlertIcon(level, isAcknowledged)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between min-h-6 w-full">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={level === "critical" ? "destructive" : "secondary"}
                    className={level === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Badge>
                  {isAcknowledged && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Acknowledged
                    </Badge>
                  )}
                </div>
                <div className="flex flex-row gap-2 items-center">
                  {!isAcknowledged && (
                    <Button
                      size="sm"
                      onClick={handleAcknowledge}
                      className="bg-schistoguard-teal hover:bg-schistoguard-teal/90 py-0.5 px-2 text-xs h-6 min-h-0"
                    >
                      Acknowledge
                    </Button>
                  )}
                  {DetailsButtonComponent && (
                    <DetailsButtonComponent />
                  )}
                </div>
              </div>
              <p className="font-medium">{message}</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{timestamp ? new Date(timestamp).toLocaleString() : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
