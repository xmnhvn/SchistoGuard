import React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

export const UserProfileDetails: React.FC = () => {
  return (
    <div
      className="relative flex flex-col items-center justify-center w-full max-w-md mx-auto p-8"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        borderRadius: "var(--radius)",
      }}
    >
      <div className="relative mb-6 flex flex-col items-center">
        <Avatar className="w-20 h-20 ring-4" style={{ boxShadow: '0 0 0 4px var(--schistoguard-teal), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <AvatarFallback className="text-3xl font-semibold" style={{ color: 'var(--schistoguard-navy)' }}>JD</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center mb-4">
        <div className="text-xl font-bold" style={{ color: "var(--schistoguard-navy)" }}>Juan Dela Cruz</div>
        <div className="text-base text-muted-foreground mb-1">LGU Officer</div>
        <Badge className="px-3 py- rounded-full mb-2 text-xs font-medium" style={{ background: 'var(--schistoguard-teal)', color: 'var(--primary-foreground)' }}>Active</Badge>
      </div>
      <div className="w-full max-w-xs mx-auto space-y-3">
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium" style={{ color: "var(--schistoguard-navy)" }}>juan.delacruz@email.com</span>
        </div>
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Role</span>
          <span className="font-medium" style={{ color: "var(--schistoguard-navy)" }}>LGU Officer</span>
        </div>
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium" style={{ color: 'var(--status-safe)' }}>Active</span>
        </div>
      </div>
    </div>
  );
};
