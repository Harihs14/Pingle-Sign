/**
 * API Service Layer
 * Centralized API calls for better code organization and maintainability
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "auth_token";

// Get auth token from storage
const getAuthToken = () => {
  try {
    const item = localStorage.getItem(TOKEN_KEY);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

// Simple in-memory cache for API responses
const cache = new Map();
const CACHE_DURATION = 5000; // 5 seconds cache

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Request deduplication - prevent multiple identical requests
const pendingRequests = new Map();

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${options.method || "GET"}:${url}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Get auth token if available
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: "include", // Include cookies for auth
  };

  // Create promise for this request
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        // For 410 (Gone) status, include the full result for status checking
        // This is an expected response for already-signed documents, not a real error
        const errorData = response.status === 410 ? result : null;
        const error = new ApiError(
          result.error || result.message || "An error occurred",
          response.status,
          errorData || result
        );
        // Mark 410 errors as expected/handled to prevent unnecessary console noise
        if (response.status === 410) {
          error.isExpected = true;
        }
        throw error;
      }

      // Extract data from response if it exists, otherwise return the whole response
      const data = result.data !== undefined ? result.data : result;

      // Cache successful GET requests
      if (!options.method || options.method === "GET") {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || "Network error", 0, null);
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

// Clear cache function
export function clearCache() {
  cache.clear();
  pendingRequests.clear();
}

// Templates API
export const templatesApi = {
  getAll: () => request("/api/templates"),
  getById: (id) => request(`/api/templates/${id}`),
  create: (formData) => {
    return fetch(`${API_BASE_URL}/api/templates`, {
      method: "POST",
      body: formData,
    }).then(async (res) => {
      const result = await res.json();
      if (!res.ok) {
        throw new ApiError(
          result.error || "Failed to create template",
          res.status,
          result
        );
      }
      // Clear cache after creating
      clearCache();
      // Extract data from response if it exists
      return result.data !== undefined ? result.data : result;
    });
  },
  updatePlaceholders: (id, placeholders) => {
    clearCache();
    return request(`/api/templates/${id}/placeholders`, {
      method: "PUT",
      body: JSON.stringify({ placeholders }),
    });
  },
  updateName: (id, name) => {
    clearCache();
    return request(`/api/templates/${id}/name`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },
  delete: (id) => {
    clearCache();
    return request(`/api/templates/${id}`, {
      method: "DELETE",
    });
  },
};

// Documents API
export const documentsApi = {
  getAll: () => request("/api/documents"),
  getByToken: (token) => request(`/api/documents/token/${token}`),
  create: (data) => {
    clearCache();
    return request("/api/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  sign: (id, signatureData) => {
    clearCache();
    return request(`/api/documents/${id}/sign`, {
      method: "POST",
      body: JSON.stringify(signatureData),
    });
  },
};

// Analytics API - optimized to reuse data
let cachedStats = null;
let cachedStatsTimestamp = 0;
const STATS_CACHE_DURATION = 10000; // 10 seconds for stats

export const analyticsApi = {
  getStats: async () => {
    // Use cached stats if available and fresh
    if (
      cachedStats &&
      Date.now() - cachedStatsTimestamp < STATS_CACHE_DURATION
    ) {
      return cachedStats;
    }

    // Fetch both in parallel
    const [documents, templates] = await Promise.all([
      documentsApi.getAll(),
      templatesApi.getAll(),
    ]);

    // Ensure we have arrays
    const docsArray = Array.isArray(documents) ? documents : [];
    const templatesArray = Array.isArray(templates) ? templates : [];

    const stats = {
      totalTemplates: templatesArray.length,
      totalDocuments: docsArray.length,
      pending: docsArray.filter((d) => d.status === "pending").length,
      completed: docsArray.filter((d) => d.status === "completed").length,
      expired: docsArray.filter((d) => d.status === "expired").length,
      sent: docsArray.length,
    };

    // Cache stats
    cachedStats = stats;
    cachedStatsTimestamp = Date.now();

    return stats;
  },
  getDocumentsByStatus: async (status) => {
    const documents = await documentsApi.getAll();
    const docsArray = Array.isArray(documents) ? documents : [];
    return docsArray.filter((d) => !status || d.status === status);
  },
  getRecentDocuments: async (limit = 10) => {
    const documents = await documentsApi.getAll();
    const docsArray = Array.isArray(documents) ? documents : [];
    return docsArray
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },
  getDocumentsByTemplate: async (templateId) => {
    const documents = await documentsApi.getAll();
    const docsArray = Array.isArray(documents) ? documents : [];
    return docsArray.filter((d) => d.template_id === templateId);
  },
  // Clear analytics cache
  clearCache: () => {
    cachedStats = null;
    cachedStatsTimestamp = 0;
    clearCache();
  },
};

export default {
  templates: templatesApi,
  documents: documentsApi,
  analytics: analyticsApi,
  clearCache,
};
