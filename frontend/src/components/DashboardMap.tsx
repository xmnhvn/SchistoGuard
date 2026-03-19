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
  resetView: (center?: { lat: number; lng: number }) => void;
  resize: () => void;
  returnToDashboard: () => void;
}

export const DashboardMap = forwardRef<DashboardMapHandle, DashboardMapProps>(function DashboardMap({ sites, mobileMode = false, interactive, onMapReady }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const defaultView = useRef<{ center: [number, number]; zoom: number }>({ center: [0, 0], zoom: 12 });
  const originalDashboardView = useRef<{ center: [number, number]; zoom: number } | null>(null);

  useImperativeHandle(ref, () => ({
    resetView: (center?: { lat: number; lng: number }) => {
      if (map.current) {
        // If centering to preview, use provided coordinates
        // If returning to dashboard, ALWAYS use the saved original position
        const targetCenter: [number, number] = center 
          ? [center.lng, center.lat]
          : (originalDashboardView.current?.center || defaultView.current.center);
        
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
        mapCenter = [center.lng, center.lat];
        mapZoom = 17;
      } else if (sitesToShow.length > 1) {
        mapCenter = [center.lng, center.lat];
        mapZoom = 13;
      } else {
        mapCenter = [121.7740, 12.8797];
        mapZoom = 6;
      }
      defaultView.current = { center: mapCenter, zoom: mapZoom };
      if (!originalDashboardView.current && !mobileMode) {
        originalDashboardView.current = { center: mapCenter, zoom: mapZoom };
      }
      if (!map.current) {
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: mapCenter,
          zoom: mapZoom,
          minZoom: 0, // allow zooming out to entire world
          maxZoom: 19, // allow zooming in to street level
          attributionControl: false,
          interactive: true, // Always allow user interaction (zoom, pan)
        });
      } else if (sitesToShow.length !== markers.current.length) {
        // Only reset view if number of markers/sites changed
        map.current.jumpTo({ center: mapCenter, zoom: mapZoom });
      }
      // Always enable interactivity
      const handlers = [
        map.current!.dragPan,
        map.current!.scrollZoom,
        map.current!.boxZoom,
        map.current!.dragRotate,
        map.current!.keyboard,
        map.current!.doubleClickZoom,
        map.current!.touchZoomRotate,
      ] as Array<{ enable: () => void; disable: () => void }>;
      handlers.forEach(h => h.enable());
    };

    updateMapCenter();

    // Remove old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Only add markers if sitesToShow is not empty
    if (sitesToShow.length > 0) {
      const addMarkers = () => {
        if (!map.current) return;
        sitesToShow.forEach((site) => {
          const el = document.createElement('div');
          el.className = 'site-marker-container';
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
