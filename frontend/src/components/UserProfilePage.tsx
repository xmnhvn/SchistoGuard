import React, { useState, useEffect, useRef } from "react";
import { Camera, Mail, Shield, CheckCircle, Trash2, Save, MapPin, Phone, Calendar } from "lucide-react";
import { apiCall } from "../utils/api";
import { useResponsiveScale } from "../utils/useResponsiveScale";

const POPPINS = "'Poppins', sans-serif";

let _profileFirstLoadDone = false;

interface UserProfilePageProps {
    user?: { id: number; email: string; firstName: string; lastName: string; role: string; profilePhoto?: string | null } | null;
    onBack?: () => void;
    onLogout?: () => void;
    onProfilePhotoChange?: (profilePhoto: string | null) => void;
}

export function UserProfilePage({ user, onBack, onLogout, onProfilePhotoChange }: UserProfilePageProps) {
    const animate = !_profileFirstLoadDone;
    const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
    const [savingPhoto, setSavingPhoto] = useState(false);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isMobile, isTablet, pad } = useResponsiveScale();

    useEffect(() => {
        if (!_profileFirstLoadDone) {
            setTimeout(() => { _profileFirstLoadDone = true; }, 50);
        }
    }, []);

    useEffect(() => {
        setSavedPhoto(user?.profilePhoto || null);
    }, [user?.profilePhoto]);

    const initials = user
        ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        : "U";

    const roleDisplay = user?.role === "bhw"
        ? "Barangay Health Worker"
        : user?.role === "admin"
            ? "System Admin"
        : user?.role === "municipal_health_officer"
            ? "Municipal Health Officer"
            : user?.role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "User";

    const displayPhoto = pendingPhoto === "" ? null : (pendingPhoto ?? savedPhoto);
    const hasUnsavedChanges = pendingPhoto !== null;
    const isPendingRemoval = pendingPhoto === "";

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const size = Math.min(img.width, img.height);
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
                const dataUrl = canvas.toDataURL("image/png");
                setPendingPhoto(dataUrl);
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleSavePhoto = async () => {
        if (pendingPhoto === null || savingPhoto) return;

        setSavingPhoto(true);
        try {
            const nextProfilePhoto = pendingPhoto === "" ? null : pendingPhoto;
            const response = await apiCall("/api/auth/profile-photo", {
                method: "PUT",
                body: JSON.stringify({ profilePhoto: nextProfilePhoto }),
            });

            const updatedPhoto = response?.profilePhoto ?? nextProfilePhoto;
            setSavedPhoto(updatedPhoto);
            onProfilePhotoChange?.(updatedPhoto);
            setPendingPhoto(null);
        } catch (error) {
            console.error("Failed to save profile photo:", error);
            alert(error instanceof Error ? error.message : "Failed to save profile photo.");
        } finally {
            setSavingPhoto(false);
        }
    };

    const handleCancelPhoto = () => {
        setPendingPhoto(null);
    };

    const bannerHeight = isMobile ? 140 : 180;
    const avatarSize = isMobile ? 96 : 112;

    return (
        <div style={{
            fontFamily: POPPINS,
            height: "100%",
            overflow: "auto",
            background: "#f5f7f9",
            position: "relative",
        }}>
            <style>{`
                *::-webkit-scrollbar { display: none; }
                @keyframes contentSlideIn {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes avatarPop {
                    0% { transform: scale(0.7); opacity: 0; }
                    60% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes meshGradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoSelect}
            />

            {/* ── Banner ── */}
            <div style={{
                position: "relative",
                width: "100%",
                height: bannerHeight,
                background: "linear-gradient(135deg, #357D86 0%, #036366 50%, #4aa3ad 100%)",
                backgroundSize: "200% 200%",
                animation: "meshGradient 10s ease infinite",
                marginBottom: avatarSize / 2 + 20,
            }}>
                {/* Subtle gradient overlay */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 50%)",
                }} />

                {/* Avatar — overlapping banner bottom */}
                <div style={{
                    position: "absolute",
                    bottom: -(avatarSize / 2),
                    left: `calc(50% - ${avatarSize / 2}px)`,
                    animation: animate ? "avatarPop 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }}>
                    <div
                        style={{
                            width: avatarSize,
                            height: avatarSize,
                            borderRadius: "50%",
                            border: hasUnsavedChanges ? "4px solid #357D86" : "4px solid #fff",
                            boxShadow: hasUnsavedChanges
                                ? "0 0 0 4px rgba(53, 125, 134, 0.15), 0 4px 12px rgba(0,0,0,0.12)"
                                : "0 4px 12px rgba(0,0,0,0.12)",
                            cursor: "pointer",
                            overflow: "visible",
                            background: "linear-gradient(135deg, #357D86 0%, #05a5a9 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                            position: "relative",
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        onMouseEnter={() => setIsHoveringAvatar(true)}
                        onMouseLeave={() => setIsHoveringAvatar(false)}
                    >
                        <div style={{
                            width: "100%", height: "100%",
                            borderRadius: "50%", overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {displayPhoto ? (
                                <img
                                    src={displayPhoto}
                                    alt="Profile"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                <span style={{
                                    fontSize: isMobile ? 30 : 36, fontWeight: 800, color: "#fff",
                                    fontFamily: POPPINS, userSelect: "none",
                                    letterSpacing: "0.05em"
                                }}>
                                    {initials}
                                </span>
                            )}
                        </div>

                        {/* Camera button on hover */}
                        <div style={{
                            position: "absolute",
                            bottom: 2, right: -4,
                            width: 34, height: 34, borderRadius: "50%",
                            border: "3px solid #fff", background: "#357D86",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "#fff",
                            boxShadow: "0 4px 12px rgba(53, 125, 134, 0.3)",
                            opacity: isHoveringAvatar ? 1 : 0.8,
                            transition: "all 0.3s",
                            zIndex: 10,
                        }}
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                            <Camera size={15} />
                        </div>

                        {/* Remove photo button */}
                        {savedPhoto && isHoveringAvatar && (
                            <div style={{
                                position: "absolute",
                                top: 2, right: -4,
                                width: 28, height: 28, borderRadius: "50%",
                                border: "3px solid #fff", background: "#fef2f2",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", color: "#dc2626",
                                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.15)",
                                transition: "all 0.3s",
                                zIndex: 10,
                            }}
                                onClick={(e) => { e.stopPropagation(); setPendingPhoto(""); }}
                            >
                                <Trash2 size={12} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main content ── */}
            <div style={{
                maxWidth: 720,
                margin: "0 auto",
                padding: `0 ${pad}px ${pad * 2}px`,
                animation: animate ? "contentSlideIn 0.8s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
            }}>

                {/* ── Name & Role section ── */}
                <div style={{
                    textAlign: "center",
                    marginBottom: 24,
                }}>
                    <h1 style={{
                        fontSize: isMobile ? 22 : 28,
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: "0 0 6px",
                        fontFamily: POPPINS,
                        letterSpacing: "-0.01em",
                    }}>
                        {user ? `${user.firstName} ${user.lastName}` : "Authenticated User"}
                    </h1>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "rgba(53, 125, 134, 0.08)",
                        padding: "5px 14px", borderRadius: 100,
                    }}>
                        <Shield size={13} color="#357D86" />
                        <span style={{
                            fontSize: 12, fontWeight: 700, color: "#357D86",
                            fontFamily: POPPINS,
                        }}>
                            {roleDisplay}
                        </span>
                    </div>
                </div>

                {/* ── Save/Cancel buttons when photo has unsaved changes ── */}
                {hasUnsavedChanges && (
                    <div style={{
                        display: "flex", gap: 12, marginBottom: 24,
                        justifyContent: (isMobile || isTablet) ? "flex-start" : "center",
                        animation: "contentSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
                    }}>
                        <button
                            onClick={handleCancelPhoto}
                            style={{
                                padding: "10px 24px", borderRadius: 14,
                                border: "1px solid #e2e8f0", background: "#fff",
                                color: "#64748b", fontSize: 13, fontWeight: 700,
                                fontFamily: POPPINS, cursor: "pointer",
                                transition: "all 0.3s",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSavePhoto}
                            disabled={savingPhoto}
                            style={{
                                padding: "10px 28px", borderRadius: 14,
                                border: "none",
                                background: isPendingRemoval ? "#dc2626" : "#357D86",
                                color: "#fff", fontSize: 13, fontWeight: 700,
                                fontFamily: POPPINS, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 10,
                                boxShadow: isPendingRemoval
                                    ? "0 8px 20px -5px rgba(220, 38, 38, 0.4)"
                                    : "0 8px 20px -5px rgba(53, 125, 134, 0.4)",
                                transition: "all 0.3s",
                                opacity: savingPhoto ? 0.7 : 1,
                            }}
                        >
                            {isPendingRemoval ? <Trash2 size={16} /> : <Save size={16} />}
                            {savingPhoto ? "Saving..." : (isPendingRemoval ? "Confirm Removal" : "Save Changes")}
                        </button>
                    </div>
                )}

                {/* ── Divider ── */}
                <div style={{ height: 1, background: "#e8ecf0", marginBottom: 28 }} />

                {/* ── Info items ── */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 16,
                    marginBottom: 28,
                }}>
                    {/* Email */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 18px",
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #f0f1f3",
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: "#f0f8f9", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            <Mail size={16} color="#357D86" />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{
                                fontSize: 11, fontWeight: 600, color: "#9ca3af",
                                fontFamily: POPPINS, textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}>
                                Email
                            </span>
                            <span style={{
                                fontSize: 14, fontWeight: 600, color: "#1e293b",
                                fontFamily: POPPINS, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                                {user?.email || "N/A"}
                            </span>
                        </div>
                    </div>

                    {/* Status */}
                    <div style={{
                        display: "flex", alignItems: "center",
                        padding: "14px 18px",
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #f0f1f3",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: "#e6f7ef", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                            }}>
                                <CheckCircle size={16} color="#22c55e" />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, color: "#9ca3af",
                                    fontFamily: POPPINS, textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}>
                                    Status
                                </span>
                                <span style={{
                                    fontSize: 14, fontWeight: 700, color: "#22c55e",
                                    fontFamily: POPPINS,
                                }}>
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
