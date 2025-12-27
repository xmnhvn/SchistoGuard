import { useState } from 'react';
import { NavigationProvider } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AlertsPage } from './components/AlertsPage';
import { ReportsPage } from './components/ReportsPage';
import { SitesDirectory } from './components/SitesDirectory';
import { SiteDetailView } from './components/SiteDetailView';
import { LandingPage } from './components/landing/LandingPage';
import { LoginForm } from './components/LoginForm';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'dashboard' | 'map' | 'sites' | 'site-details' | 'alerts' | 'reports'>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('landing');
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as any);
  };

  const handleViewSiteDetail = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentView('site-details');
  };

  const handleBackFromSiteDetail = () => {
    setCurrentView('sites');
    setSelectedSiteId(null);
  };

  // Landing page view
  if (currentView === 'landing') {
    return (
      <LandingPage
        onViewMap={() => setCurrentView('login')}
        onLearnMore={() => console.log('Learn more clicked')}
        onEnterApp={() => setCurrentView('login')}
      />
    );
  }

  // Login view
  if (currentView === 'login') {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Authenticated views
  if (isAuthenticated) {
    // Pass currentView directly so 'site-details' matches sidebar logic
    return (
      <NavigationProvider
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentView === 'alerts' && <AlertsPage />}
        {currentView === 'reports' && <ReportsPage />}
        {currentView === 'sites' && <SitesDirectory onViewSiteDetail={handleViewSiteDetail} />}
        {((currentView === 'site-details' && selectedSiteId) || currentView === 'site-details') && (
          <SiteDetailView siteId={selectedSiteId || 'site-1'} onBack={handleBackFromSiteDetail} />
        )}
        {currentView === 'map' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-bold text-schistoguard-navy mb-2">Map View</h2>
              <p className="text-gray-600">Interactive map coming soon</p>
            </div>
          </div>
        )}
      </NavigationProvider>
    );
  }

  return null;
}
