// Utility function to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
function buildBestAvailableAddress(data: any): string | null {
  const address = data?.address;
  if (!address || typeof address !== 'object') return null;

  const pickFirst = (...values: unknown[]): string | null => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  };

  const locality = pickFirst(
    address.barangay,
    address.village,
    address.suburb,
    address.neighbourhood,
    address.hamlet,
  );

  const municipality = pickFirst(
    address.municipality,
    address.town,
    address.city,
    address.county,
  );

  const region = pickFirst(address.state, address.region);
  const country = pickFirst(address.country);

  const parts = [
    locality,
    municipality,
    region,
    country,
  ]
    .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  if (parts.length === 0) return null;

  return Array.from(new Set(parts)).join(', ');
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return (data?.display_name ?? null) || buildBestAvailableAddress(data);
  } catch (e) {
    return null;
  }
}