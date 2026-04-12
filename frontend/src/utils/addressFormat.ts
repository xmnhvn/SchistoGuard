type AddressParts = {
  fullAddress?: string | null;
  locality?: string | null;
  area?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  fallback?: string;
};

function clean(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value
    .replace(/\r?\n+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitAddress(value?: string | null): string[] {
  const cleaned = clean(value);
  if (!cleaned) return [];
  return cleaned
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatAddress(parts: AddressParts): string {
  const fullAddress = clean(parts.fullAddress);
  const ordered = [
    ...splitAddress(fullAddress),
    clean(parts.locality),
    clean(parts.area),
    clean(parts.barangay),
    clean(parts.municipality),
    clean(parts.province),
  ].filter(Boolean) as string[];

  const compact = Array.from(
    new Map(ordered.map((part) => [part.toLowerCase(), part])).values()
  ).join(', ');
  if (compact) return compact;

  return parts.fallback || 'Address unavailable';
}
