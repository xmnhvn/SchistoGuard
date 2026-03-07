import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { NavigationProvider } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { AlertsPage } from './components/AlertsPage';
import { ReportsPage } from './components/ReportsPage';
import { SitesDirectory } from './components/SitesDirectory';
import { SiteDetailView } from './components/SiteDetailView';
import { SettingsPage } from './components/SettingsPage';
import { AdminSettingsPage } from './components/AdminSettingsPage';
import { LandingPage } from './components/landing/LandingPage';
import { LoginForm } from './components/LoginForm';
import { apiGet, apiPost, apiPut } from './utils/api';

type ViewType = 'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'recipients' | 'admin-settings';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'recipients' | 'admin-settings'>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'down'>('operational');
  const [user, setUser] = useState<{ id: number; email: string; firstName: string; lastName: string; role: string; lastView?: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 600);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
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
      view === 'recipients' ||
      view === 'admin-settings'
    );
  };

  const handleLogin = (loggedInUser?: { id: number; email: string; firstName: string; lastName: string; role: string; lastView?: string }) => {
    setIsAuthenticated(true);

    if (loggedInUser) {
      setUser(loggedInUser);
      // Navigate to last view from backend (cloud storage)
      const lastView = loggedInUser.lastView || 'dashboard';
      if (isViewType(lastView) && lastView !== 'landing' && lastView !== 'login') {
        setCurrentView(lastView);
      } else {
        setCurrentView('dashboard');
      }
    } else {
      apiGet("/api/auth/session")
        .then(data => {
          if (data?.loggedIn && data?.user) {
            setUser(data.user);
            // Navigate to last view from backend (cloud storage)
            const lastView = data.user.lastView || 'dashboard';
            if (isViewType(lastView) && lastView !== 'landing' && lastView !== 'login') {
              setCurrentView(lastView);
            } else {
              setCurrentView('dashboard');
            }
          }
        })
        .catch(() => {});
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
  };

  const handleNavigate = (view: string) => {
    if (isViewType(view)) {
      setCurrentView(view);
      
      // Save to cloud backend if authenticated
      if (isAuthenticated && user) {
        apiPut("/api/auth/lastview", { lastView: view })
          .catch(err => console.error('Failed to save lastView:', err));
      }
    }
  };

  const handleViewSiteDetail = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentView('site-details');
    
    // Save to cloud backend if authenticated
    if (isAuthenticated && user) {
      apiPut("/api/auth/lastview", { lastView: 'site-details' })
        .catch(err => console.error('Failed to save lastView:', err));
    }
  };

  const handleBackFromSiteDetail = () => {
    setCurrentView('sites');
    setSelectedSiteId(null);
    
    // Save to cloud backend if authenticated
    if (isAuthenticated && user) {
      apiPut("/api/auth/lastview", { lastView: 'sites' })
        .catch(err => console.error('Failed to save lastView:', err));
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        console.log("🔄 Checking session...");
        const data = await apiGet("/api/auth/session");
        console.log("📡 Session response:", data);
        if (data.loggedIn) {
          setIsAuthenticated(true);
          setUser(data.user);
          console.log("✓ User authenticated:", data.user.email);
          // Use lastView from cloud backend
          const lastView = data.user?.lastView || 'dashboard';
          if (isViewType(lastView) && lastView !== 'landing' && lastView !== 'login') {
            setCurrentView(lastView);
          } else {
            setCurrentView('dashboard');
          }
        } else {
          console.log("✗ Not logged in");
          // Not logged in - start at landing page
          setCurrentView('landing');
        }
      } catch (error) {
        console.error("❌ Session check error:", error);
        // Error - start at landing page
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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white" style={isMobile ? { padding: 0, background: 'none' } : {}}>
        <div className={isMobile ? "" : "px-3 py-6"}>
          {isMobile ? (
            /* Mobile: Full-screen dashboard with back button positioned beside header */
            <div style={{ position: 'relative', height: '100vh' }}>
              <Dashboard onNavigate={(() => console.log('Navigation disabled in sensor-info view'))} setSystemStatus={setSystemStatus} viewMode="sensors-only" />
              <button
                onClick={() => setCurrentView('landing')}
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  zIndex: 10,
                  padding: 0,
                  flexShrink: 0,
                }}
                aria-label="Back to Home"
              >
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </button>
            </div>
          ) : (
            /* Desktop/Tablet: Original layout with left-aligned back button */
            <div className="flex gap-3 items-start">
              <button
                onClick={() => setCurrentView('landing')}
                className="flex items-center justify-center w-10 h-10 rounded-full text-schistoguard-navy hover:text-schistoguard-navy/80 transition-colors flex-shrink-0"
                aria-label="Back to Home"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <Dashboard onNavigate={(() => console.log('Navigation disabled in sensor-info view'))} setSystemStatus={setSystemStatus} viewMode="sensors-only" />
              </div>
              <div className="w-10 flex-shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <LoginForm onLogin={handleLogin} />;
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
        {/* Dashboard stays mounted (preserves map), hidden via CSS when not active */}
        <div style={{ display: currentView === 'dashboard' ? 'contents' : 'none' }}>
          <Dashboard onNavigate={handleNavigate} setSystemStatus={setSystemStatus} visible={currentView === 'dashboard'} />
        </div>
        <div style={{ display: currentView === 'alerts' ? 'contents' : 'none' }}>
          <AlertsPage onNavigate={handleNavigate} />
        </div>
        {currentView === 'reports' && <ReportsPage />}
        <div style={{ display: currentView === 'sites' ? 'contents' : 'none' }}>
          <SitesDirectory onViewSiteDetail={handleViewSiteDetail} />
        </div>
        {((currentView === 'site-details' && selectedSiteId) || currentView === 'site-details') && (
          <SiteDetailView siteId={selectedSiteId || 'site-1'} onBack={handleBackFromSiteDetail} />
        )}
        {currentView === 'recipients' && (
          <SettingsPage siteName={selectedSiteId || "All Sites"} />
        )}
        {currentView === 'admin-settings' && <AdminSettingsPage user={user} />}
      </NavigationProvider>
    );
  }

  return null;
}