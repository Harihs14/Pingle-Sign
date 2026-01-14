import {
  validateDocumentData,
  validateTemplateName,
  validateFile,
} from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

/**
 * Validate template creation request
 */
export function validateTemplateCreate(req, res, next) {
  const { name } = req.body;
  const validation = validateTemplateName(name);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "PDF file is required",
    });
  }

  const fileValidation = validateFile(req.file);
  if (!fileValidation.valid) {
    return res.status(400).json({
      success: false,
      error: fileValidation.error,
    });
  }

  next();
}

/**
 * Validate document creation request
 */
export function validateDocumentCreate(req, res, next) {
  const validation = validateDocumentData(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      errors: validation.errors,
    });
  }

  next();
}

/**
 * Validate template ID parameter
 */
export function validateTemplateId(req, res, next) {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: "Invalid template ID",
    });
  }
  req.params.id = parseInt(id);
  next();
}

/**
 * Validate document ID parameter
 */
export function validateDocumentId(req, res, next) {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: "Invalid document ID",
    });
  }
  req.params.id = parseInt(id);
  next();
}

/**
 * Validate token parameter
 */
export function validateTokenParam(req, res, next) {
  const { token } = req.params;
  if (!token || typeof token !== "string" || token.length !== 64) {
    return res.status(400).json({
      success: false,
      error: "Invalid token format",
    });
  }
  next();
}

export default {
  validateTemplateCreate,
  validateDocumentCreate,
  validateTemplateId,
  validateDocumentId,
  validateTokenParam,
};










