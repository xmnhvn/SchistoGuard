// Backend utility to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
const axios = require('axios');

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
      return response.data.display_name;
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = reverseGeocode;
