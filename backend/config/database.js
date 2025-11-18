import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "signing_app",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

/**
 * Initialize database and create tables if they don't exist
 */
export async function initDatabase() {
  let connection;
  try {
    // Create connection without database specified
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
    );
    await connection.query(`USE \`${dbConfig.database}\``);

    // Create templates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        pdf_path VARCHAR(500) NOT NULL,
        placeholders JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create documents table (for signing requests)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        signer_email VARCHAR(255) NOT NULL,
        signer_name VARCHAR(255),
        data JSON,
        status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
        token VARCHAR(255) UNIQUE NOT NULL,
        signed_pdf_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_signer_email (signer_email),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_template_id (template_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.end();
    console.log("✅ Database initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    if (connection) {
      connection.end();
    }
    throw error;
  }
}

/**
 * Create database connection pool
 */
export async function createPool() {
  await initDatabase();
  const pool = mysql.createPool(dbConfig);
  console.log("✅ Database pool created successfully");
  return pool;
}

/**
 * Get database configuration
 */
export function getDbConfig() {
  return dbConfig;
}

export default { initDatabase, createPool, getDbConfig };
