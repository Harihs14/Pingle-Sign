import express from "express";
import DocumentController from "../controllers/documentController.js";
import {
  validateDocumentCreate,
  validateDocumentId,
  validateTokenParam,
} from "../middleware/validation.js";

const router = express.Router();

/**
 * Initialize controller
 */
export function initDocumentRoutes(pool) {
  const documentController = new DocumentController(pool);

  /**
   * @route   GET /api/documents
   * @desc    Get all documents
   * @access  Public
   */
  router.get("/", documentController.getAllDocuments);

  /**
   * @route   GET /api/documents/token/:token
   * @desc    Get document by token
   * @access  Public
   */
  router.get(
    "/token/:token",
    validateTokenParam,
    documentController.getDocumentByToken
  );

  /**
   * @route   POST /api/documents
   * @desc    Create document signing request
   * @access  Public
   */
  router.post("/", validateDocumentCreate, documentController.createDocument);

  /**
   * @route   POST /api/documents/:id/sign
   * @desc    Submit signed document
   * @access  Public
   */
  router.post("/:id/sign", validateDocumentId, documentController.signDocument);

  /**
   * @route   GET /api/documents/:id/download
   * @desc    Download signed PDF
   * @access  Public
   */
  router.get(
    "/:id/download",
    validateDocumentId,
    documentController.downloadSignedPdf
  );

  return router;
}

export default initDocumentRoutes;
