/**
 * Document Model
 * Handles all database operations for documents
 */

import { generateUniqueNumericId } from "../utils/security.js";

export class Document {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new document
   */
  async create({ templateId, signerEmail, signerName, data, token }) {
    // Generate a unique random ID (3-5 digits)
    const id = await generateUniqueNumericId(this.pool, "documents");

    const [result] = await this.pool.query(
      `INSERT INTO documents (id, template_id, signer_email, signer_name, data, token) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        templateId,
        signerEmail,
        signerName || null,
        JSON.stringify(data || {}),
        token,
      ]
    );
    return id;
  }

  /**
   * Find document by token (returns regardless of status)
   */
  async findByToken(token) {
    const [documents] = await this.pool.query(
      `SELECT d.*, t.name as template_name, t.pdf_path, t.placeholders 
       FROM documents d 
       JOIN templates t ON d.template_id = t.id 
       WHERE d.token = ?`,
      [token]
    );
    return documents.length > 0 ? documents[0] : null;
  }

  /**
   * Find document by ID
   * @param {number} id - Document ID
   * @param {string} status - Optional status filter (if not provided, returns any status)
   */
  async findById(id, status = null) {
    let query = `SELECT d.*, t.pdf_path, t.placeholders, t.name as template_name
       FROM documents d 
       JOIN templates t ON d.template_id = t.id 
       WHERE d.id = ?`;
    const params = [id];

    if (status) {
      query += ` AND d.status = ?`;
      params.push(status);
    }

    const [documents] = await this.pool.query(query, params);
    return documents.length > 0 ? documents[0] : null;
  }

  /**
   * Find all documents
   */
  async findAll() {
    const [documents] = await this.pool.query(
      `SELECT d.*, t.name as template_name 
       FROM documents d 
       JOIN templates t ON d.template_id = t.id 
       ORDER BY d.created_at DESC`
    );
    return documents;
  }

  /**
   * Find documents by status
   */
  async findByStatus(status) {
    const [documents] = await this.pool.query(
      `SELECT d.*, t.name as template_name 
       FROM documents d 
       JOIN templates t ON d.template_id = t.id 
       WHERE d.status = ?
       ORDER BY d.created_at DESC`,
      [status]
    );
    return documents;
  }

  /**
   * Update document status to completed
   */
  async markAsCompleted(id, signedPdfPath) {
    await this.pool.query(
      `UPDATE documents 
       SET status = 'completed', 
           signed_pdf_path = ?, 
           completed_at = NOW() 
       WHERE id = ?`,
      [signedPdfPath, id]
    );
    return true;
  }

  /**
   * Update document status to expired
   */
  async markAsExpired(id) {
    await this.pool.query(
      `UPDATE documents SET status = 'expired' WHERE id = ?`,
      [id]
    );
    return true;
  }

  /**
   * Check if token exists and is valid
   */
  async validateToken(token) {
    const [documents] = await this.pool.query(
      "SELECT id, status FROM documents WHERE token = ?",
      [token]
    );
    return documents.length > 0 ? documents[0] : null;
  }
}

export default Document;
