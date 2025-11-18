/**
 * Template Model
 * Handles all database operations for templates
 */

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
    const [result] = await this.pool.query(
      "INSERT INTO templates (name, pdf_path, placeholders) VALUES (?, ?, ?)",
      [name, pdfPath, JSON.stringify(placeholders)]
    );
    return result.insertId;
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

    if (result.affectedRows > 0) {
      // Reset AUTO_INCREMENT to continue from the highest existing ID
      // This ensures IDs increment sequentially even after deletions
      const [maxResult] = await this.pool.query(
        "SELECT COALESCE(MAX(id), 0) as maxId FROM templates"
      );
      const maxId = maxResult[0]?.maxId || 0;

      // Set AUTO_INCREMENT to maxId + 1
      await this.pool.query(`ALTER TABLE templates AUTO_INCREMENT = ?`, [
        maxId + 1,
      ]);
    }

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
