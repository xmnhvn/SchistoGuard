interface FormatAddressParams {
  fullAddress?: string | null;
  locality?: string | null;
  barangay?: string | null;
  fallback?: string;
}

/**
 * Utility to format address components into a readable string.
 * Prioritizes fullAddress, then falls back to barangay or locality.
 */
export function formatAddress({
  fullAddress,
  locality,
  barangay,
  fallback = "Address unavailable",
}: FormatAddressParams): string {
  if (fullAddress && fullAddress.trim().length > 0) {
    return fullAddress;
  }

  if (barangay && barangay.trim().length > 0) {
    return barangay;
  }

  if (locality && locality.trim().length > 0) {
    return locality;
  }

  return fallback;
}
