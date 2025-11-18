import express from "express";
import initTemplateRoutes from "./templateRoutes.js";
import initDocumentRoutes from "./documentRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Initialize all routes
 */
export function initRoutes(app, pool) {
  // API routes
  app.use("/api/templates", initTemplateRoutes(pool));
  app.use("/api/documents", initDocumentRoutes(pool));

  // Static file serving is handled in index.js
  // Files are served from backend/uploads/templates/ and backend/uploads/signed/

  return router;
}

export default initRoutes;
