import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';

try {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Don't auto-reload; let user decide or reload manually
      console.log('PWA update available');
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
  createRoot(rootElement).render(<App />);
} else {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: #d14343; font-family: sans-serif"><h2>Error: Application root element missing</h2></div>';
}
