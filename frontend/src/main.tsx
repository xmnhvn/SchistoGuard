import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';

const APP_VERSION = '2026-04-13-address-sync-fix';

async function cleanupStalePwaCache() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;

  const storedVersion = localStorage.getItem('sg_app_version');
  if (storedVersion === APP_VERSION) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Failed to unregister service workers during cleanup:', error);
  }

  try {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  } catch (error) {
    console.warn('Failed to clear caches during cleanup:', error);
  }

  localStorage.setItem('sg_app_version', APP_VERSION);
  window.location.reload();
}

registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    console.log('SchistoGuard PWA is ready for offline use');
  },
});

void cleanupStalePwaCache().then(() => {
  if (!document.getElementById('root')) return;
  createRoot(document.getElementById("root")!).render(<App />);
});
