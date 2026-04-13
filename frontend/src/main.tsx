import { createRoot } from "react-dom/client";
import React, { useEffect, useState } from "react";
import { registerSW } from 'virtual:pwa-register';
import { Toaster } from "sonner";
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';

type RootErrorBoundaryState = { hasError: boolean };

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fbfc',
            color: '#1f3f4e',
            fontFamily: 'Poppins, sans-serif',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>Something went wrong</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Please refresh this page to continue.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SW_REFRESH_GUARD_KEY = 'sg_sw_refreshed_once';

const isSafariBrowser = (() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
})();

if (isSafariBrowser && typeof window !== 'undefined') {
  // Safari can keep stale SW caches across deploys and cause white-screen reload loops.
  void (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (err) {
      console.warn('Safari SW/cache cleanup failed:', err);
    }
  })();
}

function DesktopOnlyToaster() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1100 : true
  );

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isDesktop) return null;

  return (
    <Toaster
      position="top-right"
      richColors={false}
      closeButton
      className="sg-toaster"
      toastOptions={{
        style: {
          borderRadius: 14,
          border: "1px solid rgba(26, 58, 74, 0.12)",
          background: "rgba(248, 252, 253, 0.98)",
          color: "#1f3f4e",
          boxShadow: "0 12px 26px rgba(20, 42, 56, 0.14)",
          fontFamily: "Poppins, sans-serif",
        },
      }}
      style={{ top: 12, right: 12 }}
    />
  );
}

if (!isSafariBrowser) {
  try {
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        // Avoid refresh loops when an update is detected.
        try {
          const alreadyRefreshed = sessionStorage.getItem(SW_REFRESH_GUARD_KEY) === '1';
          if (alreadyRefreshed) return;
          sessionStorage.setItem(SW_REFRESH_GUARD_KEY, '1');
        } catch {
          // Continue even if sessionStorage is unavailable.
        }

        updateSW(true).catch((err) => {
          console.error('Failed to apply PWA update:', err);
        });
      },
      onOfflineReady() {
        try {
          sessionStorage.removeItem(SW_REFRESH_GUARD_KEY);
        } catch {
          // Ignore storage access issues.
        }
        console.log('SchistoGuard PWA is ready for offline use');
      },
    });
  } catch (err) {
    console.error('PWA registration failed:', err);
  }
}

const rootElement = document.getElementById("root");

if (typeof window !== 'undefined') {
  const showRuntimeFallback = () => {
    const root = document.getElementById('root');
    if (!root) return;
    if (root.childElementCount > 0) return;
    root.innerHTML =
      '<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#f8fbfc;color:#1f3f4e;font-family:Poppins,sans-serif;padding:24px;text-align:center"><div><h2 style="margin:0 0 8px;font-size:24px">Runtime error occurred</h2><p style="margin:0;opacity:.8">Please refresh this page.</p></div></div>';
  };

  window.addEventListener('error', (event) => {
    console.error('Global runtime error:', event.error || event.message);
    showRuntimeFallback();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showRuntimeFallback();
  });
}

if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
      <DesktopOnlyToaster />
    </RootErrorBoundary>
  );
} else {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: #d14343; font-family: sans-serif"><h2>Error: Application root element missing</h2></div>';
}
