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
    noticeTone?: 'critical' | 'warning' | 'safe' | 'offline';
    noticePill?: string;
    noticeMessage?: string;
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
  const markers = useRef<maplibregl.Marker[]>([]);
  const [expandedPhotoSiteId, setExpandedPhotoSiteId] = useState<string | null>(null);
  const [closingPhotoSiteId, setClosingPhotoSiteId] = useState<string | null>(null);
  const [pendingPhotoSiteId, setPendingPhotoSiteId] = useState<string | null>(null);
  const hasReportedReady = useRef(false);
  const defaultView = useRef<{ center: [number, number]; zoom: number }>({ center: [0, 0], zoom: 12 });
  const originalDashboardView = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const previousSitesJson = useRef<string>('');
  const latestSitesRef = useRef<NonNullable<DashboardMapProps['sites']>>([]);
  const previousSelectedSiteId = useRef<string | null>(null);
  const previousExpandedPhotoSiteId = useRef<string | null>(null);
  const previousClosingPhotoSiteId = useRef<string | null>(null);
  const closePhotoTimeoutRef = useRef<number | null>(null);
  const pendingOpenTimeoutRef = useRef<number | null>(null);
  const pendingMoveEndHandlerRef = useRef<(() => void) | null>(null);
  const canShowPhotoPreview = !mobileMode;
  const CLOSE_ANIMATION_MS = 260;

  const clearPendingOpen = () => {
    if (pendingOpenTimeoutRef.current !== null) {
      window.clearTimeout(pendingOpenTimeoutRef.current);
      pendingOpenTimeoutRef.current = null;
    }

    if (map.current && pendingMoveEndHandlerRef.current) {
      map.current.off('moveend', pendingMoveEndHandlerRef.current);
      pendingMoveEndHandlerRef.current = null;
    }
  };

  const isSiteOverlayReady = (siteId: string) => {
    const liveSites = latestSitesRef.current || [];
    const target = liveSites.find((site) => site.id === siteId);
    if (!target) return false;

    const hasPhoto = !!normalizePhotoSrc(target.sitePhoto);
    const hasNotice = !!target.noticeTone && !!target.noticePill && !!target.noticeMessage;
    return hasPhoto && hasNotice;
  };

  const scheduleOpenAfterMapSettles = (siteId: string) => {
    clearPendingOpen();
    setPendingPhotoSiteId(siteId);

    const openWhenReady = () => {
      if (!isSiteOverlayReady(siteId)) {
        pendingOpenTimeoutRef.current = window.setTimeout(openWhenReady, 120);
        return;
      }

      clearPendingOpen();
      setPendingPhotoSiteId((current) => (current === siteId ? null : current));
      setClosingPhotoSiteId(null);
      setExpandedPhotoSiteId(siteId);
    };

    const waitForMoveEnd = () => {
      if (!map.current) {
        openWhenReady();
        return;
      }

      const handler = () => {
        openWhenReady();
      };

      pendingMoveEndHandlerRef.current = handler;
      map.current.on('moveend', handler);
    };

    // Give parent selection handlers one tick to trigger map easing first.
    pendingOpenTimeoutRef.current = window.setTimeout(() => {
      const mapInstance = map.current;
      if (!mapInstance) {
        openWhenReady();
        return;
      }

      if (mapInstance.isMoving()) {
        waitForMoveEnd();
        return;
      }

      let checks = 0;
      const maxChecks = 8;
      const pollForMovement = () => {
        const liveMap = map.current;
        if (!liveMap) {
          openWhenReady();
          return;
        }

        if (liveMap.isMoving()) {
          waitForMoveEnd();
          return;
        }

        if (checks >= maxChecks) {
          openWhenReady();
          return;
        }

        checks += 1;
        pendingOpenTimeoutRef.current = window.setTimeout(pollForMovement, 40);
      };

      pollForMovement();
    }, 0);
  };

  const normalizePhotoSrc = (photoValue: string | null | undefined): string | null => {
    const raw = (photoValue || '').toString().trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    if (
      lower.startsWith('data:image/') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('blob:')
    ) {
      return raw;
    }

    return `data:image/jpeg;base64,${raw}`;
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

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
    latestSitesRef.current = sites || [];
  }, [sites]);

  useEffect(() => {
    if (!expandedPhotoSiteId) return;
    if (!sites?.some((site) => site.id === expandedPhotoSiteId)) {
      setExpandedPhotoSiteId(null);
    }
  }, [sites, expandedPhotoSiteId]);

  useEffect(() => {
    if (!closingPhotoSiteId) return;
    if (!sites?.some((site) => site.id === closingPhotoSiteId)) {
      setClosingPhotoSiteId(null);
    }
  }, [sites, closingPhotoSiteId]);

  useEffect(() => {
    if (!canShowPhotoPreview && expandedPhotoSiteId) {
      setExpandedPhotoSiteId(null);
    }
    if (!canShowPhotoPreview && closingPhotoSiteId) {
      setClosingPhotoSiteId(null);
    }
    if (!canShowPhotoPreview && pendingPhotoSiteId) {
      clearPendingOpen();
      setPendingPhotoSiteId(null);
    }
  }, [canShowPhotoPreview, expandedPhotoSiteId, closingPhotoSiteId, pendingPhotoSiteId]);

  useEffect(() => {
    return () => {
      if (closePhotoTimeoutRef.current !== null) {
        window.clearTimeout(closePhotoTimeoutRef.current);
        closePhotoTimeoutRef.current = null;
      }
      clearPendingOpen();
    };
  }, []);

  useEffect(() => {
    if (mapUnavailable) return;
    if (!mapContainer.current) return;

    const sitesToShow = sites && sites.length > 0 ? sites : [];
    if (sitesToShow.length === 0) {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      previousSitesJson.current = '';
      previousSelectedSiteId.current = null;
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

    const reportMapReady = () => {
      if (hasReportedReady.current) return;
      hasReportedReady.current = true;
      onMapReady?.();
    };

    // Only touch markers if the actual site data changed
    const expandedPhotoChanged = previousExpandedPhotoSiteId.current !== expandedPhotoSiteId;
    const closingPhotoChanged = previousClosingPhotoSiteId.current !== closingPhotoSiteId;

    if (previousSitesJson.current !== sitesJson || expandedPhotoChanged || closingPhotoChanged) {
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

            const normalizedPhotoSrc = normalizePhotoSrc(site.sitePhoto);
            const hasNoticeContent = !!site.noticeTone && !!site.noticePill && !!site.noticeMessage;
            const hasExpandedPhoto = canShowPhotoPreview && expandedPhotoSiteId === site.id && !!normalizedPhotoSrc;
            const hasClosingPhoto = canShowPhotoPreview && closingPhotoSiteId === site.id && !!normalizedPhotoSrc;
            const shouldRenderPhoto = (hasExpandedPhoto || hasClosingPhoto) && hasNoticeContent;
            const photoAnimationClass = hasClosingPhoto ? 'is-closing' : 'is-opening';
            const noticeMarkup = hasNoticeContent
              ? `
                <div class="site-marker__photo-notice ${photoAnimationClass}" data-tone="${escapeHtml(site.noticeTone!)}" role="note" aria-label="Area notice">
                  <div class="site-marker__photo-content">
                    <span class="site-marker__photo-pill">${escapeHtml(site.noticePill!)}</span>
                    <p class="site-marker__photo-note-text">${escapeHtml(site.noticeMessage!)}</p>
                  </div>
                </div>`
              : '';
            const photoMarkup = shouldRenderPhoto
              ? `
                ${noticeMarkup}
                <div class="site-marker__photo-bubble ${photoAnimationClass}">
                  <img class="site-marker__photo-image" src="${escapeHtml(normalizedPhotoSrc!)}" alt="${escapeHtml(site.name)} site photo" />
                </div>`
              : '';

            el.innerHTML = `
              <div class="site-marker ${markerStateClass}">
                ${photoMarkup}
                <div class="site-marker__pulse"></div>
                <div class="site-marker__ring"></div>
                <div class="site-marker__dot"></div>
              </div>`;

            if (site?.id) {
              el.addEventListener('click', (event) => {
                event.stopPropagation();
                if (canShowPhotoPreview) {
                  const isSameSiteToggle = expandedPhotoSiteId === site.id;

                  if (isSameSiteToggle) {
                    clearPendingOpen();
                    setPendingPhotoSiteId(null);
                    setClosingPhotoSiteId(site.id);
                    setExpandedPhotoSiteId(null);
                    if (closePhotoTimeoutRef.current !== null) {
                      window.clearTimeout(closePhotoTimeoutRef.current);
                    }
                    closePhotoTimeoutRef.current = window.setTimeout(() => {
                      setClosingPhotoSiteId((closingCurrent) => (closingCurrent === site.id ? null : closingCurrent));
                      closePhotoTimeoutRef.current = null;
                    }, CLOSE_ANIMATION_MS);
                    onSiteSelect?.(site.id);
                    return;
                  }

                  if (closePhotoTimeoutRef.current !== null) {
                    window.clearTimeout(closePhotoTimeoutRef.current);
                    closePhotoTimeoutRef.current = null;
                  }

                  setClosingPhotoSiteId(null);
                  setExpandedPhotoSiteId(null);
                  onSiteSelect?.(site.id);
                  scheduleOpenAfterMapSettles(site.id);
                  return;
                }
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
      previousExpandedPhotoSiteId.current = expandedPhotoSiteId;
      previousClosingPhotoSiteId.current = closingPhotoSiteId;
    }

    // Report readiness as soon as the base style is ready or the first frame renders.
    // Waiting for `idle` keeps the white placeholder visible for too long on slower networks.
    if (map.current!.isStyleLoaded()) {
      requestAnimationFrame(reportMapReady);
    } else {
      map.current!.once('load', () => {
        requestAnimationFrame(reportMapReady);
      });
      map.current!.once('render', reportMapReady);
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
  }, [sitesJson, expandedPhotoSiteId, closingPhotoSiteId, onSiteSelect, mobileMode, interactive, lngOffset, latOffset, allSitesPadding, mapUnavailable]);


  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        markers.current = [];
        hasReportedReady.current = false;
        previousSitesJson.current = '';
      }
    };
  }, []);

  if (mapUnavailable) {
    return <div style={{ width: '100%', height: '100%', background: '#ffffff' }} />;
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '100%', background: '#ffffff' }} />;
});
