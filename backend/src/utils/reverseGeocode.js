// Backend utility to reverse geocode lat/lng to address using BigDataCloud reverse geocoding
const axios = require('axios');

function clean(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\s*\((?:the)\)\s*$/i, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  const cleaned = clean(value);
  return cleaned ? cleaned.toLowerCase() : null;
}

function isInvalidLocalToken(value) {
  const cleaned = clean(value);
  if (!cleaned) return true;

  const lower = cleaned.toLowerCase();
  if (lower.includes('/')) return true;

  if (/^(asia|africa|europe|north america|south america|oceania|antarctica)$/i.test(cleaned)) {
    return true;
  }

  if (/^(gmt|utc)\b/i.test(cleaned)) return true;

  return false;
}

function getAdministrativeList(data) {
  return Array.isArray(data?.localityInfo?.administrative)
    ? data.localityInfo.administrative
    : [];
}

function getInformativeList(data) {
  return Array.isArray(data?.localityInfo?.informative)
    ? data.localityInfo.informative
    : [];
}

function getBoundaryList(data) {
  return [...getAdministrativeList(data), ...getInformativeList(data)];
}

function findAdministrativeByPattern(data, pattern) {
  const boundaries = getBoundaryList(data);
  const match = boundaries.find((entry) => {
    const name = clean(entry?.name);
    if (!name || isInvalidLocalToken(name)) return false;

    const haystack = `${name} ${entry?.description || ''} ${entry?.adminLevel || ''}`.toLowerCase();
    return pattern.test(haystack);
  });
  return clean(match?.name);
}

function findGranularLocalArea(data, blockedKeys = new Set()) {
  const boundaries = getBoundaryList(data)
    .filter((entry) => clean(entry?.name))
    .map((entry) => ({
      name: clean(entry?.name),
      description: clean(entry?.description),
      adminLevel: Number.isFinite(Number(entry?.adminLevel)) ? Number(entry.adminLevel) : null,
    }))
    .filter((entry) => entry.name && !isInvalidLocalToken(entry.name));

  if (boundaries.length === 0) return null;

  const excludedPattern = /(philippines|region|province|state|city|municipality|country)/i;
  const localCandidates = boundaries
    .filter((entry) => !excludedPattern.test(`${entry.name} ${entry.description || ''}`))
    .filter((entry) => {
      const key = normalizeKey(entry.name);
      return key ? !blockedKeys.has(key) : false;
    })
    .sort((a, b) => {
      const aLevel = a.adminLevel ?? -1;
      const bLevel = b.adminLevel ?? -1;
      return bLevel - aLevel;
    });

  return localCandidates.length > 0 ? clean(localCandidates[0].name) : null;
}

function buildBestAvailableAddress(data) {
  if (!data || typeof data !== 'object') return null;

  const locality = clean(data.locality);
  const city = clean(data.city);
  const province = clean(data.principalSubdivision);
  const country = clean(data.countryName);

  const municipalityOrCity =
    city ||
    locality ||
    findAdministrativeByPattern(data, /(municipality|city|town)/i) ||
    findAdministrativeByPattern(data, /(county|district)/i);

  const blockedKeys = new Set(
    [municipalityOrCity, locality, province, country]
      .map((value) => normalizeKey(value))
      .filter(Boolean)
  );

  const purokOrSitio = findAdministrativeByPattern(
    data,
    /(purok|sitio|zone|block)/i
  );

  const barangayOrVillage = findAdministrativeByPattern(
    data,
    /(barangay|brgy|village|suburb|neighbourhood|neighborhood|hamlet)/i
  ) || findGranularLocalArea(data, blockedKeys);

  const provinceOrState =
    province ||
    findAdministrativeByPattern(data, /(province|region|state)/i);

  const orderedParts = [
    purokOrSitio,
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
