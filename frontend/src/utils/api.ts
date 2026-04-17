/**
 * API Configuration for SchistoGuard Frontend
 * Dynamically switches between local and cloud backend
 */

const LOCAL_BACKEND_BASE_URL = 'http://localhost:3001';
const CLOUD_BACKEND_BASE_URL = 'https://schistoguard-production.up.railway.app';

function resolveApiBaseUrl(): string {
  // @ts-ignore - Vite env type handling
  const configured = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    return isLocalHost ? LOCAL_BACKEND_BASE_URL : CLOUD_BACKEND_BASE_URL;
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

function buildApiUrl(endpoint: string, baseUrl = API_BASE_URL): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!baseUrl) {
    return normalizedEndpoint;
  }

  if (normalizedEndpoint.startsWith('/api') && baseUrl.endsWith('/api')) {
    return `${baseUrl}${normalizedEndpoint.slice(4)}`;
  }

  return `${baseUrl}${normalizedEndpoint}`;
}

function addCacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_ts=${Date.now()}`;
}

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

const CSRF_EXEMPT_ENDPOINTS = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/session',
  '/api/auth/csrf-token'
]);

function shouldAttachCsrfToken(endpoint: string, method: string): boolean {
  const normalizedMethod = method.toUpperCase();
  const isStateChanging = normalizedMethod === 'POST' || normalizedMethod === 'PUT' || normalizedMethod === 'PATCH' || normalizedMethod === 'DELETE';
  return isStateChanging && !CSRF_EXEMPT_ENDPOINTS.has(endpoint);
}

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/csrf-token'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      csrfTokenCache = data?.csrfToken || null;
      return csrfTokenCache;
    } catch {
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

async function fetchCsrfTokenForBase(baseUrl: string): Promise<string | null> {
  try {
    const response = await fetch(buildApiUrl('/api/auth/csrf-token', baseUrl), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.csrfToken || null;
  } catch {
    return null;
  }
}

function clearCsrfTokenCache() {
  csrfTokenCache = null;
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location?.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

function isLocalApiBase(baseUrl: string): boolean {
  if (!baseUrl) return true;
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl);
}

function shouldRetrySiteRouteOnLocal(endpoint: string, status: number): boolean {
  if (status !== 404) return false;
  const isSupportedFallbackRoute =
    endpoint.startsWith('/api/sensors/sites') ||
    endpoint.startsWith('/api/sensors/alerts/stats');
  if (!isSupportedFallbackRoute) return false;
  if (!isLocalDevHost()) return false;
  return !isLocalApiBase(API_BASE_URL);
}

function shouldRetryAnyApiOnLocalNetworkError(endpoint: string, error: unknown): boolean {
  if (!isLocalDevHost()) return false;
  if (isLocalApiBase(API_BASE_URL)) return false;
  if (!endpoint.startsWith('/api/')) return false;

  const message = (error as any)?.message?.toString?.() || '';
  return /failed to fetch|networkerror|load failed/i.test(message);
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Makes an API request with proper error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {FetchOptions} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Response data
 */
export async function apiCall(endpoint: string, options: FetchOptions = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const url = method === 'GET' ? addCacheBust(buildApiUrl(endpoint)) : buildApiUrl(endpoint);

  let csrfHeader: Record<string, string> = {};
  if (shouldAttachCsrfToken(endpoint, method)) {
    const token = csrfTokenCache || await fetchCsrfToken();
    if (token) {
      csrfHeader = { 'x-csrf-token': token };
    }
  }
  
  try {
    let response = await fetch(url, {
      credentials: 'include', // Include cookies for session
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeader,
        ...(options.headers || {}),
      },
      ...options,
    });

    // Retry once if CSRF token is stale.
    if (response.status === 403 && shouldAttachCsrfToken(endpoint, method)) {
      clearCsrfTokenCache();
      const refreshedToken = await fetchCsrfToken();

      if (refreshedToken) {
        response = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': refreshedToken,
            ...(options.headers || {}),
          },
          ...options,
        });
      }
    }

    // Localhost dev safety-net:
    // if cloud backend returns 404 for new site routes, retry once against local backend.
    if (!response.ok && shouldRetrySiteRouteOnLocal(endpoint, response.status)) {
      const localUrl = method === 'GET'
        ? addCacheBust(buildApiUrl(endpoint, LOCAL_BACKEND_BASE_URL))
        : buildApiUrl(endpoint, LOCAL_BACKEND_BASE_URL);

      let localCsrfHeader: Record<string, string> = {};
      if (shouldAttachCsrfToken(endpoint, method)) {
        const localToken = await fetchCsrfTokenForBase(LOCAL_BACKEND_BASE_URL);
        if (localToken) {
          localCsrfHeader = { 'x-csrf-token': localToken };
        }
      }

      response = await fetch(localUrl, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...localCsrfHeader,
          ...(options.headers || {}),
        },
        ...options,
      });

      // Retry once against local backend if its CSRF token rotated.
      if (response.status === 403 && shouldAttachCsrfToken(endpoint, method)) {
        const localRefreshedToken = await fetchCsrfTokenForBase(LOCAL_BACKEND_BASE_URL);
        if (localRefreshedToken) {
          response = await fetch(localUrl, {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': localRefreshedToken,
              ...(options.headers || {}),
            },
            ...options,
          });
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}` 
      }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (shouldRetryAnyApiOnLocalNetworkError(endpoint, error)) {
      try {
        const localUrl = method === 'GET'
          ? addCacheBust(buildApiUrl(endpoint, LOCAL_BACKEND_BASE_URL))
          : buildApiUrl(endpoint, LOCAL_BACKEND_BASE_URL);

        let localCsrfHeader: Record<string, string> = {};
        if (shouldAttachCsrfToken(endpoint, method)) {
          const localToken = await fetchCsrfTokenForBase(LOCAL_BACKEND_BASE_URL);
          if (localToken) {
            localCsrfHeader = { 'x-csrf-token': localToken };
          }
        }

        const localResponse = await fetch(localUrl, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...localCsrfHeader,
            ...(options.headers || {}),
          },
          ...options,
        });

        if (!localResponse.ok) {
          const localErr = await localResponse.json().catch(() => ({ message: `HTTP ${localResponse.status}` }));
          throw new Error(localErr.message || `API Error: ${localResponse.status}`);
        }

        return await localResponse.json();
      } catch (localError) {
        console.error(`API Error (${endpoint}) local fallback:`, localError);
        throw localError;
      }
    }

    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * GET request
 */
export async function apiGet(endpoint: string): Promise<any> {
  return apiCall(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost(endpoint: string, data: any): Promise<any> {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request
 */
export async function apiPut(endpoint: string, data: any): Promise<any> {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint: string): Promise<any> {
  return apiCall(endpoint, { method: 'DELETE' });
}

export default API_BASE_URL;
