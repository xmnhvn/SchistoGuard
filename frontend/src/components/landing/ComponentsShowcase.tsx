import React, { useState } from 'react';
import { 
  CTAButton, 
  StatusBadge, 
  TrustBadge, 
  AlertOverlay, 
  SiteSpotCard,
  AlertsQuickviewModal,
  SchistoIcon,
  OpenAccessIcon,
  SensorIcon
} from './LandingComponents';
import { TokensDisplay } from './LandingTokens';
import { Shield, Users, MapPin } from 'lucide-react';

export const ComponentsShowcase: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [subscriptionStates, setSubscriptionStates] = useState<{[key: string]: boolean}>({
    site1: false,
    site2: true
  });

  const sampleAlerts = [
    {
      id: '1',
      title: 'Critical Turbidity Level',
      details: 'Turbidity 18.2 NTU — Barangay San Miguel River',
      level: 'critical' as const,
      timestamp: '2025-09-15 14:31'
    },
    {
      id: '2',
      title: 'Temperature Warning',
      details: 'Water temp 32°C — Barangay Riverside',
      level: 'warning' as const,
      timestamp: '2025-09-15 13:45'
    }
  ];

  const handleSubscriptionToggle = (siteId: string) => {
    setSubscriptionStates(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-schistoguard-navy mb-2">SchistoGuard UI Kit Components</h1>
        <p className="text-gray-600 mb-8">Complete design system for the SchistoGuard landing page and application</p>
      </div>

      <section>
        <h2 className="text-2xl font-bold text-schistoguard-navy mb-6">00 — Design Tokens</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <TokensDisplay />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-schistoguard-navy mb-6">01 — Components</h2>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Buttons & CTAs</h3>
          <div className="space-y-4">

            <div>
              <h4 className="text-md font-medium mb-3">Sizes</h4>
              <div className="flex flex-wrap gap-4 items-end">
                <CTAButton variant="primary" size="sm">Small Button</CTAButton>
                <CTAButton variant="primary" size="md">Medium Button</CTAButton>
                <CTAButton variant="primary" size="lg">Large Button</CTAButton>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Variants</h4>
              <div className="flex flex-wrap gap-4">
                <CTAButton variant="primary">Primary CTA</CTAButton>
                <CTAButton variant="secondary">Secondary CTA</CTAButton>
                <CTAButton variant="tertiary">Tertiary Link</CTAButton>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">States (hover for effects)</h4>
              <div className="flex flex-wrap gap-4">
                <CTAButton variant="primary" ariaLabel="Learn more about schistosomiasis">Learn about schistosomiasis</CTAButton>
                <CTAButton variant="secondary" ariaLabel="View interactive map">
                  <MapPin className="w-4 h-4 mr-2" />
                  View risk map
                </CTAButton>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Badges</h3>
          <div className="space-y-4">

            <div>
              <h4 className="text-md font-medium mb-3">Status Badges</h4>
              <div className="flex flex-wrap gap-3">
                <StatusBadge variant="safe">Safe</StatusBadge>
                <StatusBadge variant="warning">Warning</StatusBadge>
                <StatusBadge variant="critical">Critical</StatusBadge>
                <StatusBadge variant="info">Info</StatusBadge>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Trust Badges</h4>
              <div className="flex flex-wrap gap-3">
                <TrustBadge 
                  icon={<OpenAccessIcon className="w-4 h-4 text-schistoguard-teal" />} 
                  label="Open Access" 
                />
                <TrustBadge 
                  icon={<Shield className="w-4 h-4 text-schistoguard-green" />} 
                  label="No login required" 
                />
                <TrustBadge 
                  icon={<Users className="w-4 h-4 text-schistoguard-coral" />} 
                  label="Community-focused" 
                />
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Sizes</h4>
              <div className="flex flex-wrap gap-3 items-center">
                <StatusBadge variant="warning" size="sm">Small Warning</StatusBadge>
                <StatusBadge variant="warning" size="md">Medium Warning</StatusBadge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Icon Set</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <SchistoIcon className="w-8 h-8 text-schistoguard-teal" />
              </div>
              <div className="text-sm text-gray-600">Schistosome</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <SensorIcon className="w-8 h-8 text-schistoguard-teal" />
              </div>
              <div className="text-sm text-gray-600">Sensor</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <MapPin className="w-8 h-8 text-schistoguard-teal" />
              </div>
              <div className="text-sm text-gray-600">Map Pin</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <OpenAccessIcon className="w-8 h-8 text-schistoguard-teal" />
              </div>
              <div className="text-sm text-gray-600">Open Access</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Alert Overlay</h3>
          <div className="space-y-4 max-w-sm">
            <AlertOverlay
              level="critical"
              title="Critical Alert"
              details="Turbidity 18.2 NTU — Barangay San Miguel River"
              timestamp="2025-09-15 14:31"
              onAcknowledge={() => alert('Alert acknowledged')}
              onViewSite={() => alert('Navigate to site')}
            />
            <AlertOverlay
              level="warning"
              title="Temperature Warning"
              details="Water temp 32°C — Barangay Riverside"
              timestamp="2025-09-15 13:45"
              onAcknowledge={() => alert('Alert acknowledged')}
              onViewSite={() => alert('Navigate to site')}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-schistoguard-navy mb-6">02 — Hero Components</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Hero Illustration</h3>
          <p className="text-gray-600 mb-4">
            Layered illustration component with exportable layers: sky, village, river-base, river-waves, 
            sensor, sensor-connection, characters, schisto-callout, alert-overlay, and foreground foliage.
          </p>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-500 mb-2">Preview (see LandingPage component for full implementation):</div>
            <div className="h-32 bg-gradient-to-b from-blue-100 to-blue-200 rounded flex items-center justify-center">
              <span className="text-gray-600">Hero Illustration Component</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-schistoguard-navy mb-6">03 — Site Spotlight & Modal</h2>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Site Spotlight Cards</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <SiteSpotCard
              siteName="San Miguel River"
              barangay="Barangay San Miguel"
              readings={{ turbidity: 18.2, temperature: 28, ph: 7.2, uv: 4 }}
              riskLevel="critical"
              timestamp="15 minutes ago"
              isSubscribed={subscriptionStates.site1}
              onSubscriptionToggle={() => handleSubscriptionToggle('site1')}
            />
            <SiteSpotCard
              siteName="Riverside Park"
              barangay="Barangay Centro"
              readings={{ turbidity: 3.1, temperature: 26, ph: 7.8, uv: 2 }}
              riskLevel="safe"
              timestamp="1 hour ago"
              isSubscribed={subscriptionStates.site2}
              onSubscriptionToggle={() => handleSubscriptionToggle('site2')}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Alerts Quickview Modal</h3>
          <p className="text-gray-600 mb-4">
            Modal component for displaying recent alerts with acknowledge and view actions.
          </p>
          <CTAButton variant="primary" onClick={() => setShowModal(true)}>
            Open Alerts Modal
          </CTAButton>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-schistoguard-navy mb-6">04 — Implementation Notes</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Accessibility Features:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>All interactive elements have proper aria-labels</li>
                <li>Focus outlines visible on keyboard navigation</li>
                <li>Color contrast ratios ≥4.5:1 for text</li>
                <li>Semantic HTML structure</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Animation & Motion:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>River waves: subtle parallax and wave animation</li>
                <li>Alert overlay: pulse once on load, then subtle loop</li>
                <li>CTA hover: scale (105%) and shadow enhancement</li>
                <li>Sensor connection: animated dots showing data transmission</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Responsive Behavior:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Desktop (1440px): Split hero layout with illustration on right</li>
                <li>Tablet (1024px): Stacked layout, content above illustration</li>
                <li>Mobile (375px): Optimized typography and touch targets</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Export Formats:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>SVG layers: hero-illustration.svg, hero-alert-overlay.svg, icon-schisto.svg</li>
                <li>PNG assets: site-spot@1x.png, site-spot@2x.png</li>
                <li>CSS variables: Available in LandingTokens.tsx</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <AlertsQuickviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        alerts={sampleAlerts}
        onAcknowledge={(id) => alert(`Acknowledged alert ${id}`)}
        onViewSite={(id) => alert(`Navigate to site for alert ${id}`)}
      />
    </div>
  );
};