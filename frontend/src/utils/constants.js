/**
 * Application Constants
 * Centralized constants for better maintainability
 */

export const API_ENDPOINTS = {
  TEMPLATES: "/api/templates",
  DOCUMENTS: "/api/documents",
  SIGN: (token) => `/api/documents/token/${token}`,
  DOCUMENT_SIGN: (id) => `/api/documents/${id}/sign`,
};

export const DOCUMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  EXPIRED: "expired",
};

export const ROUTES = {
  DASHBOARD: "/dashboard",
  TEMPLATES: "/templates",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  EDITOR: "/editor",
  SIGN: (token) => `/sign/${token}`,
};

export const PLACEHOLDER_TYPES = {
  SIGNATURE: "signature",
  INITIAL: "initial",
  STAMP: "stamp",
  COMPANY: "company",
  FULLNAME: "fullname",
  EMAIL: "email",
  SIGNDATE: "signdate",
  TEXT: "text",
  JOBTITLE: "jobtitle",
  CHECKBOX: "checkbox",
};

export const VALIDATION_RULES = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },
  REQUIRED: {
    message: "This field is required",
  },
  MIN_LENGTH: (min) => ({
    message: `Must be at least ${min} characters`,
    min,
  }),
  MAX_LENGTH: (max) => ({
    message: `Must be no more than ${max} characters`,
    max,
  }),
};

export const DATE_FORMATS = {
  SHORT: "MMM d, yyyy",
  LONG: "MMMM d, yyyy 'at' h:mm a",
  ISO: "yyyy-MM-dd",
};

