import React, { useState } from "react";
import {
  MapPin,
  Shield,
  Users,
  ArrowRight,
  Activity,
} from "lucide-react";
import { DashboardMap } from "../DashboardMap";
import {
  CTAButton,
  TrustBadge,
  AlertsQuickviewModal,
  SensorIcon,
} from "./LandingComponents";

interface LandingPageProps {
  onViewMap?: () => void;
  onLearnMore?: () => void;
  onEnterApp?: () => void;
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
      <div className="fixed inset-0 z-0 bg-white">
        
        {/* Map loads behind gradient, fades in when ready */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <DashboardMap
            interactive={false}
            mobileMode={isMobileOrTablet}
            onMapReady={() => {
            // Wait a full 2 seconds after the map is idle to give it extra time 
            // for all tiles to render completely before fading the map in.
            setTimeout(() => setMapLoaded(true), 2000);
          }}
          />
        </div>

        {/* Exact teal gradient overlay from the Dashboard preview - ALWAYS ON top */}
        <div
          className="absolute inset-0 backdrop-blur-[1px]"
          style={{
            background: isMobileOrTablet
              ? "linear-gradient(to top, #357D86 0%, #357D86 1%, rgba(53,125,134,0.85) 50%, rgba(152,244,255,0) 95%)"
              : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.85) 35%, rgba(53,125,134,0.4) 55%, rgba(152,244,255,0) 85%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      <header
        className="relative z-50 border-b border-gray-100"
        style={{ backgroundColor: '#FFFFFF' }}
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

      <main className="relative z-10 flex-1 flex flex-col justify-center">
        <section className="hidden lg:block w-full py-8">
          <div className="w-full" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6 max-w-4xl py-8 animate-fade-up" style={{ position: 'relative', top: '-20px' }}>
                <div className="space-y-4">
                  <h2
                    className="animate-fade-up animate-delay-100"
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
                    className="leading-relaxed animate-fade-up animate-delay-200"
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

                <div className="flex flex-wrap gap-2 animate-fade-up animate-delay-300">
                  <TrustBadge
                    icon={
                      <Shield className="w-3 h-3 text-schistoguard-green" />
                    }
                    label="Real-time monitoring"
                  />
                  <TrustBadge
                    icon={
                      <SensorIcon className="w-3 h-3 text-schistoguard-teal" />
                    }
                    label="Multiple locations"
                  />
                  <TrustBadge
                    icon={
                      <Users className="w-3 h-3 text-schistoguard-coral" />
                    }
                    label="Public health focus"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-up animate-delay-400" style={{ marginTop: '100px' }}>
                  <CTAButton
                    variant="primary"
                    size="md"
                    onClick={onLearnMore}
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
                className="animate-fade-up animate-delay-100"
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
                className="leading-relaxed max-w-2xl mx-auto animate-fade-up animate-delay-200"
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
            <div className="flex flex-wrap justify-center gap-1.5 mb-10 animate-fade-up animate-delay-300">
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
            <div className="flex justify-center w-full mx-auto animate-fade-up animate-delay-400" style={{ marginTop: '80px' }}>
              <CTAButton
                variant="primary"
                size="md"
                onClick={onLearnMore}
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