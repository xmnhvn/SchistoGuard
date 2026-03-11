import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface UserProfileDetailsProps {
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  onDelete?: () => void;
}

export const UserProfileDetails: React.FC<UserProfileDetailsProps> = ({ user, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : 'JD';

  const roleDisplay = user?.role === 'bhw' ? 'Barangay Health Worker' : 'LGU Officer';

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.();
  };

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
        <Avatar className="w-20 h-20 ring-4 ring-schistoguard-teal">
          <AvatarFallback className="text-3xl font-semibold" style={{ color: 'var(--schistoguard-navy)' }}>{initials}</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center mb-4">
        <div className="text-xl font-bold" style={{ color: "var(--schistoguard-navy)" }}>{user ? `${user.firstName} ${user.lastName}` : 'User'}</div>
        <div className="text-base text-muted-foreground mb-1">{roleDisplay}</div>
        <Badge className="px-3 py- rounded-full mb-2 text-xs font-medium" style={{ background: 'var(--schistoguard-teal)', color: 'var(--primary-foreground)' }}>Active</Badge>
      </div>
      <div className="w-full max-w-xs mx-auto space-y-3">
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium" style={{ color: "var(--schistoguard-navy)" }}>{user?.email || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Designation</span>
          <span className="font-medium" style={{ color: "var(--schistoguard-navy)" }}>{roleDisplay}</span>
        </div>
        <div className="flex items-center justify-between text-sm px-2">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium" style={{ color: 'var(--status-safe)' }}>Active</span>
        </div>
      </div>
      <div className="w-full max-w-xs mx-auto mt-6 space-y-2">
        {!showDeleteConfirm ? (
          <Button
            onClick={handleDeleteClick}
            variant="destructive"
            className="w-full"
          >
            Delete Account
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="destructive"
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
