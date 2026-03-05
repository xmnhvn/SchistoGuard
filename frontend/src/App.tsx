import { useState, useEffect } from 'react';
import { NavigationProvider } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AlertsPage } from './components/AlertsPage';
import { ReportsPage } from './components/ReportsPage';
import { SitesDirectory } from './components/SitesDirectory';
import { SiteDetailView } from './components/SiteDetailView';
import { SettingsPage } from './components/SettingsPage';
import { LandingPage } from './components/landing/LandingPage';
import { LoginForm, SignupForm } from './components/LoginForm';
import { apiGet, apiPost } from './utils/api';

type ViewType = 'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'settings'>(
    () => localStorage.getItem('currentView') as any || 'landing'
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'down'>('operational');
  const [showSignup, setShowSignup] = useState(false);
  const [user, setUser] = useState<{ id: number; email: string; firstName: string; lastName: string; role: string } | null>(null);
  const isViewType = (view: string | null): view is ViewType => {
    return (
      view === 'landing' ||
      view === 'login' ||
      view === 'dashboard' ||
      view === 'sensor-info' ||
      view === 'sites' ||
      view === 'site-details' ||
      view === 'alerts' ||
      view === 'reports' ||
      view === 'settings'
    );
  };

  const handleLogin = (loggedInUser?: { id: number; email: string; firstName: string; lastName: string; role: string }) => {
    setIsAuthenticated(true);

    if (loggedInUser) {
      setUser(loggedInUser);
    } else {
      apiGet("/api/auth/session")
        .then(data => {
          if (data?.loggedIn && data?.user) {
            setUser(data.user);
          }
        })
        .catch(() => {});
    }

    const storedView = localStorage.getItem('currentView');
    const allowedViews: ViewType[] = ['dashboard', 'alerts', 'reports', 'sites', 'settings'];
    if (storedView && allowedViews.includes(storedView as ViewType)) {
      setCurrentView(storedView as ViewType);
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } catch (err) {
      console.error("Logout error:", err);
    }
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView('landing');
    localStorage.setItem('currentView', 'landing');
  };

  const handleNavigate = (view: string) => {
    if (isViewType(view)) {
      setCurrentView(view);
      localStorage.setItem('currentView', view);
    }
  };

  const handleViewSiteDetail = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentView('site-details');
    localStorage.setItem('currentView', 'site-details');
  };

  const handleBackFromSiteDetail = () => {
    setCurrentView('sites');
    setSelectedSiteId(null);
    localStorage.setItem('currentView', 'sites');
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet("/api/auth/session");
        if (data.loggedIn) {
          setIsAuthenticated(true);
          setUser(data.user);
          const lastView = localStorage.getItem('currentView');
          if (isViewType(lastView) && lastView !== 'landing' && lastView !== 'login') {
            setCurrentView(lastView);
          } else {
            setCurrentView('dashboard');
          }
        } else {
          setCurrentView('landing');
        }
      } catch {
        setCurrentView('landing');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (currentView === 'landing') {
    return (
      <LandingPage
        onViewMap={() => setCurrentView('login')}
        onLearnMore={() => setCurrentView('sensor-info')}
        onEnterApp={() => setCurrentView('login')}
      />
    );
  }

  if (currentView === 'sensor-info') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setCurrentView('landing')}
            className="mb-6 px-4 py-2 text-sm font-medium text-schistoguard-navy hover:text-schistoguard-navy/80"
          >
            ← Back to Home
          </button>
          <Dashboard onNavigate={(() => console.log('Navigation disabled in sensor-info view'))} setSystemStatus={setSystemStatus} viewMode="sensors-only" />
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    if (showSignup) {
      return <SignupForm onShowLogin={() => setShowSignup(false)} />;
    }
    return <LoginForm onLogin={handleLogin} onShowSignup={() => setShowSignup(true)} />;
  }

  if (isAuthenticated) {
    return (
      <NavigationProvider
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        systemStatus={systemStatus}
        user={user}
      >
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} setSystemStatus={setSystemStatus} />}
        {currentView === 'alerts' && <AlertsPage onNavigate={handleNavigate} />}
        {currentView === 'reports' && <ReportsPage />}
        {currentView === 'sites' && <SitesDirectory onViewSiteDetail={handleViewSiteDetail} />}
        {((currentView === 'site-details' && selectedSiteId) || currentView === 'site-details') && (
          <SiteDetailView siteId={selectedSiteId || 'site-1'} onBack={handleBackFromSiteDetail} />
        )}
        {currentView === 'settings' && (
          <SettingsPage siteName={selectedSiteId || "Mang Jose's Fish Pond"} />
        )}
      </NavigationProvider>
    );
  }

  return null;
}