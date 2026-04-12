import { apiGet } from './api';

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const data = await apiGet(`/api/sensors/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    const resolved = typeof data?.address === 'string' && data.address.trim() ? data.address.trim() : null;
    return resolved;
  } catch (e) {
    return null;
  }
}