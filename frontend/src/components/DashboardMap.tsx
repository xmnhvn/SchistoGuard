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
    status?: 'active' | 'down' | 'unknown';
    lastSeen?: string | null;
    isDevice?: boolean;
  }>;
  /** When true, centers the map on the pin (for mobile/tablet fixed backgrounds) */
  mobileMode?: boolean;
  /** Override map interactivity. Defaults to !mobileMode when not provided. */
  interactive?: boolean;
  /** Called once the map tiles have loaded */
  onMapReady?: () => void;
  /** Longitude offset to shift the map center (negative = pin moves right on screen) */
  lngOffset?: number;
  /** Latitude offset to shift the map center (negative = pin moves up on screen) */
  latOffset?: number;
}

export interface DashboardMapHandle {
  resetView: (center?: { lat: number; lng: number }) => void;
  resize: () => void;
  returnToDashboard: () => void;
}

export const DashboardMap = forwardRef<DashboardMapHandle, DashboardMapProps>(function DashboardMap({ sites, mobileMode = false, interactive, onMapReady, lngOffset = 0, latOffset = 0 }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const defaultView = useRef<{ center: [number, number]; zoom: number }>({ center: [0, 0], zoom: 12 });
  const originalDashboardView = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const previousSitesJson = useRef<string>('');

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  useImperativeHandle(ref, () => ({
    resetView: (center?: { lat: number; lng: number }) => {
      if (map.current) {
        // If centering to preview, use provided coordinates
        // If returning to dashboard, rely on the defaultView.current.center which updates natively via props
        const targetCenter: [number, number] = center 
          ? [center.lng, center.lat]
          : defaultView.current.center;
        
        console.log('resetView called:', { 
          hasCenter: !!center, 
          targetCenter, 
          hasOriginalView: !!originalDashboardView.current,
          defaultCenter: defaultView.current.center,
          savedOriginalCenter: originalDashboardView.current?.center
        });
        
        // Use easeTo for smooth slide instead of panTo to avoid glitch/jump
        map.current.easeTo({
          center: targetCenter,
          zoom: defaultView.current.zoom,
          duration: center ? 600 : 500, // Preview: 0.6s fast, Return: 0.5s very fast
          easing: (t) => t, // Linear easing for clean slide
        });
      }
    },
    resize: () => {
      if (map.current) {
        map.current.resize();
      }
    },
    // New method to explicitly return to original dashboard position
    returnToDashboard: () => {
      if (map.current && originalDashboardView.current) {
        console.log('returnToDashboard called with center:', originalDashboardView.current.center);
        map.current.easeTo({
          center: originalDashboardView.current.center,
          duration: 1500, // Slower, more elegant animation (was 1000ms)
          easing: (t) => t,
        });
      }
    },
  }));

  // Use JSON stringify to prevent infinite unneeded re-renders when parent passes a new array reference
  const sitesJson = sites ? JSON.stringify(sites) : '';

  useEffect(() => {
    if (!mapContainer.current) return;

    const sitesToShow = sites && sites.length > 0 ? sites : [];

    // If no sites, center map to Philippines as neutral view
    const center = sitesToShow[0] || { lat: 12.8797, lng: 121.7740, name: '', id: '' };

    // Center map exactly on marker and use higher zoom if only one marker
    // Only set center/zoom on initial mount or when sites change, not on every render
    const updateMapCenter = () => {
      let mapCenter: [number, number];
      let mapZoom: number;
      if (sitesToShow.length === 1) {
        mapCenter = [center.lng + lngOffset, center.lat + latOffset];
        mapZoom = 17;
      } else if (sitesToShow.length > 1) {
        mapCenter = [center.lng + lngOffset, center.lat + latOffset];
        mapZoom = 13;
      } else {
        mapCenter = [121.7740, 12.8797];
        mapZoom = 6;
      }
      defaultView.current = { center: mapCenter, zoom: mapZoom };
      if (!originalDashboardView.current && !mobileMode) {
        originalDashboardView.current = { center: mapCenter, zoom: mapZoom };
      }
      const isInteractive = interactive !== undefined ? interactive : !mobileMode;

      if (!map.current) {
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: mapCenter,
          zoom: mapZoom,
          minZoom: 0, // allow zooming out to entire world
          maxZoom: 19, // allow zooming in to street level
          attributionControl: false,
          // Always initialize as true so MapLibre attaches root DOM listeners (crucial for touch events like mobile/tablet).
          // We will dynamically enable/disable the actual handlers right after creation instead.
          interactive: true, 
        });
      } else if (sitesToShow.length !== markers.current.length) {
        // Only reset view if number of markers/sites changed
        map.current.jumpTo({ center: mapCenter, zoom: mapZoom });
      }
      // Dynamically enable/disable interactivity based on prop
      const handlers = [
        map.current!.dragPan,
        map.current!.scrollZoom,
        map.current!.boxZoom,
        map.current!.dragRotate,
        map.current!.keyboard,
        map.current!.doubleClickZoom,
        map.current!.touchZoomRotate,
      ] as Array<{ enable: () => void; disable: () => void }>;
      
      handlers.forEach(h => {
        if (isInteractive) h.enable();
        else h.disable();
      });

      // Update cursor
      if (map.current.getCanvas()) {
        map.current.getCanvas().style.cursor = isInteractive ? '' : 'default';
      }
    };

    updateMapCenter();

    // Only touch markers if the actual site data changed
    if (previousSitesJson.current !== sitesJson) {
      // Remove old markers
      markers.current.forEach(m => m.remove());
      markers.current = [];

      // Only add markers if sitesToShow is not empty
      if (sitesToShow.length > 0) {
        const addMarkers = () => {
          if (!map.current) return;
          sitesToShow.forEach((site) => {
            const el = document.createElement('div');
            const status = site.status || 'unknown';
            el.className = `site-marker-container site-marker-container--${status}`;
            el.setAttribute('data-status', status);
            const safeName = escapeHtml(site.name);
            el.innerHTML = `
              <div class="site-marker">
                <div class="site-marker__pulse"></div>
                <div class="site-marker__ring"></div>
                <div class="site-marker__dot"></div>
                <div class="site-marker__label">${safeName}</div>
              </div>`;
            const popupStatusLabel = status === 'active' ? 'Connected' : status === 'down' ? 'Down' : 'Unknown';
            const popupLastSeen = site.lastSeen
              ? new Date(site.lastSeen).toLocaleString()
              : status === 'active'
                ? 'Live signal'
                : 'No recent signal';
            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([site.lng, site.lat])
              .setPopup(new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
                <div style="min-width: 180px; font-family: Poppins, sans-serif; text-align: left;">
                  <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${safeName}</div>
                  <div style="font-size: 12px; color: ${status === 'active' ? '#16a34a' : status === 'down' ? '#dc2626' : '#64748b'}; font-weight: 600; margin-bottom: 4px;">${popupStatusLabel}</div>
                  <div style="font-size: 11px; color: #64748b;">Lat: ${site.lat.toFixed(5)}<br/>Lng: ${site.lng.toFixed(5)}<br/>Last seen: ${popupLastSeen}</div>
                </div>
              `))
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
      }
      previousSitesJson.current = sitesJson;
    }

    // Wait for the map to become completely idle (all tiles loaded and painted)
    if (map.current!.loaded()) {
      onMapReady?.();
    } else {
      map.current!.once('idle', () => {
        onMapReady?.();
      });
    }

    const handleResize = () => {
      if (map.current) {
        map.current.resize();
        // Removed `if (mobileMode) updateMapCenter()` to prevent snapping back and interrupting panning on browser chrome changes
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [sitesJson, mobileMode, interactive, lngOffset, latOffset]);


  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        markers.current = [];
        previousSitesJson.current = '';
      }
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
});
