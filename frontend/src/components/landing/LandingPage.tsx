import React, { useState } from "react";
import {
  MapPin,
  Shield,
  Users,
  ArrowRight,
} from "lucide-react";
import { HeroIllustration } from "./HeroIllustration";
import {
  CTAButton,
  TrustBadge,
  AlertsQuickviewModal,
  SensorIcon,
} from "./LandingComponents";
import logoImage from "../assets/SG.png";
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
  const [showAlertsModal, setShowAlertsModal] = useState(false);

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

  // Three headline variants
  const headlines = [
    "Protect your community from schistosomiasis with real-time water monitoring",
    "Early detection saves lives — Monitor water quality in your barangay",
    "Community safety starts with clean water — Track schistosomiasis risk together",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src={logoImage}
                alt="SchistoGuard Logo"
                className="w-10 h-10 object-contain"
              />
              <h1
                className="text-1xl"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  color: "#357D86",
                  fontWeight: 600,
                }}
              >
                SchistoGuard
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center">
        {/* Desktop Hero - Split Layout */}
        <section className="hidden lg:block w-full py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Content Block */}
              <div className="space-y-4">
                <h2 className="text-3xl lg:text-4xl font-bold text-schistoguard-navy leading-tight">
                  {headlines[0]}
                </h2>

                <p className="text-lg text-gray-700 leading-relaxed">
                  Free, real-time monitoring of barangay water
                  sites to help prevent schistosomiasis.
                </p>

                {/* Trust Row */}
                <div className="flex flex-wrap gap-2">
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

                {/* CTA Group */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <CTAButton
                    variant="primary"
                    size="md"
                    onClick={onLearnMore}
                    ariaLabel="Learn about schistosomiasis prevention"
                    className="group"
                  >
                    Learn about schistosomiasis
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </CTAButton>
                  <CTAButton
                    variant="secondary"
                    size="md"
                    onClick={onEnterApp}
                    ariaLabel="Start monitoring"
                    className="group"
                  >
                    Start monitoring
                  </CTAButton>
                </div>
              </div>

              {/* Hero Illustration */}
              <div className="relative">
                <HeroIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile/Tablet Hero - Stacked Layout */}
        <section className="lg:hidden w-full py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* Content Above Fold */}
            <div className="text-center space-y-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-schistoguard-navy leading-tight">
                {headlines[1]}
              </h2>

              <p className="text-base text-gray-700 leading-relaxed max-w-2xl mx-auto">
                Free, real-time monitoring of barangay water
                sites to help prevent schistosomiasis.
              </p>

              {/* Trust Row */}
              <div className="flex flex-wrap justify-center gap-2">
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

              {/* CTA Group */}
              <div className="flex flex-col gap-2 max-w-sm mx-auto">
                <CTAButton
                  variant="primary"
                  size="md"
                  onClick={onLearnMore}
                  ariaLabel="Learn about schistosomiasis"
                  className="w-full group"
                >
                  Learn about schistosomiasis
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </CTAButton>
                <CTAButton
                  variant="secondary"
                  size="md"
                  onClick={onEnterApp}
                  ariaLabel="Start monitoring"
                  className="w-full"
                >
                  Start monitoring
                </CTAButton>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="max-w-md mx-auto">
              <HeroIllustration />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <img
                src={logoImage}
                alt="SchistoGuard Logo"
                className="w-5 h-5 object-contain"
              />
              <span className="font-medium text-schistoguard-navy text-sm">
                SchistoGuard
              </span>
            </div>
            <p className="text-gray-600 text-xs">
              Real-time public health monitoring •
              Community-focused • Schistosomiasis prevention
            </p>
          </div>
        </div>
      </footer>

      {/* Alerts Modal */}
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