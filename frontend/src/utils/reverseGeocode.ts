// Utility function to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
function buildBestAvailableAddress(data: any): string | null {
  const locality = typeof data?.locality === 'string' && data.locality.trim() ? data.locality.trim() : null;
  const city = typeof data?.city === 'string' && data.city.trim() ? data.city.trim() : null;
  const region = typeof data?.principalSubdivision === 'string' && data.principalSubdivision.trim() ? data.principalSubdivision.trim() : null;
  const province = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative.find((item: any) => item && item.adminLevel === 4 && typeof item.name === 'string' && item.name.trim())?.name?.trim() || null
    : null;
  const country = typeof data?.countryName === 'string' && data.countryName.trim()
    ? data.countryName.trim().replace(/\s*\(the\)\s*$/i, '')
    : null;

  const parts = [locality, city, province, region, country].filter(Boolean) as string[];
  return parts.length > 0 ? Array.from(new Set(parts)).join(', ') : null;
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