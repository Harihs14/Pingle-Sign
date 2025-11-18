/**
 * Template Model
 * Handles all database operations for templates
 */

import { generateUniqueNumericId } from "../utils/security.js";

export class Template {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Get all templates
   */
  async findAll() {
    const [templates] = await this.pool.query(
      "SELECT id, name, created_at, updated_at FROM templates ORDER BY created_at DESC"
    );
    return templates;
  }

  /**
   * Find template by ID
   */
  async findById(id) {
    const [templates] = await this.pool.query(
      "SELECT * FROM templates WHERE id = ?",
      [id]
    );
    return templates.length > 0 ? templates[0] : null;
  }

  /**
   * Create a new template
   */
  async create({ name, pdfPath, placeholders = [] }) {
    // Generate a unique random ID (3-5 digits)
    const id = await generateUniqueNumericId(this.pool, "templates");

    const [result] = await this.pool.query(
      "INSERT INTO templates (id, name, pdf_path, placeholders) VALUES (?, ?, ?, ?)",
      [id, name, pdfPath, JSON.stringify(placeholders)]
    );
    return id;
  }

  /**
   * Update template placeholders
   */
  async updatePlaceholders(id, placeholders) {
    await this.pool.query(
      "UPDATE templates SET placeholders = ? WHERE id = ?",
      [JSON.stringify(placeholders), id]
    );
    return true;
  }

  /**
   * Update template name
   */
  async updateName(id, name) {
    await this.pool.query("UPDATE templates SET name = ? WHERE id = ?", [
      name,
      id,
    ]);
    return true;
  }

  /**
   * Delete template
   */
  async delete(id) {
    const [result] = await this.pool.query(
      "DELETE FROM templates WHERE id = ?",
      [id]
    );

    // No need to reset AUTO_INCREMENT since we're using random IDs
    return result.affectedRows > 0;
  }

  /**
   * Get template with PDF path
   */
  async findByIdWithPath(id) {
    const [templates] = await this.pool.query(
      "SELECT pdf_path FROM templates WHERE id = ?",
      [id]
    );
    return templates.length > 0 ? templates[0] : null;
  }
}

export default Template;
