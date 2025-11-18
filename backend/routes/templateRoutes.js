import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import appConfig from "../config/app.js";
import TemplateController from "../controllers/templateController.js";
import {
  validateTemplateCreate,
  validateTemplateId,
} from "../middleware/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Configure multer for file uploads
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Use templates directory from config
    const uploadDir = appConfig.templatesDir;
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `template-${uniqueSuffix}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

/**
 * Initialize controller
 */
export function initTemplateRoutes(pool) {
  const templateController = new TemplateController(pool);

  /**
   * @route   GET /api/templates
   * @desc    Get all templates
   * @access  Public
   */
  router.get("/", templateController.getAllTemplates);

  /**
   * @route   GET /api/templates/:id
   * @desc    Get template by ID
   * @access  Public
   */
  router.get("/:id", validateTemplateId, templateController.getTemplateById);

  /**
   * @route   POST /api/templates
   * @desc    Create new template
   * @access  Public
   */
  router.post(
    "/",
    upload.single("pdf"),
    validateTemplateCreate,
    templateController.createTemplate
  );

  /**
   * @route   PUT /api/templates/:id/placeholders
   * @desc    Update template placeholders
   * @access  Public
   */
  router.put(
    "/:id/placeholders",
    validateTemplateId,
    templateController.updatePlaceholders
  );

  /**
   * @route   PUT /api/templates/:id/name
   * @desc    Update template name
   * @access  Public
   */
  router.put("/:id/name", validateTemplateId, templateController.updateName);

  /**
   * @route   DELETE /api/templates/:id
   * @desc    Delete template
   * @access  Public
   */
  router.delete("/:id", validateTemplateId, templateController.deleteTemplate);

  return router;
}

export default initTemplateRoutes;
