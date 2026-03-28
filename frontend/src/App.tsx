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
import { UserProfilePage } from './components/UserProfilePage';
import { LandingPage } from './components/landing/LandingPage';
import { LoginForm } from './components/LoginForm';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { apiGet, apiPost, apiPut } from './utils/api';

type ViewType = 'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'recipients' | 'admin-settings' | 'user-profile';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'dashboard' | 'sensor-info' | 'sites' | 'site-details' | 'alerts' | 'reports' | 'recipients' | 'admin-settings' | 'user-profile'>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'down'>('operational');
  const [user, setUser] = useState<{ id: number; email: string; firstName: string; lastName: string; role: string; lastView?: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [adminUnlockOpen, setAdminUnlockOpen] = useState(false);
  const [adminUnlockEmail, setAdminUnlockEmail] = useState('');
  const [adminUnlockPassword, setAdminUnlockPassword] = useState('');
  const [adminUnlockError, setAdminUnlockError] = useState('');
  const [adminUnlockLoading, setAdminUnlockLoading] = useState(false);
  const [pendingAdminView, setPendingAdminView] = useState<ViewType | null>(null);

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
      view === 'admin-settings' ||
      view === 'user-profile'
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
        .catch(() => { });
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
    setAdminUnlockOpen(false);
    setAdminUnlockEmail('');
    setAdminUnlockPassword('');
    setAdminUnlockError('');
    setPendingAdminView(null);
  };

  const closeAdminUnlockModal = () => {
    if (adminUnlockLoading) return;
    setAdminUnlockOpen(false);
    setAdminUnlockEmail('');
    setAdminUnlockPassword('');
    setAdminUnlockError('');
    setPendingAdminView(null);
  };

  const submitAdminUnlock = async () => {
    setAdminUnlockError('');

    if (!adminUnlockEmail || !adminUnlockPassword) {
      setAdminUnlockError('Admin email and password are required.');
      return;
    }

    try {
      setAdminUnlockLoading(true);
      await apiPost('/api/auth/admin/unlock', {
        adminEmail: adminUnlockEmail,
        adminPassword: adminUnlockPassword
      });

      const targetView = pendingAdminView || 'admin-settings';
      setCurrentView(targetView);
      if (isAuthenticated && user) {
        apiPut('/api/auth/lastview', { lastView: targetView })
          .catch(err => console.error('Failed to save lastView:', err));
      }

      setAdminUnlockOpen(false);
      setAdminUnlockEmail('');
      setAdminUnlockPassword('');
      setAdminUnlockError('');
      setPendingAdminView(null);
    } catch (err: any) {
      setAdminUnlockError(err?.message || 'Admin authentication failed.');
    } finally {
      setAdminUnlockLoading(false);
    }
  };

  const handleNavigate = async (view: string) => {
    if (isViewType(view)) {
      if (view === 'admin-settings' && user?.role !== 'admin') {
        setPendingAdminView(view);
        setAdminUnlockOpen(true);
        return;
      }

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

      // Add artificial delay to make the loading screen stay longer
      setTimeout(() => {
        setLoading(false);
      }, 1500);
      
    })();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 h-[100dvh] w-full flex items-center justify-center bg-white z-[100]">
        <div className="flex items-center space-x-3 animate-pulse">
           <img
              src="/schistoguard.png"
              alt="SchistoGuard Logo"
              style={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <h1
              style={{
                fontFamily: "Poppins, sans-serif",
                color: "#357D86",
                fontWeight: 600,
                fontSize: 32,
              }}
            >
              SchistoGuard
            </h1>
        </div>
      </div>
    );
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
    return <LoginForm onLogin={handleLogin} onCancel={() => setCurrentView('landing')} />;
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
          <Dashboard onNavigate={handleNavigate} setSystemStatus={setSystemStatus} visible={currentView === 'dashboard'} user={user} />
        </div>
        <div style={{ display: currentView === 'alerts' ? 'contents' : 'none' }}>
          <AlertsPage onNavigate={handleNavigate} visible={currentView === 'alerts'} user={user} />
        </div>
        {currentView === 'reports' && <ReportsPage />}
        <div style={{ display: currentView === 'sites' ? 'contents' : 'none' }}>
          <SitesDirectory onViewSiteDetail={handleViewSiteDetail} visible={currentView === 'sites'} />
        </div>
        {((currentView === 'site-details' && selectedSiteId) || currentView === 'site-details') && (
          <div style={{ display: currentView === 'site-details' ? 'contents' : 'none' }}>
            <SiteDetailView siteId={selectedSiteId || 'site-1'} onBack={handleBackFromSiteDetail} visible={currentView === 'site-details'} />
          </div>
        )}
        {currentView === 'recipients' && (
          <SettingsPage siteName={selectedSiteId || "All Sites"} />
        )}
        {currentView === 'admin-settings' && <AdminSettingsPage user={user} />}
        {currentView === 'user-profile' && <UserProfilePage user={user} onBack={() => handleNavigate('dashboard')} onLogout={handleLogout} />}

        <Dialog open={adminUnlockOpen} onOpenChange={(open) => { if (!open) closeAdminUnlockModal(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Authentication Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter admin credentials to continue to Admin Settings.
              </p>

              <div className="space-y-2">
                <Label htmlFor="admin-unlock-email">Admin Email</Label>
                <Input
                  id="admin-unlock-email"
                  type="email"
                  value={adminUnlockEmail}
                  onChange={(e) => setAdminUnlockEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-unlock-password">Admin Password</Label>
                <Input
                  id="admin-unlock-password"
                  type="password"
                  value={adminUnlockPassword}
                  onChange={(e) => setAdminUnlockPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!adminUnlockLoading) {
                        submitAdminUnlock();
                      }
                    }
                  }}
                />
              </div>

              {adminUnlockError && (
                <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {adminUnlockError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeAdminUnlockModal} disabled={adminUnlockLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={submitAdminUnlock} disabled={adminUnlockLoading}>
                  {adminUnlockLoading ? 'Verifying...' : 'Verify Admin'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </NavigationProvider>
    );
  }

  return null;
}