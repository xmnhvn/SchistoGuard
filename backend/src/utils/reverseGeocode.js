// Backend utility to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
const axios = require('axios');

function buildBestAvailableAddress(data) {
  const locality = typeof data?.locality === 'string' && data.locality.trim() ? data.locality.trim() : null;
  return locality || null;
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
