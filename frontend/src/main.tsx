import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';

registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {
    console.log('SchistoGuard PWA is ready for offline use');
  },
});

  createRoot(document.getElementById("root")!).render(<App />);
