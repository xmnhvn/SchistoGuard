/**
 * API Configuration for SchistoGuard Frontend
 * Dynamically switches between local and cloud backend
 */

// @ts-ignore - Vite env type handling
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

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
