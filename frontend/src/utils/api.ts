/**
 * API Configuration for SchistoGuard Frontend
 * Dynamically switches between local and cloud backend
 */

// @ts-ignore - Vite env type handling
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) {
    return normalizedEndpoint;
  }

  if (normalizedEndpoint.startsWith('/api') && API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}${normalizedEndpoint.slice(4)}`;
  }

  return `${API_BASE_URL}${normalizedEndpoint}`;
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

function clearCsrfTokenCache() {
  csrfTokenCache = null;
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}` 
      }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
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
