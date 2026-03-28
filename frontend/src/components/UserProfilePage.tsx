import React, { useState, useEffect, useRef } from "react";
import { Camera, ArrowLeft, Mail, Shield, CheckCircle, ChevronDown, Trash2, Save, MoreHorizontal, X } from "lucide-react";
import { apiCall } from "../utils/api";

const POPPINS = "'Poppins', sans-serif";

let _profileFirstLoadDone = false;

interface UserProfilePageProps {
    user?: { id: number; email: string; firstName: string; lastName: string; role: string } | null;
    onBack?: () => void;
    onLogout?: () => void;
}

export function UserProfilePage({ user, onBack, onLogout }: UserProfilePageProps) {
    const animate = !_profileFirstLoadDone;
    const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth < 600;
    const isTablet = windowWidth >= 600 && windowWidth < 1100;

    useEffect(() => {
        if (!_profileFirstLoadDone) {
            setTimeout(() => { _profileFirstLoadDone = true; }, 50);
        }
    }, []);

    // Load saved profile photo from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sg_profilePhoto");
        if (saved) setSavedPhoto(saved);
    }, []);

    const initials = user
        ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        : "U";

    const roleDisplay = user?.role === "bhw"
        ? "Barangay Health Worker"
        : user?.role === "admin"
            ? "System Admin"
        : user?.role === "lgu"
            ? "Local Government Unit Personnel"
            : user?.role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "User";

    // The photo to show: pending (unsaved pick) > saved > null
    // Note: pendingPhoto === "" means "marked for removal"
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

    const handleSavePhoto = () => {
        if (pendingPhoto !== null) {
            if (pendingPhoto === "") {
                // Remove photo
                localStorage.removeItem("sg_profilePhoto");
                setSavedPhoto(null);
                window.dispatchEvent(new CustomEvent("profilePhotoChanged", { detail: { photo: null } }));
            } else {
                // Update photo
                localStorage.setItem("sg_profilePhoto", pendingPhoto);
                setSavedPhoto(pendingPhoto);
                window.dispatchEvent(new CustomEvent("profilePhotoChanged", { detail: { photo: pendingPhoto } }));
            }
            setPendingPhoto(null);
        }
    };

    const handleCancelPhoto = () => {
        setPendingPhoto(null);
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await apiCall(`/api/auth/users/${user?.id}`, { method: "DELETE" });
            setShowDeleteConfirm(false);
            onLogout?.();
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Failed to delete account. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const infoItems = [
        { icon: <Mail size={16} color="#357D86" />, label: "Email", value: user?.email || "N/A" },
        { icon: <CheckCircle size={16} color="#22c55e" />, label: "Status", value: "Active", valueColor: "#22c55e", hasAction: true },
    ];

    const pad = isMobile ? 16 : isTablet ? 24 : 32;

    return (
        <div style={{
            fontFamily: POPPINS,
            height: "100%",
            overflow: "auto",
            background: "#f5f7f9",
            padding: pad,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
        } as React.CSSProperties}>
            <style>{`
        *::-webkit-scrollbar { display: none; }
        
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }

        @keyframes meshGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .premium-shadow {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 
                      0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }

        .mesh-banner {
          background: linear-gradient(135deg, #357D86 0%, #036366 100%);
          background-size: 200% 200%;
          animation: meshGradient 10s ease infinite;
        }
        
        .mesh-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%),
                            radial-gradient(circle at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 50%);
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

            {/* Header Section */}
            <div style={{
                marginBottom: 32,
                animation: animate ? "contentSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" : "none",
            }}>
                <div>
                    <h1 style={{
                        fontSize: isMobile ? 20 : 26,
                        fontWeight: 700,
                        color: "#1a2a3a",
                        margin: 0,
                        fontFamily: POPPINS,
                        letterSpacing: "-0.01em"
                    }}>
                        Profile Settings
                    </h1>
                    <p style={{
                        fontSize: 12.5,
                        color: "#7b8a9a",
                        margin: "4px 0 0",
                        fontFamily: POPPINS,
                        fontWeight: 400
                    }}>
                        View and manage your personal identity
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: 800, width: "100%", margin: (isMobile || isTablet) ? "0" : "0 auto" }}>

                {/* Profile Card Center Container */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    animation: animate
                        ? "contentSlideIn 1s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both"
                        : "none",
                }}>
                    <div className="glass-card premium-shadow" style={{
                        maxWidth: 440,
                        width: "100%",
                        borderRadius: 32,
                        overflow: "hidden",
                        position: "relative",
                    }}>
                        {/* Mesh banner */}
                        <div className="mesh-banner" style={{
                            height: 120,
                            position: "relative",
                        }} />

                        {/* Avatar section */}
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginTop: -50,
                            padding: "0 28px 28px",
                            position: "relative",
                        }}>
                            {/* Avatar with luxury border */}
                            <div
                                style={{
                                    position: "relative",
                                    width: 100, height: 100,
                                    borderRadius: "50%",
                                    border: hasUnsavedChanges ? "4px solid #357D86" : "4px solid #fff",
                                    boxShadow: hasUnsavedChanges
                                        ? "0 0 0 4px rgba(53, 125, 134, 0.15), 0 12px 24px -8px rgba(0,0,0,0.2)"
                                        : "0 12px 24px -8px rgba(0,0,0,0.2)",
                                    cursor: "pointer",
                                    overflow: "visible", 
                                    background: "linear-gradient(135deg, #357D86 0%, #05a5a9 100%)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.02)";
                                    setIsHoveringAvatar(true);
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    setIsHoveringAvatar(false);
                                }}
                            >
                                <div style={{
                                    width: "100%", height: "100%",
                                    borderRadius: "50%", overflow: "hidden",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative"
                                }}>
                                    {displayPhoto ? (
                                        <img
                                            src={displayPhoto}
                                            alt="Profile"
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontSize: 34, fontWeight: 800, color: "#fff",
                                            fontFamily: POPPINS, userSelect: "none",
                                            letterSpacing: "0.05em"
                                        }}>
                                            {initials}
                                        </span>
                                    )}
                                </div>

                                {/* Floating buttons outside the circle but anchored to it */}
                                <div style={{
                                    position: "absolute",
                                    bottom: 4,
                                    right: -8,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    zIndex: 10,
                                    opacity: isHoveringAvatar ? 1 : 0,
                                    transform: isHoveringAvatar ? "translateX(0) scale(1)" : "translateX(-10px) scale(0.9)",
                                    pointerEvents: isHoveringAvatar ? "auto" : "none",
                                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                                }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        style={{
                                            width: 40, height: 40, borderRadius: "50%",
                                            border: "3.5px solid #fff", background: "#357D86",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: "pointer", transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                            color: "#fff",
                                            boxShadow: "0 4px 12px rgba(53, 125, 134, 0.3)"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.15) rotate(5deg)";
                                            e.currentTarget.style.background = "#036366";
                                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(53, 125, 134, 0.4)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                            e.currentTarget.style.background = "#357D86";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(53, 125, 134, 0.3)";
                                        }}
                                        title="Update Photo"
                                    >
                                        <Camera size={18} />
                                    </button>

                                    {savedPhoto && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPendingPhoto(""); }}
                                            style={{
                                                width: 40, height: 40, borderRadius: "50%",
                                                border: "3.5px solid #fff", background: "#fef2f2",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                cursor: "pointer", transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                                color: "#dc2626",
                                                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.15)"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "scale(1.15) rotate(-5deg)";
                                                e.currentTarget.style.background = "#fee2e2";
                                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(220, 38, 38, 0.25)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "scale(1)";
                                                e.currentTarget.style.background = "#fef2f2";
                                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.15)";
                                            }}
                                            title="Remove Photo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Save / Cancel buttons — Premium styling */}
                            {hasUnsavedChanges && (
                                <div style={{
                                    display: "flex", gap: 12, marginTop: 20,
                                    animation: "contentSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
                                }}>
                                    <button
                                        onClick={handleCancelPhoto}
                                        style={{
                                            padding: "10px 24px", borderRadius: 14,
                                            border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.8)",
                                            color: "#64748b", fontSize: 13, fontWeight: 700,
                                            fontFamily: POPPINS, cursor: "pointer",
                                            transition: "all 0.3s",
                                            backdropFilter: "blur(4px)"
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.transform = "translateY(0px)"; }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSavePhoto}
                                        style={{
                                            padding: "10px 28px", borderRadius: 14,
                                            border: "none", background: isPendingRemoval ? "#dc2626" : "#357D86",
                                            color: "#fff", fontSize: 13, fontWeight: 700,
                                            fontFamily: POPPINS, cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: 10,
                                            boxShadow: isPendingRemoval
                                                ? "0 8px 20px -5px rgba(220, 38, 38, 0.4)"
                                                : "0 8px 20px -5px rgba(53, 125, 134, 0.4)",
                                            transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.filter = "brightness(1.1)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0px) scale(1)"; e.currentTarget.style.filter = "brightness(1)"; }}
                                    >
                                        {isPendingRemoval ? <Trash2 size={16} /> : <Save size={16} />}
                                        {isPendingRemoval ? "Confirm Removal" : "Save Changes"}
                                    </button>
                                </div>
                            )}

                            {/* Name & Role — Enhanced typography */}
                            <h2 style={{
                                fontSize: 21, fontWeight: 800, color: "#0f172a",
                                margin: hasUnsavedChanges ? "14px 0 4px" : "18px 0 4px",
                                fontFamily: POPPINS, textAlign: "center",
                                letterSpacing: "-0.01em"
                            }}>
                                {user ? `${user.firstName} ${user.lastName}` : "Authenticated User"}
                            </h2>
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8,
                                background: "rgba(53, 125, 134, 0.08)",
                                padding: "6px 14px", borderRadius: 100,
                            }}>
                                <Shield size={14} color="#357D86" />
                                <span style={{
                                    fontSize: 13, fontWeight: 700, color: "#357D86",
                                    fontFamily: POPPINS,
                                }}>
                                    {roleDisplay}
                                </span>
                            </div>

                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: "rgba(0,0,0,0.04)", margin: "0 32px" }} />

                        {/* Premium Info Items Grid */}
                        <div style={{ padding: "0 28px 28px", display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                            {infoItems.map((item, i) => (
                                <div key={item.label} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "14px 18px",
                                    background: "rgba(0,0,0,0.02)",
                                    borderRadius: 18,
                                    border: "1px solid rgba(0,0,0,0.03)",
                                    transition: "all 0.3s ease",
                                    animation: animate ? `contentSlideIn 0.8s ${0.3 + i * 0.12}s cubic-bezier(0.16, 1, 0.3, 1) both` : "none",
                                }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12,
                                            background: "#fff", display: "flex",
                                            alignItems: "center", justifyContent: "center",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                                        }}>
                                            {item.icon}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: POPPINS, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                {item.label}
                                            </span>
                                            <span style={{
                                                fontSize: 15, fontWeight: 700,
                                                color: item.valueColor || "#1e293b",
                                                fontFamily: POPPINS,
                                                marginTop: 1
                                            }}>
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>

                                    {item.hasAction && (
                                        <div style={{ position: "relative" }}>
                                            <button
                                                onClick={() => { setShowDeleteMenu(!showDeleteMenu); setShowDeleteConfirm(false); }}
                                                style={{
                                                    background: "none", border: "none",
                                                    padding: 8, borderRadius: "50%",
                                                    cursor: "pointer", display: "flex",
                                                    alignItems: "center", justifyContent: "center",
                                                    transition: "background 0.2s",
                                                    color: showDeleteMenu ? "#ef4444" : "#64748b"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>

                                            {/* Contextual Delete Menu */}
                                            {showDeleteMenu && (
                                                <div className="premium-shadow" style={{
                                                    position: "absolute",
                                                    bottom: "100%",
                                                    right: 0,
                                                    transform: "translateY(-8px)",
                                                    background: "#fff",
                                                    borderRadius: 16,
                                                    padding: 8,
                                                    minWidth: 160,
                                                    zIndex: 100,
                                                    border: "1px solid rgba(0,0,0,0.05)",
                                                    animation: "contentSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both"
                                                }}>
                                                    {!showDeleteConfirm ? (
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(true)}
                                                            style={{
                                                                width: "100%", padding: "10px 14px",
                                                                borderRadius: 10, border: "none",
                                                                background: "none", color: "#ef4444",
                                                                fontSize: 13, fontWeight: 700,
                                                                fontFamily: POPPINS, cursor: "pointer",
                                                                display: "flex", alignItems: "center", gap: 10,
                                                                textAlign: "left"
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                                        >
                                                            <Trash2 size={16} /> Delete Profile
                                                        </button>
                                                    ) : (
                                                        <div style={{ padding: 4 }}>
                                                            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textAlign: "center", textTransform: "uppercase" }}>Confirm?</div>
                                                            <div style={{ display: "flex", gap: 6 }}>
                                                                <button
                                                                    onClick={() => setShowDeleteConfirm(false)}
                                                                    disabled={deleting}
                                                                    style={{
                                                                        flex: 1, padding: "8px 0",
                                                                        borderRadius: 8, border: "1px solid #e2e8f0",
                                                                        background: "#fff", color: "#64748b",
                                                                        fontSize: 11, fontWeight: 700,
                                                                        fontFamily: POPPINS, cursor: "pointer",
                                                                    }}
                                                                >
                                                                    No
                                                                </button>
                                                                <button
                                                                    onClick={handleDeleteAccount}
                                                                    disabled={deleting}
                                                                    style={{
                                                                        flex: 1.5, padding: "8px 0",
                                                                        borderRadius: 8, border: "none",
                                                                        background: "#ef4444", color: "#fff",
                                                                        fontSize: 11, fontWeight: 700,
                                                                        fontFamily: POPPINS, cursor: "pointer",
                                                                    }}
                                                                >
                                                                    {deleting ? "Wait..." : "Yes, Delete"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
