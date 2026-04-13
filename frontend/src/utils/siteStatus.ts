export type SiteConnectionStatus = 'active' | 'down' | 'unknown';

export type SiteMapItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  siteKey?: string | null;
  status?: SiteConnectionStatus;
  lastSeen?: string | null;
  address?: string | null;
  isDevice?: boolean;
};

const STALE_AFTER_MS = 15000;
const ACTIVE_LOCATION_TOLERANCE_DEG = 0.00035;
const NEAREST_FALLBACK_TOLERANCE_DEG = 0.01;

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isLikelySameLocation(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): boolean {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) <= ACTIVE_LOCATION_TOLERANCE_DEG && Math.abs(a.lng - b.lng) <= ACTIVE_LOCATION_TOLERANCE_DEG;
}

export function resolveSiteConnectionStatus(lastSeen?: string | null): SiteConnectionStatus {
  if (!lastSeen) return 'unknown';

  const timestamp = new Date(lastSeen).getTime();
  if (!Number.isFinite(timestamp)) return 'unknown';

  return Date.now() - timestamp <= STALE_AFTER_MS ? 'active' : 'down';
}

export function normalizeSiteMapItems(
  sites: Array<{
    site_key?: string | null;
    site_name?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    last_seen?: string | null;
    first_seen?: string | null;
  }> | undefined,
  activeSiteKey?: string | null,
  activeSiteName?: string | null,
  activeLatLng?: { lat: number; lng: number } | null
): SiteMapItem[] {
  const source = Array.isArray(sites) ? sites : [];
  const normalizedActiveName = (activeSiteName || '').toString().trim().toLowerCase();

  let hasExplicitActiveMatch = false;

  const normalized = source
    .map((site) => {
      const siteKey = (site.site_key || '').toString().trim();
      const siteName = (site.site_name || site.address || site.site_key || 'Unnamed Site').toString().trim();
      const latitude = typeof site.latitude === 'number' ? site.latitude : null;
      const longitude = typeof site.longitude === 'number' ? site.longitude : null;

      if (!siteKey || latitude === null || longitude === null) return null;

      const normalizedSiteName = siteName.toLowerCase();
      const isNameMatch = !!normalizedActiveName && normalizedSiteName === normalizedActiveName;
      const isLocationMatch = isValidCoordinate(latitude) && isValidCoordinate(longitude)
        ? isLikelySameLocation(activeLatLng, { lat: latitude, lng: longitude })
        : false;

      if (siteKey === activeSiteKey || isNameMatch || isLocationMatch) {
        hasExplicitActiveMatch = true;
      }

      const status = siteKey === activeSiteKey || isNameMatch || isLocationMatch
        ? 'active'
        : resolveSiteConnectionStatus(site.last_seen || site.first_seen || null);

      return {
        id: siteKey,
        name: siteName,
        lat: latitude,
        lng: longitude,
        siteKey,
        status,
        lastSeen: site.last_seen || site.first_seen || null,
        address: site.address || null,
      } as SiteMapItem;
    })
    .filter((site): site is SiteMapItem => site !== null);

  if (!hasExplicitActiveMatch && activeLatLng && normalized.length > 0) {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    normalized.forEach((site, index) => {
      const dLat = site.lat - activeLatLng.lat;
      const dLng = site.lng - activeLatLng.lng;
      const distance = Math.sqrt((dLat * dLat) + (dLng * dLng));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex >= 0 && nearestDistance <= NEAREST_FALLBACK_TOLERANCE_DEG) {
      normalized[nearestIndex] = {
        ...normalized[nearestIndex],
        status: 'active',
      };
    }
  }

  if (
    activeLatLng &&
    Number.isFinite(activeLatLng.lat) &&
    Number.isFinite(activeLatLng.lng)
  ) {
    const activeId = activeSiteKey || 'device-gps';
    const alreadyPresent = normalized.some((site) => site.id === activeId);

    if (!alreadyPresent) {
      normalized.unshift({
        id: activeId,
        name: activeSiteName || 'Current Device',
        lat: activeLatLng.lat,
        lng: activeLatLng.lng,
        siteKey: activeSiteKey || null,
        status: 'active',
        isDevice: true,
      });
    }
  }

  return normalized;
}