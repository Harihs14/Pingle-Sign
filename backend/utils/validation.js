/**
 * Validation utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate template name
 */
export function validateTemplateName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Template name is required" };
  }
  if (name.trim().length === 0) {
    return { valid: false, error: "Template name cannot be empty" };
  }
  if (name.length > 255) {
    return {
      valid: false,
      error: "Template name is too long (max 255 characters)",
    };
  }
  return { valid: true };
}

/**
 * Validate file upload
 */
export function validateFile(
  file,
  allowedTypes = ["application/pdf"],
  maxSize = 10485760
) {
  if (!file) {
    return { valid: false, error: "File is required" };
  }
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1048576}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate document creation data
 */
export function validateDocumentData({
  templateId,
  signerEmail,
  signerName,
  data,
}) {
  const errors = [];

  if (!templateId || isNaN(parseInt(templateId))) {
    errors.push("Valid template ID is required");
  }

  if (!signerEmail || !isValidEmail(signerEmail)) {
    errors.push("Valid signer email is required");
  }

  if (signerName && signerName.length > 255) {
    errors.push("Signer name is too long (max 255 characters)");
  }

  if (data && typeof data !== "object") {
    errors.push("Data must be an object");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate token format
 */
export function validateToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token is required" };
  }
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return { valid: false, error: "Invalid token format" };
  }
  return { valid: true };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
}

export default {
  isValidEmail,
  validateTemplateName,
  validateFile,
  validateDocumentData,
  validateToken,
  sanitizeString,
};

