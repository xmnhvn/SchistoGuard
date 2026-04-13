// Backend utility to reverse geocode lat/lng to address using OpenStreetMap Nominatim API
const axios = require('axios');

async function reverseGeocode(lat, lng) {
  try {
    console.log(`[reverseGeocode] Attempting for lat=${lat}, lng=${lng}`);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SchistoGuard/1.0 (contact@example.com)'
      },
      timeout: 5000  // 5 second timeout
    });
    if (response.data && response.data.display_name) {
      console.log(`[reverseGeocode] SUCCESS: ${response.data.display_name}`);
      return response.data.display_name;
    }
    console.warn(`[reverseGeocode] No display_name in response:`, response.data);
    return null;
  } catch (e) {
    console.error(`[reverseGeocode] FAILED for lat=${lat}, lng=${lng}:`, e.message);
    return null;
  }
}

module.exports = reverseGeocode;
