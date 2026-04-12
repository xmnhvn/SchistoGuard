// Backend utility to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
const axios = require('axios');

function buildBestAvailableAddress(data) {
  const address = data && data.address;
  if (!address || typeof address !== 'object') return null;

  const pickFirst = (...values) => {
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
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  if (parts.length === 0) return null;

  return [...new Set(parts)].join(', ');
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SchistoGuard/1.0 (contact@example.com)'
      }
    });
    if (response.data && response.data.display_name) {
      return response.data.display_name || buildBestAvailableAddress(response.data);
    }
    return buildBestAvailableAddress(response.data);
  } catch (e) {
    return null;
  }
}

module.exports = reverseGeocode;
