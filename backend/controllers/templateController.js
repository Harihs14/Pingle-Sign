import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { Template } from "../models/Template.js";
import { NotFoundError, FileError, DatabaseError } from "../utils/errors.js";
import appConfig from "../config/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template Controller
 * Handles all template-related HTTP requests
 */

export class TemplateController {
  constructor(pool) {
    this.templateModel = new Template(pool);
  }

  /**
   * Get all templates
   */
  getAllTemplates = async (req, res, next) => {
    try {
      const templates = await this.templateModel.findAll();
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(new DatabaseError("Failed to fetch templates"));
    }
  };

  /**
   * Get template by ID
   */
  getTemplateById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const template = await this.templateModel.findById(id);

      if (!template) {
        return next(new NotFoundError("Template"));
      }

      // Read PDF file - handle both old and new path formats
      let normalizedPath = template.pdf_path;
      if (
        normalizedPath.startsWith("uploads/template-") &&
        !normalizedPath.startsWith("uploads/templates/")
      ) {
        normalizedPath = normalizedPath.replace(
          "uploads/",
          "uploads/templates/"
        );
      } else if (
        normalizedPath.startsWith("uploads/") &&
        !normalizedPath.includes("/templates/") &&
        !normalizedPath.includes("/signed/")
      ) {
        const filename = normalizedPath.replace("uploads/", "");
        if (filename.startsWith("template-")) {
          normalizedPath = `uploads/templates/${filename}`;
        }
      }

      const pdfPath = path.join(__dirname, "../", normalizedPath);
      console.log(
        `📄 Reading template PDF from: ${pdfPath} (original: ${template.pdf_path})`
      );

      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(pdfPath);
      } catch (error) {
        console.error(`❌ Error reading template PDF: ${error.message}`);
        return next(new FileError(`PDF file not found at ${normalizedPath}`));
      }

      // Parse placeholders
      let placeholders = [];
      if (template.placeholders) {
        try {
          placeholders =
            typeof template.placeholders === "string"
              ? JSON.parse(template.placeholders)
              : template.placeholders;
        } catch (e) {
          console.warn("Failed to parse placeholders:", e);
          placeholders = [];
        }
      }

      res.json({
        success: true,
        data: {
          ...template,
          pdfData: pdfBuffer.toString("base64"),
          placeholders: placeholders,
        },
      });
    } catch (error) {
      next(new DatabaseError("Failed to fetch template"));
    }
  };

  /**
   * Create new template
   */
  createTemplate = async (req, res, next) => {
    try {
      const { name } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "PDF file is required",
        });
      }

      const pdfPath = `uploads/templates/${file.filename}`;
      const templateId = await this.templateModel.create({
        name,
        pdfPath,
        placeholders: [],
      });

      res.status(201).json({
        success: true,
        data: {
          id: templateId,
          name,
          pdfPath,
        },
        message: "Template created successfully",
      });
    } catch (error) {
      next(new DatabaseError("Failed to create template"));
    }
  };

  /**
   * Update template placeholders
   */
  updatePlaceholders = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { placeholders } = req.body;

      if (!Array.isArray(placeholders)) {
        return res.status(400).json({
          success: false,
          error: "Placeholders must be an array",
        });
      }

      // Verify template exists
      const template = await this.templateModel.findById(id);
      if (!template) {
        return next(new NotFoundError("Template"));
      }

      await this.templateModel.updatePlaceholders(id, placeholders);

      res.json({
        success: true,
        message: "Template updated successfully",
      });
    } catch (error) {
      next(new DatabaseError("Failed to update template"));
    }
  };

  /**
   * Update template name
   */
  updateName = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Template name is required",
        });
      }

      // Verify template exists
      const template = await this.templateModel.findById(id);
      if (!template) {
        return next(new NotFoundError("Template"));
      }

      await this.templateModel.updateName(id, name.trim());

      res.json({
        success: true,
        message: "Template name updated successfully",
      });
    } catch (error) {
      next(new DatabaseError("Failed to update template name"));
    }
  };

  /**
   * Delete template
   */
  deleteTemplate = async (req, res, next) => {
    try {
      const { id } = req.params;

      // Get template to delete PDF file
      const template = await this.templateModel.findByIdWithPath(id);
      if (!template) {
        return next(new NotFoundError("Template"));
      }

      // Delete PDF file - handle both old and new path formats
      let normalizedPath = template.pdf_path;
      if (
        normalizedPath.startsWith("uploads/template-") &&
        !normalizedPath.startsWith("uploads/templates/")
      ) {
        normalizedPath = normalizedPath.replace(
          "uploads/",
          "uploads/templates/"
        );
      } else if (
        normalizedPath.startsWith("uploads/") &&
        !normalizedPath.includes("/templates/") &&
        !normalizedPath.includes("/signed/")
      ) {
        const filename = normalizedPath.replace("uploads/", "");
        if (filename.startsWith("template-")) {
          normalizedPath = `uploads/templates/${filename}`;
        }
      }

      const pdfPath = path.join(__dirname, "../", normalizedPath);
      try {
        await fs.unlink(pdfPath);
      } catch (error) {
        console.warn("Could not delete PDF file:", error);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      const deleted = await this.templateModel.delete(id);
      if (!deleted) {
        return next(new NotFoundError("Template"));
      }

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      next(new DatabaseError("Failed to delete template"));
    }
  };
}

export default TemplateController;
