// Backend utility to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
const axios = require('axios');

function clean(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function getAdministrativeList(data) {
  return Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative
    : [];
}

function findAdministrativeByPattern(data, pattern) {
  const administrative = getAdministrativeList(data);
  const match = administrative.find((entry) => {
    const haystack = `${entry?.name || ''} ${entry?.description || ''} ${entry?.adminLevel || ''}`.toLowerCase();
    return pattern.test(haystack);
  });
  return clean(match?.name);
}

function buildBestAvailableAddress(data) {
  if (!data || typeof data !== 'object') return null;

  const locality = clean(data.locality);

  const purokOrSitio = findAdministrativeByPattern(
    data,
    /(purok|sitio|zone|district|quarter|block)/i
  );

  const barangayOrVillage = findAdministrativeByPattern(
    data,
    /(barangay|brgy|village|suburb|neighbourhood|neighborhood|hamlet)/i
  );

  const municipalityOrCity =
    clean(data.city) ||
    findAdministrativeByPattern(data, /(municipality|city|town)/i) ||
    findAdministrativeByPattern(data, /(county|district)/i);

  const provinceOrState =
    clean(data.principalSubdivision) ||
    findAdministrativeByPattern(data, /(province|region|state)/i);

  const country = clean(data.countryName);

  const orderedParts = [
    purokOrSitio,
    locality,
    barangayOrVillage,
    municipalityOrCity,
    provinceOrState,
    country,
  ].filter(Boolean);

  const deduped = Array.from(
    new Map(orderedParts.map((part) => [String(part).toLowerCase(), part])).values()
  );

  return deduped.length > 0 ? deduped.join(', ') : null;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
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
