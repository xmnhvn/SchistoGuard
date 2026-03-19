// Utility function to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SchistoGuard/1.0 (contact@example.com)'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
    return null;
  } catch (e) {
    return null;
  }
}