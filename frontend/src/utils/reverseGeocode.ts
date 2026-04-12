// Utility function to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
function buildBestAvailableAddress(data: any): string | null {
  const locality = typeof data?.locality === 'string' && data.locality.trim() ? data.locality.trim() : null;
  return locality || null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return buildBestAvailableAddress(data);
  } catch (e) {
    return null;
  }
}