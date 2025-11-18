/**
 * Security Utilities
 * Helper functions for secure operations
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate token format (hex string)
 * @param {string} token - Token to validate
 * @returns {boolean} - True if valid token format
 */
export function isValidToken(token) {
  if (typeof token !== "string") return false;
  const hexRegex = /^[a-f0-9]{64}$/i; // 32 bytes = 64 hex characters
  return hexRegex.test(token);
}

/**
 * Secure storage wrapper (can be extended to use encrypted storage)
 */
export const secureStorage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error storing data:", error);
    }
  },

  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error retrieving data:", error);
      return null;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing data:", error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  },
};

/**
 * Rate limiting helper (client-side)
 * Note: Real rate limiting should be implemented on the server
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    // Remove requests outside the time window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  reset() {
    this.requests = [];
  }
}

