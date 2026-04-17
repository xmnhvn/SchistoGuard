import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/mapMarker.css';

interface DashboardMapProps {
  sites?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    isActive?: boolean;
    isSelected?: boolean;
    sitePhoto?: string | null;
  }>;
  /** Called when a site marker is clicked */
  onSiteSelect?: (siteId: string) => void;
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
  /** Optional fit-bounds padding override for multi-site overview layouts */
  allSitesPadding?: { top: number; right: number; bottom: number; left: number };
}

export interface DashboardMapHandle {
  resetView: (center?: { lat: number; lng: number }) => void;
  resize: () => void;
  returnToDashboard: () => void;
}

export const DashboardMap = forwardRef<DashboardMapHandle, DashboardMapProps>(function DashboardMap({ sites, onSiteSelect, mobileMode = false, interactive, onMapReady, lngOffset = 0, latOffset = 0, allSitesPadding }, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [hiddenPhotoSiteId, setHiddenPhotoSiteId] = useState<string | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const photoBubbleMarker = useRef<maplibregl.Marker | null>(null);
  const previousPhotoBubbleKey = useRef<string>('');
  const defaultView = useRef<{ center: [number, number]; zoom: number }>({ center: [0, 0], zoom: 12 });
  const originalDashboardView = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const previousSitesJson = useRef<string>('');
  const previousSelectedSiteId = useRef<string | null>(null);

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
    const selectedSiteId = sites?.find((site) => site.isSelected)?.id || null;
    if (hiddenPhotoSiteId && hiddenPhotoSiteId !== selectedSiteId) {
      setHiddenPhotoSiteId(null);
    }
  }, [sitesJson, sites, hiddenPhotoSiteId]);

  useEffect(() => {
    if (mapUnavailable) return;
    if (!mapContainer.current) return;

    const sitesToShow = sites && sites.length > 0 ? sites : [];
    if (sitesToShow.length === 0) {
      if (photoBubbleMarker.current) {
        photoBubbleMarker.current.remove();
        photoBubbleMarker.current = null;
      }
      previousPhotoBubbleKey.current = '';
      return;
    }
    const hasExplicitSelectedSite = sitesToShow.some((site) => !!site.isSelected);
    const isAllSitesOverview = sitesToShow.length > 1 && !hasExplicitSelectedSite;

    const center = sitesToShow[0];
    const currentViewKey = isAllSitesOverview
      ? `all-sites:${sitesToShow.map((site) => site.id).join('|')}`
      : center.id;

    // Center map exactly on marker (with offsets) for the selected site
    // This ensures consistent visual locking effect for each selected site
    const updateMapCenter = () => {
      let mapCenter: [number, number];
      let mapZoom: number;
      if (isAllSitesOverview) {
        const bounds = new maplibregl.LngLatBounds();
        sitesToShow.forEach((site) => {
          bounds.extend([site.lng, site.lat]);
        });

        const fittedCamera = map.current
          ? map.current.cameraForBounds(bounds, {
              padding: allSitesPadding ?? (mobileMode
                ? { top: 112, right: 32, bottom: 112, left: 32 }
                : { top: 112, right: 112, bottom: 112, left: 112 }),
              maxZoom: mobileMode ? 12 : 13,
            })
          : null;

        if (fittedCamera?.center) {
          mapCenter = [fittedCamera.center.lng + lngOffset, fittedCamera.center.lat + latOffset];
          const fittedZoom = typeof fittedCamera.zoom === 'number' ? fittedCamera.zoom : (mobileMode ? 12 : 13);
          mapZoom = Math.max(5, fittedZoom - (mobileMode ? 0.08 : 0.12));
        } else {
          const avgLat = sitesToShow.reduce((sum, site) => sum + site.lat, 0) / sitesToShow.length;
          const avgLng = sitesToShow.reduce((sum, site) => sum + site.lng, 0) / sitesToShow.length;
          mapCenter = [avgLng + lngOffset, avgLat + latOffset];
          mapZoom = mobileMode ? 11.1 : 12.1;
        }
      } else if (sitesToShow.length >= 1) {
        mapCenter = [center.lng + lngOffset, center.lat + latOffset];
        mapZoom = 15; // Decreased zoom from 17 down to 15 for a wider view
      }
      defaultView.current = { center: mapCenter, zoom: mapZoom };
      
      const isInteractive = interactive !== undefined ? interactive : !mobileMode;

      if (!map.current) {
        try {
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
          previousSelectedSiteId.current = currentViewKey;
          if (!mobileMode) {
            originalDashboardView.current = { center: mapCenter, zoom: mapZoom };
          }
        } catch (error) {
          console.error('Map initialization failed:', error);
          setMapUnavailable(true);
          return;
        }
      } else {
        // Only update center if the selected site changed or markers count changed
        const selectedSiteChanged = currentViewKey !== previousSelectedSiteId.current;
        const markersCountChanged = sitesToShow.length !== markers.current.length;
        
        if (selectedSiteChanged || markersCountChanged) {
          if (!mobileMode) {
            originalDashboardView.current = { center: mapCenter, zoom: mapZoom };
          }
          map.current.easeTo({
            center: mapCenter,
            zoom: mapZoom,
            duration: 800,
            easing: (t) => t
          });
          previousSelectedSiteId.current = currentViewKey;
        }
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

    try {
      updateMapCenter();
    } catch (error) {
      console.error('Map update failed:', error);
      setMapUnavailable(true);
      return;
    }

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
            el.className = 'site-marker-container';

            const markerStateClass = site.isActive
              ? 'site-marker--active'
              : (site.isSelected ? 'site-marker--selected-inactive' : 'site-marker--inactive');

            el.innerHTML = `
              <div class="site-marker ${markerStateClass}">
                <div class="site-marker__pulse"></div>
                <div class="site-marker__ring"></div>
                <div class="site-marker__dot"></div>
              </div>`;

            if (site?.id) {
              el.addEventListener('click', (event) => {
                event.stopPropagation();
                if (!mobileMode && site.isSelected && site.sitePhoto) {
                  setHiddenPhotoSiteId((prev) => (prev === site.id ? null : site.id));
                  return;
                }
                setHiddenPhotoSiteId(null);
                onSiteSelect?.(site.id);
              });
            }

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
      previousSitesJson.current = sitesJson;
    }

    const selectedPhotoSite = !mobileMode
      ? sitesToShow.find((site) => site.isSelected && site.sitePhoto && site.id !== hiddenPhotoSiteId)
      : undefined;
    const photoBubbleKey = selectedPhotoSite
      ? `${selectedPhotoSite.id}:${selectedPhotoSite.sitePhoto ?? ''}`
      : '';

    if (!selectedPhotoSite || !map.current) {
      if (photoBubbleMarker.current) {
        photoBubbleMarker.current.remove();
        photoBubbleMarker.current = null;
      }
      previousPhotoBubbleKey.current = '';
    } else {
      const bubbleLngLat: [number, number] = [selectedPhotoSite.lng, selectedPhotoSite.lat];

      if (photoBubbleMarker.current && previousPhotoBubbleKey.current === photoBubbleKey) {
        photoBubbleMarker.current.setLngLat(bubbleLngLat);
      } else {
        if (photoBubbleMarker.current) {
          photoBubbleMarker.current.remove();
          photoBubbleMarker.current = null;
        }

        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'site-photo-pin';
        const safeImageId = `site-photo-clip-${selectedPhotoSite.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        bubbleEl.innerHTML = `
          <svg class="site-photo-pin__svg" viewBox="0 0 240 320" aria-hidden="true">
            <defs>
              <clipPath id="${safeImageId}">
                <circle cx="120" cy="112" r="78" />
              </clipPath>
            </defs>
            <path
              class="site-photo-pin__shape"
              d="M120 308C96 279 67 247 44 215C27 192 16 166 16 136C16 78.5624 62.5624 32 120 32C177.438 32 224 78.5624 224 136C224 166 213 192 196 215C173 247 144 279 120 308Z"
            />
            <image
              href="${selectedPhotoSite.sitePhoto}"
              x="42"
              y="34"
              width="156"
              height="156"
              preserveAspectRatio="xMidYMid slice"
              clip-path="url(#${safeImageId})"
              class="site-photo-pin__image"
            />
          </svg>
        `;

        photoBubbleMarker.current = new maplibregl.Marker({
          element: bubbleEl,
          anchor: 'bottom',
        })
          .setLngLat(bubbleLngLat)
          .addTo(map.current);

        const revealBubble = () => {
          bubbleEl.classList.add('site-photo-pin--visible');
        };
        if (map.current.loaded()) {
          requestAnimationFrame(revealBubble);
        } else {
          map.current.once('render', revealBubble);
        }

        previousPhotoBubbleKey.current = photoBubbleKey;
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
  }, [sitesJson, onSiteSelect, mobileMode, interactive, lngOffset, latOffset, allSitesPadding, mapUnavailable, hiddenPhotoSiteId]);


  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        markers.current = [];
        photoBubbleMarker.current = null;
        previousPhotoBubbleKey.current = '';
        previousSitesJson.current = '';
      }
    };
  }, []);

  if (mapUnavailable) {
    return <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />;
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '100%', background: '#ffffff' }} />;
});
