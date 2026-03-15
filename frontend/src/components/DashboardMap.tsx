import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  /** Called once the map tiles have loaded */
  onMapReady?: () => void;
}

export interface DashboardMapHandle {
  resetView: () => void;
  resize: () => void;
}

export const DashboardMap = forwardRef<DashboardMapHandle, DashboardMapProps>(function DashboardMap({ sites, mobileMode = false, interactive, onMapReady }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const defaultView = useRef<{ center: [number, number]; zoom: number }>({ center: [0, 0], zoom: 12 });

  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (map.current) {
        map.current.flyTo({
          center: defaultView.current.center,
          zoom: defaultView.current.zoom,
          duration: 800,
        });
      }
    },
    resize: () => {
      if (map.current) {
        map.current.resize();
      }
    },
  }));

  useEffect(() => {
    if (!mapContainer.current) return;

    const defaultSites = [
      { id: 'site-1', name: "Mang Jose's Fish Pond", lat: 11.2447, lng: 125.0041 }
    ];
    const sitesToShow = sites && sites.length > 0 ? sites : defaultSites;
    const center = sitesToShow[0];

    // Mobile/tablet: the map container fills the ENTIRE screen (inset:0).
    const updateMapCenter = () => {
      const NAV_H = 76;
      const contentH = window.innerHeight - NAV_H;
      const mapCenterY = contentH / 2;
      const w = window.innerWidth;
      
      const desiredPinY =
        w <= 393 ? 280 :   // iPhone 14 Pro
          w <= 430 ? 325 :   // iPhone 14 Pro Max
            w <= 480 ? 370 :   // Pixel 7 Pro
              w <= 829 ? 420 :   // iPad Air 5
                400;

      const pixelDelta = mapCenterY - desiredPinY;
      const mPerPx = (156543.03392 * Math.cos(center.lat * Math.PI / 180)) / (1 << 13);
      const latOffset = (pixelDelta * mPerPx) / 111000;

      const mapCenter: [number, number] = mobileMode
        ? [center.lng, center.lat - latOffset]
        : [center.lng - 0.060, center.lat];

      const mapZoom = mobileMode ? 13 : 12;
      defaultView.current = { center: mapCenter, zoom: mapZoom };

      if (!map.current) {
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: mapCenter,
          zoom: mapZoom,
          attributionControl: false,
          interactive: interactive !== undefined ? interactive : !mobileMode,
        });
      } else {
        map.current.jumpTo({ center: mapCenter, zoom: mapZoom });
        
        // Update handlers if needed
        const isInteractive = interactive !== undefined ? interactive : !mobileMode;
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
    };

    updateMapCenter();

    // Remove old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    const addMarkers = () => {
      if (!map.current) return;
      sitesToShow.forEach((site) => {
        const el = document.createElement('div');
        el.className = 'site-marker-container'; // Better for CSS selection
        el.innerHTML = `
          <div class="site-marker">
            <div class="site-marker__pulse"></div>
            <div class="site-marker__ring"></div>
            <div class="site-marker__dot"></div>
          </div>`;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([site.lng, site.lat])
          .addTo(map.current!);

        markers.current.push(marker);
      });
    };

    if (map.current!.isStyleLoaded()) {
      addMarkers();
    } else {
      map.current!.once('load', () => {
        addMarkers();
      });
    }

    // Wait for the map to become completely idle (all tiles loaded and painted)
    if (map.current!.loaded()) {
      onMapReady?.();
    } else {
      map.current!.once('idle', () => {
        onMapReady?.();
      });
    }

    // Performance optimization: resize listener with throttle/debounce equivalent or simple re-calc
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
        if (mobileMode) updateMapCenter();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      markers.current.forEach(m => m.remove());
      markers.current = [];
    };
  }, [sites, mobileMode, interactive]);


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
});
