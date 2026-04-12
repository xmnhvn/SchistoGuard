// Backend utility to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
const axios = require('axios');

function buildBestAvailableAddress(data) {
  const locality = typeof data?.locality === 'string' && data.locality.trim() ? data.locality.trim() : null;
  const city = typeof data?.city === 'string' && data.city.trim() ? data.city.trim() : null;
  const region = typeof data?.principalSubdivision === 'string' && data.principalSubdivision.trim() ? data.principalSubdivision.trim() : null;
  const province = Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative.find((item) => item && item.adminLevel === 4 && typeof item.name === 'string' && item.name.trim())?.name?.trim() || null
    : null;
  const country = typeof data?.countryName === 'string' && data.countryName.trim()
    ? data.countryName.trim().replace(/\s*\(the\)\s*$/i, '')
    : null;

  const parts = [locality, city, province, region, country].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(', ') : null;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
      }
    });
    return buildBestAvailableAddress(response.data);
  } catch (e) {
    return null;
  }
}

module.exports = reverseGeocode;
