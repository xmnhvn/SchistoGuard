
import { useState, useEffect } from 'react';
import { NavigationProvider } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AlertsPage } from './components/AlertsPage';
import { ReportsPage } from './components/ReportsPage';
import { SitesDirectory } from './components/SitesDirectory';
import { SiteDetailView } from './components/SiteDetailView';
import { LandingPage } from './components/landing/LandingPage';
import { LoginForm, SignupForm } from './components/LoginForm';

type ViewType = 'landing' | 'login' | 'dashboard' | 'map' | 'sites' | 'site-details' | 'alerts' | 'reports';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'dashboard' | 'map' | 'sites' | 'site-details' | 'alerts' | 'reports'>(
    () => localStorage.getItem('currentView') as any || 'landing'
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'down'>('operational');
  const [showSignup, setShowSignup] = useState(false);
  const isViewType = (view: string | null): view is ViewType => {
    return (
      view === 'landing' ||
      view === 'login' ||
      view === 'dashboard' ||
      view === 'map' ||
      view === 'sites' ||
      view === 'site-details' ||
      view === 'alerts' ||
      view === 'reports'
    );
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    const storedView = localStorage.getItem('currentView');
    const allowedViews: ViewType[] = ['dashboard', 'alerts', 'reports', 'sites', 'map'];
    if (storedView && allowedViews.includes(storedView as ViewType)) {
      setCurrentView(storedView as ViewType);
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
        const res = await fetch("/api/session", { credentials: "include" });
        const data = await res.json();
        if (data.loggedIn) {
          setIsAuthenticated(true);
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
        onLearnMore={() => console.log('Learn more clicked')}
        onEnterApp={() => setCurrentView('login')}
      />
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
      >
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} setSystemStatus={setSystemStatus} />}
        {currentView === 'alerts' && <AlertsPage onNavigate={handleNavigate} />}
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