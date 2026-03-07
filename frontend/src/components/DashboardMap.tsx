import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/mapMarker.css';

interface DashboardMapProps {
  sites?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  /** When true, centers the map on the pin (for mobile/tablet fixed backgrounds) */
  mobileMode?: boolean;
  /** Override map interactivity. Defaults to !mobileMode when not provided. */
  interactive?: boolean;
}

export function DashboardMap({ sites, mobileMode = false, interactive }: DashboardMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const defaultSites = [
      { id: 'site-1', name: "Mang Jose's Fish Pond", lat: 11.2447, lng: 125.0041 }
    ];
    const sitesToShow = sites && sites.length > 0 ? sites : defaultSites;
    const center = sitesToShow[0];

    // Mobile/tablet: the map container fills the ENTIRE screen (inset:0).
    // desiredPinY = target Y position of the pin from the content top (px).
    // Calibrated per device width so the pin sits in the right spot on each phone.
    const NAV_H = 76;
    const contentH = window.innerHeight - NAV_H;
    const mapCenterY = contentH / 2;          // map anchor point in screen px
    const w = window.innerWidth;
    const desiredPinY =
      w <= 393 ? 280 :   // iPhone 14 Pro  (393×852)
        w <= 430 ? 325 :   // iPhone 14 Pro Max (430×932)
          w <= 480 ? 370 :   // Pixel 7 Pro (480×1040)
            w <= 829 ? 420 :   // iPad Air 5 (829×1170)  ← adjust this number
              400;               // other tablets
    // tablet — unchanged
    const pixelDelta = mapCenterY - desiredPinY;
    // meters/pixel at zoom 13, latitude ~11°  (WebMercator formula)
    const mPerPx = (156543.03392 * Math.cos(center.lat * Math.PI / 180)) / (1 << 13);
    const latOffset = (pixelDelta * mPerPx) / 111000;

    const mapCenter: [number, number] = mobileMode
      ? [center.lng, center.lat - latOffset]
      : [center.lng - 0.060, center.lat];    // desktop: original westward offset

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: mapCenter,
        zoom: mobileMode ? 13 : 12,
        attributionControl: false,
        interactive: interactive !== undefined ? interactive : !mobileMode,
      });
    } else if (mobileMode) {
      // Hot-reload / re-render: update center/zoom on the existing map instance
      map.current.setCenter(mapCenter);
      map.current.setZoom(13);
      // Explicitly enforce interactivity so it's correct even on hot-reload
      const isInteractive = interactive !== undefined ? interactive : false;
      const handlers = [
        map.current.dragPan,
        map.current.scrollZoom,
        map.current.boxZoom,
        map.current.dragRotate,
        map.current.keyboard,
        map.current.doubleClickZoom,
        map.current.touchZoomRotate,
      ] as Array<{ enable: () => void; disable: () => void }>;
      handlers.forEach(h => isInteractive ? h.enable() : h.disable());
    }

    // Remove old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    const addMarkers = () => {
      sitesToShow.forEach((site) => {
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="site-marker">
            <div class="site-marker__pulse"></div>
            <div class="site-marker__ring"></div>
            <div class="site-marker__dot"></div>
          </div>`;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([site.lng, site.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(site.name))
          .addTo(map.current!);

        markers.current.push(marker);
      });
    };

    if (map.current.isStyleLoaded()) {
      addMarkers();
    } else {
      map.current.once('load', addMarkers);
    }

    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
    };
  }, [sites, mobileMode]);

  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
