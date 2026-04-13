// Backend utility to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
const axios = require('axios');

function buildBestAvailableAddress(data) {
  if (!data) return null;
  const parts = [];
  if (data.locality) parts.push(data.locality);
  if (data.city && data.city !== data.locality) parts.push(data.city);
  if (data.principalSubdivision) parts.push(data.principalSubdivision);
  
  const address = parts.join(', ').trim();
  return address || null;
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
