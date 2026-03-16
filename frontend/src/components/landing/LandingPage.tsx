import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Shield,
  Users,
  ArrowRight,
  Activity,
  ChevronLeft,
  LocateFixed,
} from "lucide-react";
import { DashboardMap } from "../DashboardMap";
import type { DashboardMapHandle } from "../DashboardMap";
import {
  CTAButton,
  TrustBadge,
  AlertsQuickviewModal,
  SensorIcon,
} from "./LandingComponents";
import { apiGet } from "../../utils/api";

interface LandingPageProps {
  onViewMap?: () => void;
  onLearnMore?: () => void;
  onEnterApp?: () => void;
}

// Sensor status helper
function getSensorStatus(
  type: "temperature" | "turbidity" | "ph",
  value: number
): { label: string; color: string } {
  if (type === "temperature") {
    if (value >= 25 && value <= 30)
      return { label: "Possible Schistosomiasis Risk", color: "#E7B213" };
    if ((value >= 20 && value < 25) || (value > 30 && value <= 32))
      return { label: "Moderate Risk", color: "#E7B213" };
    return { label: "Safe", color: "#22c55e" };
  }
  if (type === "turbidity") {
    if (value < 5) return { label: "Clear Water – Higher Schisto Risk", color: "#ef4444" };
    if (value <= 15) return { label: "Moderate Turbidity", color: "#E7B213" };
    return { label: "High Turbidity", color: "#22c55e" };
  }
  if (type === "ph") {
    if (value >= 7.0 && value <= 8.5) return { label: "Critical Range", color: "#ef4444" };
    if ((value >= 6.5 && value < 7.0) || (value > 8.5 && value <= 9.0))
      return { label: "Warning Range", color: "#f59e0b" };
    return { label: "Safe", color: "#22c55e" };
  }
  return { label: "", color: "#9ca3af" };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onViewMap,
  onLearnMore,
  onEnterApp,
}) => {
  const [screenWidth, setScreenWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 1100 : false
  );
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [isMonitoringHovered, setIsMonitoringHovered] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showLiveUpdates, setShowLiveUpdates] = useState(false);
  const [isExitingLiveUpdates, setIsExitingLiveUpdates] = useState(false);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [backendOk, setBackendOk] = useState(true);
  const [dataOk, setDataOk] = useState(true);
  const [siteData, setSiteData] = useState<any>({
    siteName: "Mang Jose's Fish Pond",
    barangay: "San Miguel",
    municipality: "Tacloban City",
    area: "100 square meters",
  });
  const mapRef = useRef<DashboardMapHandle>(null);

  React.useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsMobileOrTablet(width < 1100);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch sensor data when live updates is shown
  useEffect(() => {
    if (!showLiveUpdates) return;
    
    const fetchLatest = () => {
      apiGet("/api/sensors/latest")
        .then((data) => {
          setLatestReading(data);
          setBackendOk(true);
          setDataOk(true);
          if (data && data.siteName) {
            setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
          }
        })
        .catch(() => {
          setBackendOk(false);
          setDataOk(false);
        });
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 1000);
    return () => clearInterval(interval);
  }, [showLiveUpdates]);

  const handleLiveUpdatesClick = () => {
    setShowLiveUpdates(true);
    // Move map slightly left (not full center) - subtle movement from dashboard position
    // Dashboard is at lng 125.0041 - 0.060 = 124.9441
    // Preview moves to lng 125.0041 - 0.030 = 124.9741 (subtle shift, not dramatic)
    setTimeout(() => {
      mapRef.current?.resetView({ lat: 11.2447, lng: 124.9741 });
    }, 100);
  };

  const handleBackFromLiveUpdates = () => {
    setIsExitingLiveUpdates(true);
    // Start exit animation
    setTimeout(() => {
      setShowLiveUpdates(false);
      setIsExitingLiveUpdates(false);
      // Wait for overlay fade-out to complete before resetting map
      // This ensures smooth transition - map slides back as overlay fades
      setTimeout(() => {
        // Use explicit returnToDashboard method for guaranteed smooth slide
        if (mapRef.current?.returnToDashboard) {
          mapRef.current.returnToDashboard();
        } else {
          // Fallback to resetView if returnToDashboard not available
          mapRef.current?.resetView();
        }
      }, 100); // Small delay to sync with overlay exit
    }, 200);
  };

  const getHeroFontSize = () => {
    if (screenWidth < 480) return '30px'; // Small mobile
    if (screenWidth < 768) return '40px'; // Large mobile
    if (screenWidth < 1024) return '55px'; // Tablet
    return '55px'; // Desktop (as requested)
  };

  const getHeroParagraphFontSize = () => {
    if (screenWidth < 480) return '14px'; // Small mobile
    if (screenWidth < 768) return '16px'; // Large mobile
    if (screenWidth < 1024) return '18px'; // Tablet
    return '20px'; // Desktop
  };

  // Sample data
  const sampleAlerts = [
    {
      id: "1",
      title: "Critical Turbidity Level",
      details: "Turbidity 18.2 NTU — Barangay San Miguel River",
      level: "critical" as const,
      timestamp: "2025-09-15 14:31",
    },
    {
      id: "2",
      title: "Temperature Warning",
      details: "Water temp 32°C — Barangay Riverside",
      level: "warning" as const,
      timestamp: "2025-09-15 13:45",
    },
  ];

  const headlines = [
    "Protect your community from schistosomiasis with real-time water monitoring",
    "Early detection saves lives — Monitor water quality in your barangay",
    "Community safety starts with clean water — Track schistosomiasis risk together",
  ];

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col overflow-hidden bg-white">
      {/* Solid White Background container */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: '#e8eff1' }}>
        
        {/* Map loads behind gradient, fades in when ready - Dashboard style */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          <DashboardMap
            ref={mapRef}
            interactive={showLiveUpdates}
            mobileMode={isMobileOrTablet}
            onMapReady={() => {
              // Shorter delay - just wait for initial render
              setTimeout(() => setMapLoaded(true), 300);
            }}
          />
        </div>

        {/* Gradient overlay - hidden when preview is shown */}
        <div
          className="absolute inset-0 backdrop-blur-[1px]"
          style={{
            background: isMobileOrTablet
              ? "linear-gradient(to top, #357D86 0%, #357D86 1%, rgba(53,125,134,0.85) 50%, rgba(152,244,255,0) 95%)"
              : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.85) 35%, rgba(53,125,134,0.4) 55%, rgba(152,244,255,0) 85%)",
            zIndex: 1,
            pointerEvents: "none",
            opacity: showLiveUpdates ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      <header
        className="relative z-50 border-b border-gray-100"
        style={{ 
          backgroundColor: '#FFFFFF',
          transform: showLiveUpdates ? 'translateY(-100%)' : 'translateY(0)',
          transition: isExitingLiveUpdates ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: showLiveUpdates ? 'none' : 'auto',
        }}
      >
        <div className="w-full py-6" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img
                src="/schistoguard.png"
                alt="SchistoGuard Logo"
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
              <h1
                style={{
                  fontFamily: "Poppins, sans-serif",
                  color: "#357D86",
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                SchistoGuard
              </h1>
            </div>

            {/* Full button on tablet/desktop, icon-only on mobile */}
            {screenWidth >= 640 ? (
              <CTAButton
                variant="primary"
                size="sm"
                onClick={onEnterApp}
                ariaLabel="Start monitoring"
                className="flex rounded-full px-5 py-2 border-2 transition-all duration-300 shadow-lg"
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor: isMonitoringHovered ? '#FFFFFF' : '#357D86',
                  color: isMonitoringHovered ? '#357D86' : '#FFFFFF',
                  borderColor: '#357D86',
                  boxShadow: isMonitoringHovered ? '0 10px 25px -5px rgba(53, 125, 134, 0.3)' : '0 10px 15px -3px rgba(53, 125, 134, 0.2)',
                  transform: isMonitoringHovered ? 'translateY(-2px)' : 'translateY(0)'
                }}
                onMouseEnter={() => setIsMonitoringHovered(true)}
                onMouseLeave={() => setIsMonitoringHovered(false)}
              >
                Start monitoring
              </CTAButton>
            ) : (
              <button
                onClick={onEnterApp}
                aria-label="Start monitoring"
                className="flex items-center justify-center rounded-full border-2 transition-all duration-300 shadow-lg"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#357D86',
                  borderColor: '#357D86',
                  color: '#FFFFFF'
                }}
              >
                <Activity className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center" style={{ 
        transform: showLiveUpdates ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: showLiveUpdates ? 'none' : 'auto',
      }}>
        <section className="hidden lg:block w-full py-8">
          <div className="w-full" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6 max-w-4xl py-8 animate-fade-up" style={{ position: 'relative', top: '-20px' }}>
                <div className="space-y-4">
                  <h2
                    className="animate-fade-up animate-delay-50"
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      fontSize: getHeroFontSize(),
                      fontWeight: 800,
                      lineHeight: '1.2',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Know Your Water.<br />
                    Early detection for a schisto-free community.
                  </h2>

                  <p
                    className="leading-relaxed animate-fade-up animate-delay-100"
                    style={{
                      color: 'rgba(255,255,255,0.95)',
                      textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                      fontSize: getHeroParagraphFontSize()
                    }}
                  >
                    Real-time monitoring of water
                    sites to help prevent schistosomiasis.
                  </p>
                </div>

                <div 
                  className="flex flex-wrap animate-fade-up animate-delay-150"
                  style={{ gap: '24px' }}
                >
                  <TrustBadge
                    icon={
                      <Shield className="w-4 h-4 text-schistoguard-green" />
                    }
                    label="Real-time monitoring"
                  />
                  <TrustBadge
                    icon={
                      <SensorIcon className="w-4 h-4 text-schistoguard-teal" />
                    }
                    label="Multiple locations"
                  />
                  <TrustBadge
                    icon={
                      <Users className="w-4 h-4 text-schistoguard-coral" />
                    }
                    label="Public health focus"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-up animate-delay-200" style={{ marginTop: '100px' }}>
                  <CTAButton
                    variant="primary"
                    size="md"
                    onClick={handleLiveUpdatesClick}
                    ariaLabel="Live updates"
                    className="group transition-transform duration-500 transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#ffffffff',
                      borderRadius: '9999px',
                      padding: '16px 48px',
                      boxShadow: `
                        inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                        inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                        0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                        0 0 15px rgba(53, 125, 134, 0.3), 
                        0 0 30px rgba(53, 125, 134, 0.2)
                      `,
                      fontWeight: 600,
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      letterSpacing: '0.05em',
                      textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'inline-flex'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Live Updates
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
                  </CTAButton>
                </div>
              </div>

              {/* Removed HeroIllustration */}
              <div className="relative h-96 flex items-center justify-center">
                {/* Empty container to maintain layout balance without animations */}
              </div>
            </div>
          </div>
        </section>

        <section
          className="lg:hidden w-full px-4"
          style={{
            position: 'absolute',
            bottom: screenWidth >= 768 ? '120px' : '80px',
            left: 0,
            right: 0,
            zIndex: 20
          }}
        >
          <div className="text-center p-6 flex flex-col items-center">
            <div className="space-y-3 mb-6 animate-fade-up">
              <h2
                className="animate-fade-up animate-delay-50"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  fontSize: getHeroFontSize(),
                  fontWeight: 800,
                  lineHeight: '1.1',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Know Your Water.<br />
                Early detection for a schisto-free community.
              </h2>

              <p
                className="leading-relaxed max-w-2xl mx-auto animate-fade-up animate-delay-100"
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                  lineHeight: '1.2',
                  fontSize: getHeroParagraphFontSize()
                }}
              >
                Free, real-time monitoring of water
                sites to help prevent schistosomiasis.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-10 animate-fade-up animate-delay-150">
              <TrustBadge
                icon={
                  <Shield className="w-3 h-3 text-schistoguard-green" />
                }
                label="Real-time monitoring"
                small
              />
              <TrustBadge
                icon={
                  <SensorIcon className="w-3 h-3 text-schistoguard-teal" />
                }
                label="Multiple locations"
                small
              />
              <TrustBadge
                icon={
                  <Users className="w-3 h-3 text-schistoguard-coral" />
                }
                label="Public health focus"
                small
              />
            </div>
            <div className="flex justify-center w-full mx-auto animate-fade-up animate-delay-200" style={{ marginTop: '80px' }}>
              <CTAButton
                variant="primary"
                size="md"
                onClick={handleLiveUpdatesClick}
                ariaLabel="Live updates"
                className="group transition-transform duration-500 transform active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#ffffffff',
                  borderRadius: '9999px',
                  padding: '16px 48px',
                  boxShadow: `
                    inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                    inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                    0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                    0 0 15px rgba(53, 125, 134, 0.3), 
                    0 0 30px rgba(53, 125, 134, 0.2)
                  `,
                  fontWeight: 600,
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.05em',
                  textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Live Updates
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
              </CTAButton>
            </div>
          </div>
        </section>
      </main>

      {/* Live Updates Overlay */}
      {(showLiveUpdates || isExitingLiveUpdates) && (
        <div
          className="fixed inset-0 z-40"
          style={{
            animation: isExitingLiveUpdates ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.3s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {/* Dashboard-style gradient overlay - exact match to dashboard */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: "linear-gradient(to bottom right, #357D86 0%, rgba(53,125,134,0.6) 10%, rgba(152,244,255,0) 55%)",
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Content overlay on left side */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: isMobileOrTablet ? '100%' : '50%',
              padding: isMobileOrTablet 
                ? (screenWidth < 600 ? '80px 20px 20px' : '90px 30px 30px') 
                : '100px 50px 50px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              scrollbarWidth: 'none' as const,
              msOverflowStyle: 'none' as const,
              animation: 'contentSlideIn 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both',
              zIndex: 2,
              pointerEvents: 'auto',
            }}
          >
            {/* Back button */}
            <button
              onClick={handleBackFromLiveUpdates}
              style={{
                position: 'absolute',
                top: isMobileOrTablet ? 20 : 30,
                left: isMobileOrTablet ? 16 : 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                border: 'none',
                color: '#357D86',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                backdropFilter: 'blur(4px)',
              }}
              aria-label="Back to Home"
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>

            {/* Header */}
            <div style={{ pointerEvents: 'none', marginTop: isMobileOrTablet ? 20 : 0 }}>
              <h1
                style={{
                  margin: 0,
                  color: '#fff',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: isMobileOrTablet ? (screenWidth < 600 ? 26 : 32) : 38,
                  lineHeight: 1.15,
                  textShadow: '0 1px 6px rgba(0,0,0,0.18)',
                  animation: 'slideInFromRight 0.6s 0.2s ease-out both',
                }}
              >
                {siteData.siteName}
              </h1>
              <p
                style={{
                  margin: '6px 0 0',
                  color: 'rgba(255,255,255,0.92)',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isMobileOrTablet ? 13 : 16,
                  animation: 'slideInFromRight 0.6s 0.3s ease-out both',
                }}
              >
                {siteData.area} • {siteData.barangay}, {siteData.municipality}
              </p>
              
              {/* System Status Badge + Location Button */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginTop: 12,
                pointerEvents: 'auto',
                animation: 'slideInFromRight 0.6s 0.4s ease-out both',
              }}>
                <div style={{
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 6,
                  background: 'rgba(255,255,255,0.92)', 
                  borderRadius: 999,
                  padding: '5px 14px', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: (backendOk && dataOk) ? '#15803d' : '#6b7280',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)', 
                  backdropFilter: 'blur(4px)',
                  fontFamily: "'Poppins', sans-serif",
                }}>
                  <span style={{
                    width: 7, 
                    height: 7, 
                    borderRadius: '50%',
                    background: (backendOk && dataOk) ? '#22c55e' : '#9ca3af',
                    display: 'inline-block',
                    animation: (backendOk && dataOk) ? 'dotPulse 3s ease-in-out infinite' : 'none',
                  }} />
                  {(backendOk && dataOk) ? 'System Operational' : 'System Down'}
                </div>
                
                {/* Location/Recenter Button */}
                <button
                  onClick={() => mapRef.current?.resetView()}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.92)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(4px)',
                  }}
                  title="Reset map position"
                >
                  <LocateFixed size={15} color="#357D86" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Sensor Cards - Stacked Vertically */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                pointerEvents: 'auto',
                marginTop: 16,
                maxWidth: isMobileOrTablet ? '100%' : 320,
              }}
            >
              {/* Temperature Card */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.96)',
                  borderRadius: 20,
                  padding: '16px 18px 14px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.11)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.3s ease-out both',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('temperature', latestReading.temperature).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                }} />
                <img src="/icons/icon-temperature.svg" alt="temp"
                  style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 8 }} />
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: 14, color: '#77ABB2' }}>Temperature</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 26, color: '#6b7280' }}>
                    {latestReading ? latestReading.temperature : '—'}
                  </span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: '#6b7280' }}> °C</span>}
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: 11, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('temperature', latestReading.temperature).label}
                  </p>
                )}
              </div>

              {/* Turbidity Card */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.96)',
                  borderRadius: 20,
                  padding: '16px 18px 14px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.11)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.4s ease-out both',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('turbidity', latestReading.turbidity).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                }} />
                <img src="/icons/icon-turbidity.svg" alt="turbidity"
                  style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 8 }} />
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: 14, color: '#77ABB2' }}>Turbidity</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 26, color: '#6b7280' }}>
                    {latestReading ? latestReading.turbidity : '—'}
                  </span>
                  {latestReading && <span style={{ fontWeight: 700, fontSize: 14, color: '#6b7280' }}> NTU</span>}
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: 11, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('turbidity', latestReading.turbidity).label}
                  </p>
                )}
              </div>

              {/* pH Card */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.96)',
                  borderRadius: 20,
                  padding: '16px 18px 14px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.11)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.5s ease-out both',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: latestReading ? getSensorStatus('ph', latestReading.ph).color : '#9ca3af',
                  display: 'inline-block',
                  animation: latestReading ? 'dotPulse 3s ease-in-out infinite' : 'none',
                }} />
                <img src="/icons/icon-ph.svg" alt="ph"
                  style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 8 }} />
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: 14, color: '#77ABB2' }}>pH Level</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 26, color: '#6b7280' }}>
                    {latestReading ? latestReading.ph : '—'}
                  </span>
                </p>
                {latestReading && (
                  <p style={{ margin: 0, fontSize: 11, color: '#8E8B8B', lineHeight: 1.3 }}>
                    {getSensorStatus('ph', latestReading.ph).label}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>


      <AlertsQuickviewModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={sampleAlerts}
        onAcknowledge={(id) =>
          console.log(`Acknowledge alert ${id}`)
        }
        onViewSite={(id) =>
          console.log(`View site for alert ${id}`)
        }
      />
    </div>
  );
};