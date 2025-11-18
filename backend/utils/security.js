import crypto from "crypto";

/**
 * Generate a secure random token
 * @param {number} length - The length of the token to generate (default: 32)
 * @returns {string} A random hexadecimal token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a URL-safe token (base64url encoded)
 * @param {number} length - The length of the token in bytes (default: 32)
 * @returns {string} A URL-safe random token
 */
export function generateUrlSafeToken(length = 32) {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export default {
  generateToken,
  generateUrlSafeToken,
};
