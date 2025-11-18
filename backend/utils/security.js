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

/**
 * Generate a random numeric ID between 3-5 digits (100-99999)
 * @param {Object} pool - Database connection pool (optional, for uniqueness check)
 * @param {string} tableName - Table name to check uniqueness (optional, must be 'templates' or 'documents')
 * @param {number} maxAttempts - Maximum attempts to find unique ID (default: 100)
 * @returns {Promise<number>} A random unique numeric ID
 */
export async function generateUniqueNumericId(
  pool = null,
  tableName = null,
  maxAttempts = 100
) {
  // Generate random number between 100 (3 digits) and 99999 (5 digits)
  const min = 100;
  const max = 99999;

  // Whitelist allowed table names to prevent SQL injection
  const allowedTables = ["templates", "documents"];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random number in the range
    const randomId = Math.floor(Math.random() * (max - min + 1)) + min;

    // If no pool/table provided, just return the random ID
    if (!pool || !tableName) {
      return randomId;
    }

    // Validate table name
    if (!allowedTables.includes(tableName)) {
      console.warn(
        `Warning: Invalid table name ${tableName}, returning random ID without uniqueness check`
      );
      return randomId;
    }

    // Check if ID already exists
    // Using whitelisted table name (safe since we validated it above)
    try {
      const query =
        tableName === "templates"
          ? "SELECT id FROM templates WHERE id = ?"
          : "SELECT id FROM documents WHERE id = ?";

      const [rows] = await pool.query(query, [randomId]);

      // If ID doesn't exist, it's unique
      if (rows.length === 0) {
        return randomId;
      }
    } catch (error) {
      // If there's an error (e.g., table doesn't exist), just return the ID
      console.warn(
        `Warning: Could not check uniqueness for ${tableName}:`,
        error.message
      );
      return randomId;
    }
  }

  // If we couldn't find a unique ID after max attempts, throw error
  throw new Error(
    `Could not generate unique ID for ${tableName} after ${maxAttempts} attempts`
  );
}

export default {
  generateToken,
  generateUrlSafeToken,
  generateUniqueNumericId,
};
