import React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

export const UserProfileDetails: React.FC = () => {
  return (
    <div className="p-6 min-w-[300px] max-w-xs">
      <div className="flex flex-col items-center gap-2 mb-4">
        <Avatar className="w-16 h-16 mb-2">
          <AvatarFallback className="text-2xl">JD</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <div className="text-lg font-semibold text-schistoguard-navy">Juan Dela Cruz</div>
          <div className="text-sm text-muted-foreground mb-1">LGU Officer</div>
          <Badge variant="outline">Active</Badge>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Email:</span>
          <span className="font-medium">juan.delacruz@email.com</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Role:</span>
          <span className="font-medium">LGU Officer</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className="font-medium text-green-600">Active</span>
        </div>
      </div>
    </div>
  );
};
