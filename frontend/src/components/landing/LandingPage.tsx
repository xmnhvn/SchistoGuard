import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Shield,
  Users,
  ArrowRight,
  Activity,
  ChevronLeft,
  ChevronDown,
  LocateFixed,
  Download,
  Info,
  Camera,
} from "lucide-react";
import { DashboardMap } from "../DashboardMap";
import type { DashboardMapHandle } from "../DashboardMap";
import {
  CTAButton,
  TrustBadge,
  AlertsQuickviewModal,
  SensorIcon,
} from "./LandingComponents";
import { PWAInstructionsModal } from "../PWAInstructionsModal";

import { apiGet } from "../../utils/api";
import { reverseGeocode } from "../../utils/reverseGeocode";

interface LandingPageProps {
  onViewMap?: () => void;
  onLearnMore?: () => void;
  onEnterApp?: () => void;
}

type SiteOption = {
  siteKey: string;
  siteName: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sitePhoto?: string | null;
};

const ALL_SITES_KEY = 'all';

function normalizeCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveSiteCoordinates(site: SiteOption | null | undefined) {
  if (!site) return null;

  const latitude = normalizeCoordinate(site.latitude);
  const longitude = normalizeCoordinate(site.longitude);

  if (latitude != null && longitude != null) {
    return { lat: latitude, lng: longitude };
  }

  return null;
}



function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const safeStorage = {
  get(key: string): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage write errors (Safari private mode/quota).
    }
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onViewMap,
  onLearnMore,
  onEnterApp,
}) => {
  const isSafariBrowser =
    typeof navigator !== "undefined" &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|Edg|OPR|Firefox|FxiOS/i.test(navigator.userAgent);

  const [screenWidth, setScreenWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [screenHeight, setScreenHeight] = React.useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 1100 : false
  );
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);
  const [isMonitoringHovered, setIsMonitoringHovered] = useState(false);
  const [desktopZoomScale, setDesktopZoomScale] = useState(1);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);
  const [showLiveUpdates, setShowLiveUpdates] = useState(false);
  const [isExitingLiveUpdates, setIsExitingLiveUpdates] = useState(false);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [liveReading, setLiveReading] = useState<any>(null);
  const [availableSites, setAvailableSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [selectedSiteKey, setSelectedSiteKey] = useState<string>(ALL_SITES_KEY);
  const [selectedSiteDBReading, setSelectedSiteDBReading] = useState<any>(null);
  const [allSitesReadings, setAllSitesReadings] = useState<any[]>([]);
  const [activeSiteKey, setActiveSiteKey] = useState<string | null>(null);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [sitePhotoLoaded, setSitePhotoLoaded] = useState(false);
  const [sitePhotoFailed, setSitePhotoFailed] = useState(false);
  const [selectedSiteAddress, setSelectedSiteAddress] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState(true);
  const [dataOk, setDataOk] = useState(true);
  const [deviceConnected, setDeviceConnected] = useState(true);
  const [siteData, setSiteData] = useState<any>(() => {
    try {
      if (typeof window !== "undefined") {
        const cachedName = safeStorage.get('sg_global_latest_siteName');
        return {
          siteName: cachedName || "Matina Site",
          barangay: "Matina Crossing",
          municipality: "Davao City",
          area: "C. Enclabo St",
        };
      }
    } catch { }
    return {
      siteName: "Matina Site",
      barangay: "Matina Crossing",
      municipality: "Davao City",
      area: "C. Enclabo St",
    };
  });

  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  // PWA Detection and Installation tracking
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsPWAInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA was successfully installed');
      setIsPWAInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Also handle dynamic changes (e.g. if the user installs while browsing)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPWAInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  // Fetch site name from global config
  useEffect(() => {
    apiGet("/api/sensors/interval-config")
      .then((data: any) => {
        if (data && data.deviceName && data.deviceName !== "Site Name") {
          setSiteData((prev: any) => ({ ...prev, siteName: data.deviceName }));
        }
      })
      .catch(console.error);
  }, []);
  // Address from reverse geocoding (sync with dashboard)
  const [gpsAddress, setGpsAddress] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = safeStorage.get('sg_global_latest_address');
        if (cached) return cached;
      }
    } catch { }
    return null;
  });
  // Cache last lat/lng to avoid unnecessary API calls
  const lastLatLngRef = useRef<{ lat: number, lng: number } | null>(null);
  // Fallback logic for marker and address (sync with dashboard)
  const [gpsSites, setGpsSites] = useState<Array<{ id: string; name: string; lat: number; lng: number }> | undefined>(undefined);
  const [lastSavedLocation, setLastSavedLocation] = useState<{ lat: number; lng: number; siteName?: string; address?: string | null } | null>(null);

  const metaAddress = [siteData.area, siteData.barangay, siteData.municipality]
    .map((v: any) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(", ");

  const selectedSite = availableSites.find((site) => site.siteKey === selectedSiteKey) || null;
  const isAllSitesSelected = selectedSiteKey === ALL_SITES_KEY;
  const dropdownSites = availableSites.length > 0
    ? [{ siteKey: ALL_SITES_KEY, siteName: 'All sites' }, ...availableSites]
    : [];
  const selectedSiteLabel = isAllSitesSelected
    ? 'All sites'
    : (selectedSite?.siteName || (availableSites.length === 0 ? 'No sites' : 'Select site'));
  const longestSiteLabel = dropdownSites.reduce((longest, site) => (
    site.siteName.length > longest.length ? site.siteName : longest
  ), selectedSiteLabel);
  let measuredSiteControlWidth = 320;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = "500 13px Poppins, sans-serif";
      measuredSiteControlWidth = Math.ceil(context.measureText(longestSiteLabel).width) + 56;
    }
  }
  const isTabletViewport = screenWidth >= 600 && screenWidth < 1100;
  const isNarrowViewport = screenWidth < 1600;
  const siteControlWidthPx = Math.min(
    Math.max(measuredSiteControlWidth, 220),
    isTabletViewport ? 560 : (isNarrowViewport ? 520 : 620)
  );
  const fixedSiteControlWidth = `${siteControlWidthPx}px`;

  const mapSites = (() => {
    const fromRegistry = availableSites
      .reduce<Array<{ id: string; name: string; lat: number; lng: number; isActive: boolean; isSelected: boolean }>>((acc, site) => {
        const coords = resolveSiteCoordinates(site);
        if (!coords) return acc;

        acc.push({
          id: site.siteKey,
          name: site.siteName,
          lat: coords.lat,
          lng: coords.lng,
          isActive: site.siteKey === activeSiteKey && !!liveReading?.deviceConnected,
          isSelected: site.siteKey === selectedSiteKey,
        });
        return acc;
      }, [])
      .sort((a, b) => Number(b.isSelected) - Number(a.isSelected));

    if (fromRegistry.length > 0) return fromRegistry;

    if (gpsSites && gpsSites.length > 0) {
      return gpsSites.map((site) => ({
        ...site,
        isActive: false,
        isSelected: true,
      }));
    }

    return undefined;
  })();

  const hasLiveCoordinates =
    !!latestReading &&
    Number.isFinite(Number(latestReading.latitude)) &&
    Number.isFinite(Number(latestReading.longitude));

  const hasLiveDeviceLocation = deviceConnected && hasLiveCoordinates;

  const liveApiAddress =
    typeof latestReading?.address === "string" && latestReading.address.trim().length > 0
      ? latestReading.address.trim()
      : null;

  const displayAddress =
    hasLiveDeviceLocation
      ? (selectedSiteAddress || gpsAddress || liveApiAddress || metaAddress || "Resolving live device location...")
      : (selectedSiteAddress || "Waiting for live device location");

  // Strictly follow real sensor device location (from GSM/GPS data)
  // Fallback to last known location in localStorage if sensor is not yet available
  useEffect(() => {
    let sites;
    let lastLoc;

    // 1. Prioritize real-time data from latestReading
    if (
      latestReading &&
      typeof latestReading.latitude === 'number' &&
      typeof latestReading.longitude === 'number' &&
      latestReading.latitude !== null &&
      latestReading.longitude !== null
    ) {
      sites = [{
        id: 'device-gps',
        name: siteData.siteName || 'Device Location',
        lat: latestReading.latitude,
        lng: latestReading.longitude,
      }];
      lastLoc = { lat: latestReading.latitude, lng: latestReading.longitude, siteName: siteData.siteName };

      // Persist to localStorage for immediate loading on next visit
      safeStorage.set('lastGpsLocation', JSON.stringify(lastLoc));
      setGpsSites(sites);
      setLastSavedLocation(lastLoc);
    }
    // 2. Fallback to cached location if no live reading yet
    else {
      let cachedSet = false;
      if (typeof window !== "undefined") {
        const last = safeStorage.get('lastGpsLocation');
        if (last) {
          try {
            const parsed = JSON.parse(last);
            if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
              sites = [{
                id: 'device-gps',
                name: parsed.siteName || 'Last Known Location',
                lat: parsed.lat,
                lng: parsed.lng,
              }];
              lastLoc = parsed;
              setGpsSites(sites);
              setLastSavedLocation(lastLoc);
              cachedSet = true;
            }
          } catch { }
        }
      }

      // 3. If no live/cached location, keep map marker empty to avoid fake location pins
      if (!cachedSet) {
        setGpsSites(undefined);
        setLastSavedLocation(null);
      }
    }
  }, [latestReading, siteData.siteName]);

  // Reverse geocode when GPS changes (sync with dashboard logic)
  useEffect(() => {
    if (gpsSites && gpsSites.length > 0) {
      const { lat, lng } = gpsSites[0];
      if (!lastLatLngRef.current || lastLatLngRef.current.lat !== lat || lastLatLngRef.current.lng !== lng) {
        lastLatLngRef.current = { lat, lng };
        setGpsAddress(null); // reset while loading
        reverseGeocode(lat, lng).then(addr => {
          setGpsAddress(addr);
          // Sync with dashboard global cache
          if (addr && addr !== "Unnamed Road" && addr !== "Device Address") {
            safeStorage.set('sg_global_latest_address', addr);
          }
        });
      }
    } else {
      setGpsAddress(null);
      lastLatLngRef.current = null;
    }
  }, [gpsSites]);
  // Smart Discovery: If global cache is empty, hunt for any site-specific address in localStorage
  useEffect(() => {
    if (!gpsAddress && typeof window !== 'undefined') {
      let keys: string[] = [];
      try {
        keys = Object.keys(window.localStorage);
      } catch {
        keys = [];
      }
      const addressKey = keys.find(k => k.startsWith('sg_') && k.endsWith('_address'));
      if (addressKey) {
        const cached = safeStorage.get(addressKey);
        if (cached && cached !== "Device Address") {
          setGpsAddress(cached);
          safeStorage.set('sg_global_latest_address', cached);
        }
      }

      const siteNameKey = keys.find(k => k.startsWith('sg_') && k.endsWith('_siteName'));
      if (siteNameKey && siteData.siteName === "Matina Site") {
        const cachedName = safeStorage.get(siteNameKey);
        if (cachedName && cachedName !== "Site Name") {
          setSiteData((prev: any) => ({ ...prev, siteName: cachedName }));
          safeStorage.set('sg_global_latest_siteName', cachedName);
        }
      }
    }
  }, [gpsAddress, siteData.siteName]);

  const mapRef = useRef<DashboardMapHandle>(null);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const desktopBaselineDprRef = useRef<number | null>(null);
  const hasManualSiteSelectionRef = useRef(false);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!siteDropdownRef.current?.contains(event.target as Node)) {
        setShowSiteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setSitesLoading(true);
        const data = await apiGet('/api/sensors/sites');
        if (!Array.isArray(data)) {
          setAvailableSites([]);
          return;
        }

        const mapped: SiteOption[] = data
          .map((site: any) => ({
            siteKey: (site.site_key || '').toString().trim(),
            siteName: (site.site_name || site.address || site.site_key || 'Unnamed Site').toString().trim(),
            address: (site.address || '').toString().trim() || null,
            latitude: normalizeCoordinate(site.latitude),
            longitude: normalizeCoordinate(site.longitude),
            sitePhoto: site.site_photo || null,
          }))
          .filter((site) => !!site.siteKey)
          .sort((a, b) => a.siteName.localeCompare(b.siteName));

        setAvailableSites(mapped);

        setSelectedSiteKey((prev) => {
          if (prev === ALL_SITES_KEY) return prev;
          if (!hasManualSiteSelectionRef.current && activeSiteKey && mapped.some((site) => site.siteKey === activeSiteKey)) {
            return activeSiteKey;
          }
          if (prev && mapped.some((site) => site.siteKey === prev)) return prev;
          if (activeSiteKey && mapped.some((site) => site.siteKey === activeSiteKey)) return activeSiteKey;
          return ALL_SITES_KEY;
        });
      } catch {
        setAvailableSites([]);
      } finally {
        setSitesLoading(false);
      }
    };

    fetchSites();
    const interval = setInterval(fetchSites, 15000);
    return () => clearInterval(interval);
  }, [activeSiteKey]);

  useEffect(() => {
    let cancelled = false;

    const resolveSelectedSiteAddress = async () => {
      if (!selectedSite) {
        setSelectedSiteAddress(null);
        return;
      }

      const resolvedCoords = resolveSiteCoordinates(selectedSite);
      if (!resolvedCoords) {
        setSelectedSiteAddress(selectedSite.address || null);
        return;
      }

      const cacheKey = `sg_${selectedSite.siteKey}_address`;
      const cached = safeStorage.get(cacheKey);
      if (cached) {
        setSelectedSiteAddress(cached);
        return;
      }

      try {
        const addr = await reverseGeocode(resolvedCoords.lat, resolvedCoords.lng);
        if (cancelled) return;
        setSelectedSiteAddress(addr || selectedSite.address || null);
        if (addr) {
          safeStorage.set(cacheKey, addr);
        }
      } catch {
        if (!cancelled) {
          setSelectedSiteAddress(selectedSite.address || null);
        }
      }
    };

    resolveSelectedSiteAddress();

    return () => {
      cancelled = true;
    };
  }, [selectedSite]);

  useEffect(() => {
    if (!selectedSite?.siteName) return;
    setSiteData((prev: any) => ({ ...prev, siteName: selectedSite.siteName }));
  }, [selectedSite]);

  useEffect(() => {
    setSitePhotoLoaded(false);
    setSitePhotoFailed(false);
  }, [selectedSiteKey, selectedSite?.sitePhoto]);

  React.useEffect(() => {
    const getBrowserZoom = (): number => {
      if (typeof window === "undefined") return 1;
      const vvScale = window.visualViewport?.scale;
      if (typeof vvScale === "number" && vvScale > 0) {
        return vvScale;
      }
      return 1;
    };

    const updateDesktopZoomScale = () => {
      const isDesktopWidth = window.innerWidth >= 1100;
      if (!isDesktopWidth) {
        setDesktopZoomScale(1);
        desktopBaselineDprRef.current = null;
        return;
      }

      const currentDpr = window.devicePixelRatio || 1;
      if (desktopBaselineDprRef.current === null) {
        desktopBaselineDprRef.current = currentDpr;
      }

      const dprRatio = desktopBaselineDprRef.current / currentDpr;
      const zoom = getBrowserZoom();
      const zoomRatio = zoom > 0 ? 1 / zoom : 1;
      const sourceRatio = zoom !== 1 ? zoomRatio : dprRatio;
      const next = Math.min(1.35, Math.max(0.6, sourceRatio));
      setDesktopZoomScale(next);
    };

    const check = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenWidth(width);
      setScreenHeight(height);
      setIsMobileOrTablet(width < 1100);
      updateDesktopZoomScale();
    };
    check();
    window.addEventListener("resize", check);
    window.visualViewport?.addEventListener("resize", check);
    return () => {
      window.removeEventListener("resize", check);
      window.visualViewport?.removeEventListener("resize", check);
    };
  }, []);

  // Lazy-mount map to reduce initial landing page jank
  React.useEffect(() => {
    if (showLiveUpdates) {
      setShouldRenderMap(true);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const run = () => setShouldRenderMap(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(run, 600);
    }

    return () => {
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showLiveUpdates]);

  // Fetch sensor data when live updates is shown
  useEffect(() => {
    const fetchLatest = () => {
      apiGet("/api/sensors/latest")
        .then((data) => {
          console.log('[LandingPage] /api/sensors/latest response:', data);
          setActiveSiteKey(data?.siteKey || null);
          if (data && data.deviceConnected === false) {
            console.log('[LandingPage] Device disconnected, checking for fallback coords:', { hasLat: typeof data.latitude === 'number', hasLng: typeof data.longitude === 'number', lat: data.latitude, lng: data.longitude });
            if (data.siteName && data.siteName !== "Site Name") setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              console.log('[LandingPage] Fallback coords found, setting gpsSites and lastSavedLocation');
              const fallbackLoc = {
                lat: data.latitude,
                lng: data.longitude,
                siteName: data.siteName || 'Last Known Location',
                address: data.address || null,
              };
              setLastSavedLocation(fallbackLoc);
              setGpsSites([
                {
                  id: 'device-gps',
                  name: fallbackLoc.siteName,
                  lat: fallbackLoc.lat,
                  lng: fallbackLoc.lng,
                },
              ]);
              safeStorage.set('lastGpsLocation', JSON.stringify(fallbackLoc));
            } else {
              console.log('[LandingPage] NO fallback coords, clearing map');
            }
            setDeviceConnected(false);
            setLiveReading({ ...data, deviceConnected: false });
            setLatestReading(null);
            setBackendOk(true);
            setDataOk(false);
            return;
          }
          console.log('[LandingPage] Device connected, setting latestReading');
          setLiveReading({ ...data, deviceConnected: true });
          setLatestReading(data);
          setBackendOk(true);
          setDataOk(true);
          setDeviceConnected(true);
          if (data?.siteKey) {
            setSelectedSiteKey((prev) => {
              if (prev === ALL_SITES_KEY) return prev;
              if (hasManualSiteSelectionRef.current) return prev || data.siteKey || '';
              return data.siteKey || prev || '';
            });
          }
          if (data && data.siteName && data.siteName !== "Site Name") {
            setSiteData((prev: any) => ({ ...prev, siteName: data.siteName }));
          }
        })
        .catch(() => {
          setBackendOk(false);
          setDataOk(false);
          setDeviceConnected(false);
        });
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 1000); // Match dashboard interval for real-time sync
    return () => clearInterval(interval);
  }, []);

  // Fetch specific DB history for selected site if it differs from the active live site
  useEffect(() => {
    let cancelled = false;

    if (!selectedSiteKey || selectedSiteKey === ALL_SITES_KEY) {
      setSelectedSiteDBReading(null);
      if (selectedSiteKey === ALL_SITES_KEY) {
        apiGet('/api/sensors/latest-all')
          .then((data) => {
            if (!cancelled) setAllSitesReadings(Array.isArray(data) ? data : []);
          })
          .catch(() => {
            if (!cancelled) setAllSitesReadings([]);
          });
      }
      return () => {
        cancelled = true;
      };
    }

    apiGet(`/api/sensors/history?siteKey=${encodeURIComponent(selectedSiteKey)}&limit=1`)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setSelectedSiteDBReading({
            ...data[0],
            deviceConnected: false, // DB playback is inherently disconnected
          });
        } else {
          setSelectedSiteDBReading(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedSiteDBReading(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSiteKey]);

  const handleLiveUpdatesClick = () => {
    setShowLiveUpdates(true);
    // Trigger resetView to animate to the new offset point
    setTimeout(() => {
      mapRef.current?.resize();
      mapRef.current?.resetView();
    }, 100);
  };

  // Removed manual pixel measurement (positionPin). 
  // DasboardMap handles the map offsets natively.

  const handleBackFromLiveUpdates = () => {
    setIsExitingLiveUpdates(true);

    // Animate map back to its natural centered position (0 offset)
    setTimeout(() => {
      mapRef.current?.resize();
      mapRef.current?.resetView();
    }, 50);

    // Hide component after all animations complete
    setTimeout(() => {
      setShowLiveUpdates(false);
      setIsExitingLiveUpdates(false);
    }, 600); // Slightly more than 0.5s to ensure completion
  };

  const getHeroFontSize = () => {
    if (screenWidth < 480) return '30px'; // Small mobile
    if (screenWidth < 768) return '40px'; // Large mobile
    if (screenWidth < 1024) return '55px'; // Tablet
    if (isSmallDesktop) return '26px';
    return '40px'; // Desktop (refined for better scaling)
  };

  const getHeroParagraphFontSize = () => {
    if (screenWidth < 480) return '14px'; // Small mobile
    if (screenWidth < 768) return '16px'; // Large mobile
    if (screenWidth < 1024) return '18px'; // Tablet
    if (isSmallDesktop) return '11px';
    return '17px'; // Desktop (refined)
  };

  // Sample data
  const sampleAlerts = [
    {
      id: "1",
      title: "Turbidity Needs Attention",
      details: "Turbidity 18.2 NTU — Barangay San Miguel River",
      level: "critical" as const,
      timestamp: "2025-09-15 14:31",
    },
    {
      id: "2",
      title: "Temperature Watch Zone",
      details: "Water temp 32°C — Barangay Riverside",
      level: "warning" as const,
      timestamp: "2025-09-15 13:45",
    },
  ];

  const headlines = [
    "Protect your community from schistosomiasis with real-time water monitoring",
    "Early detection saves lives — Monitor water quality in your barangay",
    "Community safety starts with clean water — Track schistosomiasis risk together",
  ];

  // Upstream implementation uses state for gpsSites, procedural logic removed.

  const isPreviewActive = showLiveUpdates && !isExitingLiveUpdates;
  const isSmallDesktop = !isMobileOrTablet && screenWidth <= 1600 && screenHeight <= 1000;
  const isDesktopViewport = !isMobileOrTablet;
  const desktopPreviewLngOffset = isAllSitesSelected ? -0.0185 : -0.0050;
  const selectedSiteOperational = !!selectedSiteKey && !!activeSiteKey && selectedSiteKey === activeSiteKey && deviceConnected && backendOk && dataOk;
  const mobilePreviewStatusLabel = selectedSiteOperational ? 'System Operational' : 'Device Not Connected';
  const mobileAllSitesLatOffset = isAllSitesSelected
    ? (
      screenWidth < 380
        ? -0.0048
        : screenWidth < 600
          ? -0.0045
          : screenWidth < 800
            ? -0.0056
            : -0.0052
    )
    : null;
  const mobileSingleSiteLatOffset = !isAllSitesSelected && isMobileOrTablet
    ? (
      isPreviewActive
        ? (
          screenWidth < 380
            ? -0.0032
            : screenWidth < 600
              ? -0.003
              : screenWidth < 800
                ? -0.0042
                : (screenWidth <= 900 && screenHeight >= 1100 ? -0.0049 : -0.0038)
        )
        : (
          screenWidth < 380
            ? -0.0028
            : screenWidth < 600
              ? -0.0026
              : screenWidth < 800
                ? -0.0037
                : (screenWidth <= 900 && screenHeight >= 1100 ? -0.0044 : -0.0033)
        )
    )
    : null;
  const landingAllSitesPadding = isMobileOrTablet && isAllSitesSelected
    ? (
      isPreviewActive
        ? (
          screenWidth < 600
            ? { top: 92, right: 28, bottom: 460, left: 28 }
            : screenWidth < 800
              ? { top: 116, right: 36, bottom: 560, left: 36 }
              : { top: 132, right: 40, bottom: 620, left: 40 }
        )
        : (
          screenWidth < 600
            ? { top: 120, right: 28, bottom: 430, left: 28 }
            : screenWidth < 800
              ? { top: 152, right: 36, bottom: 520, left: 36 }
              : { top: 168, right: 40, bottom: 580, left: 40 }
        )
    )
    : undefined;

  const desktopSidePadding = '10%';
  const liveUpdatesContentPadding = isMobileOrTablet
    ? (screenWidth < 400 ? '72px 16px 16px'
      : screenWidth < 600 ? '76px 20px 20px'
      : screenWidth < 800 ? '80px 24px 24px'
      : '88px 28px 28px')
    : (isSmallDesktop ? '88px 36px 92px' : '100px 50px 120px');
  const liveUpdatesBackButtonLeft = isMobileOrTablet
    ? (screenWidth < 400 ? 16 : screenWidth < 600 ? 20 : screenWidth < 800 ? 24 : 28)
    : (isSmallDesktop ? 36 : 50);

  // ─── Risk Calculation Logic (Sync with Dashboard) ───────────────────────
  const calculateRiskForReading = (reading: any): "safe" | "warning" | "critical" | "no-data" => {
    if (!reading) return "no-data";

    const temp = reading.temperature != null ? Number(reading.temperature) : null;
    const turb = reading.turbidity != null ? Number(reading.turbidity) : null;
    const ph = reading.ph != null ? Number(reading.ph) : null;

    if ((temp == null || !Number.isFinite(temp)) && (turb == null || !Number.isFinite(turb)) && (ph == null || !Number.isFinite(ph))) return "no-data";

    const risks: string[] = [];
    if (temp != null && Number.isFinite(temp)) {
      if (temp >= 22 && temp <= 30) risks.push("critical");
      else if ((temp >= 20 && temp < 22) || (temp > 30 && temp <= 35)) risks.push("warning");
    }
    if (turb != null && Number.isFinite(turb)) {
      if (turb < 5) risks.push("critical");
      else if (turb <= 15) risks.push("warning");
    }
    if (ph != null && Number.isFinite(ph)) {
      if (ph >= 6.5 && ph <= 8.0) risks.push("critical");
      else if ((ph >= 6.0 && ph < 6.5) || (ph > 8.0 && ph <= 8.5)) risks.push("warning");
    }

    if (risks.includes("critical")) return "critical";
    if (risks.includes("warning")) return "warning";
    return "safe";
  };

  const getOverallRisk = (): "safe" | "warning" | "critical" | "no-data" => {
    let reading = null;

    if (selectedSiteKey === ALL_SITES_KEY) {
      // For all sites, prefer live reading, fallback to DB
      reading = latestReading || liveReading;
    } else {
      // If we selected a specific site, use its actual data
      if (activeSiteKey === selectedSiteKey && deviceConnected && latestReading) {
        reading = latestReading;
      } else {
        // Fallback to the DB specific to this site
        reading = selectedSiteDBReading || liveReading; // liveReading might match if it's the active offline site
      }
    }

    return calculateRiskForReading(reading);
  };

  // ─── Resident-Friendly Card Content ────────────────────────────────────
  const overallRisk = getOverallRisk();

  const riskContent = {
    safe: {
      statusLabel: "Safe",
      statusColor: "#22c55e",
      statusBg: "rgba(34,197,94,0.08)",
      statusBorder: "rgba(34,197,94,0.18)",
      action: "Safe to use water normally",
      actionSub: "No unusual water conditions detected.",
      reminder: "No elevated risk detected",
      reminderSub: "Continue normal activities near water.",
      guidance: "Water conditions at this site are currently within safe ranges. Normal activities near water areas can continue. The SchistoGuard system is actively monitoring for any changes.",
    },
    warning: {
      statusLabel: "Moderate Risk",
      statusColor: "#E7B213",
      statusBg: "rgba(231,178,19,0.08)",
      statusBorder: "rgba(231,178,19,0.18)",
      action: "Exercise caution near water",
      actionSub: "Limit unnecessary water contact.",
      reminder: "Stay alert \u2014 conditions may change",
      reminderSub: "Monitor updates from SchistoGuard.",
      guidance: "Some water parameters are showing early-warning levels. Residents near this area should be aware and limit unnecessary water contact until conditions improve.",
    },
    critical: {
      statusLabel: "High Risk",
      statusColor: "#ef4444",
      statusBg: "rgba(239,68,68,0.08)",
      statusBorder: "rgba(239,68,68,0.18)",
      action: "Avoid direct contact with water",
      actionSub: "Wear protective footwear near water.",
      reminder: "Schistosomiasis exposure risk is elevated",
      reminderSub: "Take precautions immediately.",
      guidance: "Water conditions at this site are within ranges associated with higher schistosomiasis transmission risk. These conditions create an ideal habitat for Oncomelania snails, the primary hosts of Schistosomiasis. Avoid wading, swimming, or washing in open water bodies. Wear protective footwear if you must cross water areas.",
    },
    "no-data": {
      statusLabel: "No Data",
      statusColor: "#94a3b8",
      statusBg: "rgba(148,163,184,0.08)",
      statusBorder: "rgba(148,163,184,0.18)",
      action: "Waiting for sensor data",
      actionSub: "System is connecting to sensors.",
      reminder: "Checking water conditions",
      reminderSub: "Risk assessment will appear shortly.",
      guidance: "Connecting to SchistoGuard sensors. Risk assessment will appear once data becomes available.",
    },
  };

  const currentRisk = riskContent[overallRisk];
  
  const isLiveData = selectedSiteKey === ALL_SITES_KEY
    ? !!latestReading && deviceConnected
    : activeSiteKey === selectedSiteKey && deviceConnected;

  const dataSourceLabel = isLiveData ? "Live monitoring" : (overallRisk !== "no-data" ? "Last recorded data" : "");

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col overflow-hidden bg-white">
      {/* Solid White Background container */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: '#e8eff1' }}>

        {/* Map loads behind gradient, fades in when ready - Dashboard style */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          {shouldRenderMap && (
            <DashboardMap
              ref={mapRef}
              interactive={showLiveUpdates && screenWidth >= 600}
              mobileMode={isMobileOrTablet}
              sites={mapSites}
              onSiteSelect={(siteId) => {
                if (screenWidth >= 600) {
                  setSelectedSiteKey(siteId);
                }
              }}
              allSitesPadding={landingAllSitesPadding}
              // On desktop preview, shift pin further right (-0.0032) to match Pic 2 framing
              lngOffset={!isMobileOrTablet ? (isPreviewActive ? desktopPreviewLngOffset : -0.0075) : undefined}
              latOffset={
                isMobileOrTablet
                  ? isPreviewActive
                    ? (
                      mobileAllSitesLatOffset ??
                      mobileSingleSiteLatOffset ??
                      (screenWidth < 380
                        ? -0.0014 // Mobile small: move point slightly upward
                        : screenWidth < 600
                          ? -0.0012 // iPhone: restore higher point placement
                          : screenWidth < 800
                            ? -0.0019 // iPad mini: lift marker upward
                            : -0.0016 // iPad Air/Pro: lift marker upward
                      )
                    )
                    : (mobileAllSitesLatOffset ?? mobileSingleSiteLatOffset ?? -0.00125) // Non-preview mobile/tablet baseline
                  : undefined
              }
              onMapReady={() => {
                // Shorter delay - just wait for initial render
                setTimeout(() => setMapLoaded(true), 300);
              }}
            />
          )}
        </div>

        {/* Gradient overlay - hidden when preview is shown */}
        <div
          className="absolute inset-0"
          style={{
            background: isMobileOrTablet
              ? "linear-gradient(to top, #357D86 0%, #357D86 1%, rgba(53,125,134,0.85) 50%, rgba(152,244,255,0) 95%)"
              : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.85) 35%, rgba(53,125,134,0.4) 55%, rgba(152,244,255,0) 85%)",
            zIndex: 1,
            pointerEvents: "none",
            opacity: showLiveUpdates ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>

      <header
        className="relative z-50 border-b border-gray-100"
        style={{
          backgroundColor: '#FFFFFF',
          transform: showLiveUpdates ? 'translateY(-100%)' : 'translateY(0)',
          opacity: showLiveUpdates ? 0 : 1,
          transition: isExitingLiveUpdates
            ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
            : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          pointerEvents: showLiveUpdates ? 'none' : 'auto',
        }}
      >
        <div
          className="w-full"
          style={{
            paddingTop: isSmallDesktop ? 18 : 24,
            paddingBottom: isSmallDesktop ? 18 : 24,
            paddingLeft: desktopSidePadding,
            paddingRight: desktopSidePadding,
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img
                src="/schistoguard.png"
                alt="SchistoGuard Logo"
                style={{ width: isSmallDesktop ? 24 : 28, height: isSmallDesktop ? 24 : 28, objectFit: "contain" }}
              />
              <h1
                style={{
                  fontFamily: "Poppins, sans-serif",
                  color: "#357D86",
                  fontWeight: 600,
                  fontSize: isSmallDesktop ? 16 : 18,
                }}
              >
                SchistoGuard
              </h1>
            </div>

            {/* Full button on tablet/desktop, icon-only on mobile */}
            <div className="flex items-center gap-3">
              {screenWidth >= 640 ? (
                <CTAButton
                  variant="primary"
                  size="sm"
                  onClick={onEnterApp}
                  ariaLabel="Start monitoring"
                  className="flex rounded-full border-2 transition-all duration-300 shadow-lg"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: isSmallDesktop ? '13px' : '14px',
                    padding: isSmallDesktop ? '6px 16px' : undefined,
                    backgroundColor: isMonitoringHovered ? '#FFFFFF' : '#357D86',
                    color: isMonitoringHovered ? '#357D86' : '#FFFFFF',
                    borderColor: '#357D86',
                    boxShadow: isMonitoringHovered ? '0 10px 25px -5px rgba(53, 125, 134, 0.3)' : '0 10px 15px -3px rgba(53, 125, 134, 0.2)',
                    transform: isMonitoringHovered ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                  onMouseEnter={() => setIsMonitoringHovered(true)}
                  onMouseLeave={() => setIsMonitoringHovered(false)}
                >
                  Start monitoring
                </CTAButton>
              ) : (
                <button
                  onClick={onEnterApp}
                  aria-label="Start monitoring"
                  className="flex items-center justify-center rounded-full border-2 transition-all duration-300 shadow-lg"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: '#357D86',
                    borderColor: '#357D86',
                    color: '#FFFFFF'
                  }}
                >
                  <Activity className="w-4 h-4" />
                </button>
              )}

              {/* PWA Install Button - visible only on mobile/tablet AND if not already installed */}
              {isMobileOrTablet && !isPWAInstalled && (
                <button
                  onClick={() => setShowPWAInstructions(true)}
                  aria-label="Install App"
                  className="flex items-center justify-center rounded-full border-2 border-schistoguard-teal bg-white text-schistoguard-teal transition-all duration-300 shadow-lg hover:bg-schistoguard-teal hover:text-white"
                  style={{
                    width: 40,
                    height: 40,
                  }}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center" style={{
        transform: showLiveUpdates ? 'translateX(-100%)' : 'translateX(0)',
        opacity: showLiveUpdates ? 0 : 1,
        transition: isExitingLiveUpdates
          ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
          : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        pointerEvents: showLiveUpdates ? 'none' : 'auto',
      }}>
        <section className="hidden lg:block w-full" style={{ paddingTop: isSmallDesktop ? 24 : 32, paddingBottom: isSmallDesktop ? 24 : 32 }}>
          <div className="w-full" style={{ paddingLeft: desktopSidePadding, paddingRight: desktopSidePadding }}>
            <div className="grid lg:grid-cols-2 items-center" style={{ gap: isSmallDesktop ? 28 : 40 }}>
              <div
                className="max-w-4xl animate-fade-up"
                style={{
                  maxWidth: isSmallDesktop ? 620 : undefined,
                  paddingTop: isSmallDesktop ? 28 : 32,
                  paddingBottom: isSmallDesktop ? 28 : 32,
                  marginTop: isSmallDesktop ? -22 : -16,
                }}
              >
                <div>
                  <h2
                    className="animate-fade-up animate-delay-50"
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                      fontSize: getHeroFontSize(),
                      fontWeight: 800,
                      maxWidth: isSmallDesktop ? 500 : undefined,
                      lineHeight: isSmallDesktop ? '1.1' : '1.2',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Know Your Water.<br />
                    Early detection for a schisto-free community.
                  </h2>

                  <p
                    className="leading-relaxed animate-fade-up animate-delay-100"
                    style={{
                      marginTop: isSmallDesktop ? 12 : 16,
                      marginBottom: isSmallDesktop ? 12 : 16,
                      color: 'rgba(255,255,255,0.95)',
                      textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                      fontSize: getHeroParagraphFontSize(),
                      maxWidth: isSmallDesktop ? 430 : undefined
                    }}
                  >
                    Real-time monitoring of water
                    sites to help prevent schistosomiasis.
                  </p>
                </div>

                <div
                  className="flex flex-wrap animate-fade-up animate-delay-150"
                  style={{
                    gap: '12px',
                    transform: isDesktopViewport ? `scale(${desktopZoomScale})` : undefined,
                    transformOrigin: 'left center',
                    width: isDesktopViewport ? `${100 / desktopZoomScale}%` : undefined
                  }}
                >
                  <TrustBadge
                    icon={
                      <Shield className="w-3.5 h-3.5 text-schistoguard-green" />
                    }
                    label="Real-time monitoring"
                    small
                    compact={false}
                  />
                  <TrustBadge
                    icon={
                      <SensorIcon className="w-3.5 h-3.5 text-schistoguard-teal" />
                    }
                    label="Multiple locations"
                    small
                    compact={false}
                  />
                  <TrustBadge
                    icon={
                      <Users className="w-3.5 h-3.5 text-schistoguard-coral" />
                    }
                    label="Public health focus"
                    small
                    compact={false}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-up animate-delay-200" style={{ marginTop: isSmallDesktop ? 30 : 70 }}>
                  <CTAButton
                    variant="primary"
                    size="md"
                    onClick={handleLiveUpdatesClick}
                    ariaLabel="Live updates"
                    className="group transition-transform duration-500 transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: '#ffffffff',
                      borderRadius: '9999px',
                      padding: isSmallDesktop ? '7px 18px' : '12px 36px',
                      boxShadow: `
                        inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                        inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                        0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                        0 0 15px rgba(53, 125, 134, 0.3), 
                        0 0 30px rgba(53, 125, 134, 0.2)
                      `,
                      fontWeight: 600,
                      fontSize: isSmallDesktop ? '12px' : '15px',
                      fontFamily: 'Poppins, sans-serif',
                      letterSpacing: isSmallDesktop ? '0.03em' : '0.05em',
                      textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'inline-flex'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Live Updates
                      <ArrowRight className={`${isSmallDesktop ? 'w-4 h-4 ml-1.5' : 'w-5 h-5 ml-2'} group-hover:translate-x-1.5 transition-transform`} />
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
                  </CTAButton>
                </div>
              </div>

              {/* Removed HeroIllustration */}
              <div className="relative flex items-center justify-center" style={{ height: isSmallDesktop ? 260 : 384 }}>
                {/* Empty container to maintain layout balance without animations */}
              </div>
            </div>
          </div>
        </section>

        <section
          className="lg:hidden w-full px-4"
          style={{
            position: 'absolute',
            bottom: screenWidth >= 768 ? '120px' : '80px',
            left: 0,
            right: 0,
            zIndex: 20
          }}
        >
          <div className="text-center p-6 flex flex-col items-center">
            <div className="space-y-3 mb-6 animate-fade-up">
              <h2
                className="animate-fade-up animate-delay-50"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  fontSize: getHeroFontSize(),
                  fontWeight: 800,
                  lineHeight: '1.1',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Know Your Water.<br />
                Early detection for a schisto-free community.
              </h2>

              <p
                className="leading-relaxed max-w-2xl mx-auto animate-fade-up animate-delay-100"
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                  lineHeight: '1.2',
                  fontSize: getHeroParagraphFontSize()
                }}
              >
                Free, real-time monitoring of water
                sites to help prevent schistosomiasis.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-10 animate-fade-up animate-delay-150">
              <TrustBadge
                icon={
                  <Shield className="w-3 h-3 text-schistoguard-green" />
                }
                label="Real-time monitoring"
                small
              />
              <TrustBadge
                icon={
                  <SensorIcon className="w-3 h-3 text-schistoguard-teal" />
                }
                label="Multiple locations"
                small
              />
              <TrustBadge
                icon={
                  <Users className="w-3 h-3 text-schistoguard-coral" />
                }
                label="Public health focus"
                small
              />
            </div>
            <div className="flex justify-center w-full mx-auto animate-fade-up animate-delay-200" style={{ marginTop: '80px' }}>
              <CTAButton
                variant="primary"
                size="md"
                onClick={handleLiveUpdatesClick}
                ariaLabel="Live updates"
                className="group transition-transform duration-500 transform active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #87b1b7ff 0%, #4a8b94ff 45%, #145e64ff 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#ffffffff',
                  borderRadius: '9999px',
                  padding: '16px 48px',
                  boxShadow: `
                    inset 0 0 0 1px rgba(255, 255, 255, 0.10),
                    inset 0 1px 2px rgba(255, 255, 255, 0.1), 
                    0 15px 35px -5px rgba(0, 0, 0, 0.3), 
                    0 0 15px rgba(53, 125, 134, 0.3), 
                    0 0 30px rgba(53, 125, 134, 0.2)
                  `,
                  fontWeight: 600,
                  fontSize: '16px',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.05em',
                  textShadow: '0 1px 2px rgba(28, 28, 28, 0.60)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Live Updates
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderRadius: '9999px' }} />
              </CTAButton>
            </div>
          </div>
        </section>
      </main>

      {/* Live Updates Overlay */}
      {(showLiveUpdates || isExitingLiveUpdates) && (
        <div
          className="fixed inset-0 z-40"
          style={{
            animation: isExitingLiveUpdates ? 'fadeOut 0.5s ease-out forwards' : 'fadeIn 0.3s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {/* Dashboard-style gradient overlay - exact match to dashboard */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isMobileOrTablet
                ? "linear-gradient(to bottom, #357D86 0%, rgba(53,125,134,0.85) 5%, rgba(53,125,134,0.3) 35%, rgba(152,244,255,0) 55%)"
                : "linear-gradient(to right, #357D86 0%, rgba(53,125,134,0.9) 5%, rgba(53,125,134,0.4) 30%, rgba(152,244,255,0) 50%)",
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Content overlay on left side */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: isMobileOrTablet ? '100%' : '50%',
              padding: liveUpdatesContentPadding,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              scrollbarWidth: 'none' as const,
              msOverflowStyle: 'none' as const,
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'contain',
              touchAction: isMobileOrTablet ? 'pan-y' : 'auto',
              animation: 'contentSlideIn 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both',
              zIndex: 2,
              pointerEvents: isMobileOrTablet ? 'auto' : 'none',
            }}
          >
            {/* Back button */}
            <button
              onClick={handleBackFromLiveUpdates}
              className="hover:scale-105 active:scale-95 transition-transform duration-200"
              style={{
                position: 'absolute',
                top: isMobileOrTablet
                  ? (screenWidth < 400 ? 18 : screenWidth < 600 ? 20 : screenWidth < 800 ? 22 : 26)
                  : 32,
                left: liveUpdatesBackButtonLeft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                border: 'none',
                color: '#357D86',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'auto', // Back button should be clickable
              }}
              aria-label="Back to Home"
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>

            {/* Header */}
            <div style={{ pointerEvents: 'none', marginTop: 0, maxWidth: screenWidth < 1100 ? '100%' : 580 }}>
              <h1
                style={{
                  margin: 0,
                  color: '#fff',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: isMobileOrTablet ? (screenWidth < 600 ? 26 : 32) : (isSmallDesktop ? 32 : 38),
                  lineHeight: 1.15,
                  textShadow: '0 1px 6px rgba(0,0,0,0.18)',
                  animation: 'slideInFromRight 0.6s 0.2s ease-out both',
                }}
              >
                {selectedSiteLabel || siteData.siteName}
              </h1>
              <p
                style={{
                  margin: '6px 0 0',
                  color: 'rgba(255,255,255,0.92)',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: isMobileOrTablet ? 13 : (isSmallDesktop ? 14 : 16),
                  animation: 'slideInFromRight 0.6s 0.3s ease-out both',
                }}
              >
                {displayAddress}
              </p>

              {/* System Status Capsule (Dashboard style) + Location Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: screenWidth < 600 ? 'row' : 'row',
                justifyContent: 'flex-start',
                width: screenWidth < 600 ? '100%' : (screenWidth < 1100 ? '100%' : (isSmallDesktop ? 520 : 580)),
                maxWidth: screenWidth < 600 ? '100%' : (screenWidth < 1100 ? '100%' : (isSmallDesktop ? 520 : 580)),
                gap: 8,
                marginTop: 12,
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 50,
                animation: 'slideInFromRight 0.6s 0.4s ease-out both',
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.92)',
                  borderRadius: 999,
                  padding: screenWidth < 600 ? '6px 12px' : '6px 14px',
                  minHeight: 34,
                  fontSize: 12,
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                  color: selectedSiteOperational ? '#15803d' : '#6b7280',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(4px)',
                  fontFamily: "'Poppins', sans-serif",
                  width: screenWidth < 600 ? 'calc((100% - 8px) / 2)' : 'auto',
                  minWidth: 0,
                  flex: screenWidth < 600 ? '0 0 calc((100% - 8px) / 2)' : '0 0 auto',
                  boxSizing: 'border-box',
                }}>
                  <span style={{
                    width: 8,
                    minWidth: 8,
                    maxWidth: 8,
                    height: 8,
                    minHeight: 8,
                    maxHeight: 8,
                    borderRadius: '50%',
                    background: selectedSiteOperational ? '#22c55e' : '#9ca3af',
                    display: 'inline-block',
                    flex: '0 0 8px',
                    animation: selectedSiteOperational ? 'dotPulse 3s ease-in-out infinite' : 'none',
                    "--dot-glow": selectedSiteOperational ? 'rgba(34,197,94,0.5)' : 'transparent',
                  } as any} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mobilePreviewStatusLabel}
                  </span>
                </div>
                <div style={{ width: screenWidth < 600 ? 'calc((100% - 8px) / 2)' : 'auto', minWidth: 0, flex: screenWidth < 600 ? '0 0 calc((100% - 8px) / 2)' : '1 1 auto' }}>
                  <div
                    ref={siteDropdownRef}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.92)',
                      borderRadius: 999,
                      padding: screenWidth < 600 ? '6px 12px' : '6px 14px',
                      minHeight: 34,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      backdropFilter: 'blur(4px)',
                      width: screenWidth < 600 ? '100%' : '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                  <button
                    type="button"
                    onClick={() => setShowSiteDropdown((prev) => !prev)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#337C85',
                      padding: 0,
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      minWidth: 0,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                        textAlign: 'left',
                      }}
                      title={selectedSiteLabel}
                    >
                      {selectedSiteLabel}
                    </span>
                    <ChevronDown
                      size={14}
                      color="#337C85"
                      style={{
                        transform: showSiteDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s ease',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {showSiteDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: screenWidth < 600 ? '100%' : '100%',
                        minWidth: screenWidth < 600 ? '100%' : 0,
                        maxWidth: '100%',
                        maxHeight: 220,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        background: '#ffffff',
                        borderRadius: 12,
                        boxShadow: '0 10px 26px rgba(0,0,0,0.18)',
                        border: '1px solid #e2e8f0',
                        padding: 6,
                        zIndex: 120,
                      }}
                    >
                      {availableSites.length === 0 ? (
                        <div
                          style={{
                            padding: '8px 10px',
                            color: '#64748b',
                            fontSize: 13,
                            fontFamily: "'Poppins', sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                        >
                          No sites
                        </div>
                      ) : (
                        dropdownSites.map((site) => {
                          const isSelected = site.siteKey === selectedSiteKey;
                          const hasOperationalSite = deviceConnected && backendOk && dataOk;
                          const isActive = hasOperationalSite && site.siteKey === activeSiteKey;
                          const selectedButInactive = isSelected && site.siteKey !== ALL_SITES_KEY && !isActive;
                          const selectedActive = isSelected && site.siteKey !== ALL_SITES_KEY && isActive;
                          const statusDotColor = isActive ? '#22c55e' : '#9ca3af';
                          const rowBackground = hasOperationalSite
                            ? (isSelected
                              ? (selectedButInactive ? '#94a3b8' : (selectedActive ? '#16a34a' : '#3b82f6'))
                              : 'transparent')
                            : 'transparent';
                          const rowTextColor = hasOperationalSite
                            ? (isSelected ? '#ffffff' : (isActive ? '#15803d' : '#64748b'))
                            : '#64748b';
                          return (
                            <button
                              key={site.siteKey}
                              type="button"
                              onClick={() => {
                                hasManualSiteSelectionRef.current = true;
                                setSelectedSiteKey(site.siteKey);
                                setShowSiteDropdown(false);
                              }}
                              style={{
                                width: '100%',
                                border: 'none',
                                borderRadius: 10,
                                padding: '8px 10px',
                                textAlign: 'left',
                                background: rowBackground,
                                color: rowTextColor,
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: 13,
                                fontWeight: isSelected ? 600 : 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                opacity: hasOperationalSite ? (isActive ? 1 : 0.82) : 1,
                              }}
                              title={selectedButInactive ? 'Selected site is not currently active' : ''}
                            >
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: statusDotColor,
                                  display: 'inline-block',
                                  flexShrink: 0,
                                  animation: isActive ? 'dotPulse 3s ease-in-out infinite' : 'none',
                                  "--dot-glow": isActive ? 'rgba(34,197,94,0.5)' : 'transparent',
                                  boxShadow: hasOperationalSite
                                    ? (isSelected ? '0 0 0 2px rgba(255,255,255,0.7)' : '0 0 0 2px rgba(148,163,184,0.2)')
                                    : '0 0 0 2px rgba(148,163,184,0.2)',
                                } as any}
                              />
                              <span style={{ whiteSpace: screenWidth < 600 ? 'normal' : 'nowrap', overflowWrap: screenWidth < 600 ? 'anywhere' : 'normal', lineHeight: screenWidth < 600 ? 1.25 : undefined, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: screenWidth < 600 ? undefined : 'ellipsis' }} title={site.siteName}>
                                {site.siteName}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  </div>
                </div>
                {screenWidth >= 600 && (
                  <button
                    onClick={() => mapRef.current?.resetView()}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.92)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      backdropFilter: 'blur(4px)',
                    }}
                    title="Reset map position"
                  >
                    <LocateFixed size={15} color="#357D86" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            {/* flex spacer — grows to fill remaining space so cards anchor to bottom */}
            {isMobileOrTablet && <div style={{ flex: 1, minHeight: isMobileOrTablet ? (screenWidth < 600 ? 20 : 40) : 0 }} />}

            <div
              ref={cardsGridRef}
              style={{
                display: 'grid',
                gridTemplateColumns: screenWidth >= 1100 ? 'repeat(6, 1fr)' : '1fr 1fr',
                gap: isSmallDesktop ? 14 : 20,
                pointerEvents: 'auto',
                marginTop: isSmallDesktop ? 14 : 20,
                maxWidth: screenWidth < 1100 ? '100%' : (isSmallDesktop ? 520 : 580), 
              }}
            >
              {/* Conditionally render Aggregate View or Individual Site View */}
              {selectedSiteKey === ALL_SITES_KEY ? (
                (() => {
                  let critical = 0; let warning = 0; let safe = 0; let noData = 0;
                  let trackedActive = 0; let trackedOffline = 0;

                  allSitesReadings.forEach((reading) => {
                    const r = calculateRiskForReading(reading);
                    if (r === "critical") critical++;
                    else if (r === "warning") warning++;
                    else if (r === "safe") safe++;
                    else noData++;

                    if (reading.site_key === activeSiteKey && deviceConnected) trackedActive++;
                    else trackedOffline++;
                  });

                  const totalTracked = critical + warning + safe + noData;
                  let systemRisk: "critical" | "warning" | "safe" | "no-data" = "no-data";
                  if (critical > 0) systemRisk = "critical";
                  else if (warning > 0) systemRisk = "warning";
                  else if (safe > 0) systemRisk = "safe";

                  const sysColor = systemRisk === "critical" ? "#ef4444" : systemRisk === "warning" ? "#E7B213" : systemRisk === "safe" ? "#22c55e" : "#94a3b8";

                  return (
                    <>
                      {/* Card 1: System Overview */}
                      <div style={{
                        gridColumn: screenWidth >= 1100 ? 'span 2' : 'auto',
                        background: '#fff', borderRadius: 20,
                        padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                        boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        fontFamily: "'Poppins', sans-serif", animation: 'cardFadeIn 0.6s 0.3s ease-out both',
                      }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>System Overview</p>
                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 22 : (isSmallDesktop ? 20 : 24), color: '#334155', lineHeight: 1.2 }}>
                          {totalTracked} Sites Tracked
                        </p>
                        <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                          {trackedActive} active • {trackedOffline} offline
                        </p>
                      </div>

                      {/* Card 2: Risk Distribution */}
                      <div style={{
                        gridColumn: screenWidth >= 1100 ? 'span 2' : 'auto',
                        background: '#fff', borderRadius: 20,
                        padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                        boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                        display: 'flex', flexDirection: 'column',
                        fontFamily: "'Poppins', sans-serif", animation: 'cardFadeIn 0.6s 0.4s ease-out both',
                      }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>Risk Snapshot</p>
                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 14 : (isSmallDesktop ? 14 : 16), color: sysColor, lineHeight: 1.25 }}>
                          {critical > 0 ? `${critical} Sites High Risk` : warning > 0 ? `${warning} Sites Moderate Risk` : safe > 0 ? 'All Sites Safe' : 'No Data'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), color: '#8E8B8B', marginTop: 2 }}>
                           {critical > 0 && <span><span style={{color: '#ef4444'}}>●</span> {critical} High</span>}
                           {warning > 0 && <span><span style={{color: '#E7B213'}}>●</span> {warning} Mod</span>}
                           {safe > 0 && <span><span style={{color: '#22c55e'}}>●</span> {safe} Safe</span>}
                        </div>
                      </div>

                      {/* Card 3: Actionable Focus */}
                      <div style={{
                        gridColumn: screenWidth >= 1100 ? 'span 2' : '1 / -1',
                        background: '#fff', borderRadius: 20,
                        padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                        boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                        display: 'flex', flexDirection: 'column',
                        fontFamily: "'Poppins', sans-serif", animation: 'cardFadeIn 0.6s 0.5s ease-out both',
                      }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>Recommended Focus</p>
                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 14 : (isSmallDesktop ? 14 : 16), color: sysColor, lineHeight: 1.25 }}>
                          {critical > 0 ? 'Prioritize critical area alerts' : warning > 0 ? 'Monitor moderate risk sites' : 'Standard monitoring protocol'}
                        </p>
                        <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                          See individual sites on map for details.
                        </p>
                      </div>

                      {/* Card 4: Community Guidance */}
                      <div style={{
                        gridColumn: screenWidth >= 1100 ? 'span 6' : '1 / -1', // take full width
                        background: '#fff', borderRadius: 20,
                        padding: screenWidth < 600 ? '16px' : screenWidth >= 1100 ? (isSmallDesktop ? '16px' : '18px') : '22px',
                        boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                        fontFamily: "'Poppins', sans-serif", animation: 'cardFadeIn 0.6s 0.6s ease-out both',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 9,
                            background: 'linear-gradient(135deg, #357D86, #4EA8B1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Users size={15} color="#fff" />
                          </div>
                          <p style={{ margin: 0, fontSize: screenWidth < 600 ? 13 : (isSmallDesktop ? 13 : 15), fontWeight: 600, color: '#337C85' }}>
                            Regional Advisory
                          </p>
                        </div>
                        <div style={{
                          padding: '10px 12px', borderRadius: 12,
                          background: critical > 0 ? 'rgba(239,68,68,0.08)' : warning > 0 ? 'rgba(231,178,19,0.08)' : 'rgba(34,197,94,0.08)',
                          border: `1px solid ${critical > 0 ? 'rgba(239,68,68,0.18)' : warning > 0 ? 'rgba(231,178,19,0.18)' : 'rgba(34,197,94,0.18)'}`,
                        }}>
                          <p style={{ margin: 0, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 11 : 12.5), color: '#475569', lineHeight: 1.5, fontWeight: 400 }}>
                            {critical > 0 
                              ? "Several areas currently present elevated Schistosomiasis transmission risks. Please use the map to locate specific high-risk zones near your community and exercise appropriate caution." 
                              : "Currently, no tracked sites exhibit critical risk levels. Please continue standard preventative behavior when interacting with local open water ecosystems."}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  {/* Card 1: Site Status */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'span 2' : 'auto',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.3s ease-out both',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: screenWidth < 600 ? 14 : 18,
                  right: screenWidth < 600 ? 14 : 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  {isLiveData && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#fff',
                      background: '#22c55e',
                      borderRadius: 999,
                      padding: '2px 7px',
                      letterSpacing: 0.5,
                      lineHeight: 1,
                      textTransform: 'uppercase',
                      animation: 'dotPulse 3s ease-in-out infinite',
                      "--dot-glow": 'rgba(34,197,94,0.4)',
                    } as any}>Live</span>
                  )}
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: currentRisk.statusColor,
                    display: 'inline-block',
                    animation: overallRisk !== 'no-data' ? 'dotPulse 3s ease-in-out infinite' : 'none',
                    "--dot-glow": hexToRgba(currentRisk.statusColor, 0.5),
                  } as any} />
                </span>
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>Site Status</p>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 22 : (isSmallDesktop ? 20 : 24), color: currentRisk.statusColor, lineHeight: 1.2 }}>
                  {currentRisk.statusLabel}
                </p>
                <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                  {dataSourceLabel || 'Based on water quality readings'}
                </p>
              </div>

              {/* Card 2: Recommended Action */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'span 2' : 'auto',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.4s ease-out both',
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>Recommended Action</p>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 14 : (isSmallDesktop ? 14 : 16), color: currentRisk.statusColor, lineHeight: 1.25 }}>
                  {currentRisk.action}
                </p>
                <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                  {currentRisk.actionSub}
                </p>
              </div>

              {/* Card 3: Schistosomiasis Reminder */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'span 2' : '1 / -1',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '14px' : screenWidth >= 1100 ? (isSmallDesktop ? '14px' : '16px 18px') : '20px 24px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.5s ease-out both',
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 500, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 10.5 : 12), color: '#94a3b8', letterSpacing: 0.3 }}>Schistosomiasis Reminder</p>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: screenWidth < 600 ? 14 : (isSmallDesktop ? 14 : 16), color: currentRisk.statusColor, lineHeight: 1.25 }}>
                  {currentRisk.reminder}
                </p>
                <p style={{ margin: 0, fontSize: screenWidth < 600 ? 9.5 : (isSmallDesktop ? 9.5 : 11), fontWeight: 400, color: '#8E8B8B', lineHeight: 1.3 }}>
                  {currentRisk.reminderSub}
                </p>
              </div>

              {/* Card 4: Community Guidance */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'span 3' : '1 / -1',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '16px' : screenWidth >= 1100 ? (isSmallDesktop ? '16px' : '18px') : '22px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.6s 0.6s ease-out both',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: 'linear-gradient(135deg, #357D86, #4EA8B1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Info size={15} color="#fff" />
                  </div>
                  <p style={{ margin: 0, fontSize: screenWidth < 600 ? 13 : (isSmallDesktop ? 13 : 15), fontWeight: 600, color: '#337C85' }}>
                    Community Guidance
                  </p>
                </div>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: currentRisk.statusBg,
                  border: `1px solid ${currentRisk.statusBorder}`,
                }}>
                  <p style={{ margin: 0, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 11 : 12.5), color: '#475569', lineHeight: 1.5, fontWeight: 400 }}>
                    {currentRisk.guidance}
                  </p>
                </div>
              </div>

              {/* Card 5: Site Photo Placeholder */}
              <div
                style={{
                  gridColumn: screenWidth >= 1100 ? 'span 3' : '1 / -1',
                  background: '#fff',
                  borderRadius: 20,
                  padding: screenWidth < 600 ? '16px' : screenWidth >= 1100 ? (isSmallDesktop ? '16px' : '18px') : '22px',
                  boxShadow: screenWidth < 600 ? '0 4px 18px rgba(0,0,0,0.11)' : '0 2px 12px rgba(0,0,0,0.09)',
                  fontFamily: "'Poppins', sans-serif",
                  animation: 'cardFadeIn 0.35s 0.3s ease-out both',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: screenWidth < 600 ? 100 : (isSmallDesktop ? 100 : 120),
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {selectedSite?.sitePhoto && !sitePhotoFailed ? (
                  <>
                    {!sitePhotoLoaded && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: screenWidth < 600 ? 16 : screenWidth >= 1100 ? (isSmallDesktop ? 16 : 18) : 22,
                          borderRadius: 16,
                          overflow: 'hidden',
                          background: 'linear-gradient(90deg, rgba(226,232,240,0.8) 0%, rgba(241,245,249,1) 50%, rgba(226,232,240,0.8) 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'sitePhotoShimmer 1.2s ease-in-out infinite',
                        }}
                      />
                    )}
                    <img
                      src={selectedSite.sitePhoto}
                      alt="Site"
                      onLoad={() => {
                        setSitePhotoLoaded(true);
                        setSitePhotoFailed(false);
                      }}
                      onError={() => {
                        setSitePhotoLoaded(false);
                        setSitePhotoFailed(true);
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 20,
                        animation: sitePhotoLoaded ? 'fadeIn 0.35s ease-out' : 'none',
                        opacity: sitePhotoLoaded ? 1 : 0,
                      }}
                    />
                  </>
                ) : sitesLoading && !isAllSitesSelected ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 16,
                      background: 'linear-gradient(90deg, rgba(226,232,240,0.8) 0%, rgba(241,245,249,1) 50%, rgba(226,232,240,0.8) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'sitePhotoShimmer 1.2s ease-in-out infinite',
                    }}
                  />
                ) : (
                  <>
                    <Camera size={screenWidth < 600 ? 28 : 32} color="#cbd5e1" strokeWidth={1.5} />
                    <p style={{ margin: 0, fontSize: screenWidth < 600 ? 11 : (isSmallDesktop ? 11 : 13), fontWeight: 500, color: '#94a3b8', textAlign: 'center' }}>
                      Site photo coming soon
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sitePhotoShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes contentSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--dot-glow, rgba(34,197,94,0.4)); }
          60% { transform: scale(1.25); box-shadow: 0 0 0 6px transparent; }
        }
        *::-webkit-scrollbar { display: none; }
      `}</style>


      <AlertsQuickviewModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        alerts={sampleAlerts}
        onAcknowledge={(id) =>
          console.log(`Acknowledge alert ${id}`)
        }
        onViewSite={(id) =>
          console.log(`View site for alert ${id}`)
        }
      />
      {/* PWA Instructions Modal */}
      <PWAInstructionsModal
        isOpen={showPWAInstructions}
        onClose={() => setShowPWAInstructions(false)}
      />
    </div>
  );
};
