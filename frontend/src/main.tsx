import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { registerSW } from 'virtual:pwa-register';
import { Toaster } from "sonner";
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';

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

try {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Force-apply updated service worker so stale bundles are replaced quickly.
      updateSW(true)
        .then(() => {
          window.location.reload();
        })
        .catch((err) => {
          console.error('Failed to apply PWA update:', err);
        });
    },
    onOfflineReady() {
      console.log('SchistoGuard PWA is ready for offline use');
    },
  });
} catch (err) {
  console.error('PWA registration failed:', err);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <>
      <App />
      <DesktopOnlyToaster />
    </>
  );
} else {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: #d14343; font-family: sans-serif"><h2>Error: Application root element missing</h2></div>';
}
