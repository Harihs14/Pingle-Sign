import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createPool } from "./config/database.js";
import { initEmailTransporter } from "./config/email.js";
import appConfig from "./config/app.js";
import { initRoutes } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import {
  securityHeaders,
  apiLimiter,
  documentCreationLimiter,
  requestLogger,
  configureCors,
} from "./middleware/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let pool = null;

/**
 * Initialize application
 */
async function initializeApp() {
  try {
    // Initialize database
    pool = await createPool();

    // Initialize email transporter
    initEmailTransporter();

    // Middleware
    app.use(securityHeaders);
    app.use(cors(configureCors(appConfig.corsOrigin)));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(requestLogger);

    // Rate limiting
    app.use("/api/", apiLimiter);
    app.use("/api/documents", documentCreationLimiter);

    // Serve static files from backend/uploads/
    // Templates: /uploads/templates/*
    // Signed PDFs: /uploads/signed/*
    // __dirname is backend/, so uploads is at backend/uploads
    const uploadsBasePath = path.join(__dirname, "uploads");

    // Serve templates
    app.use(
      "/uploads/templates",
      express.static(path.join(uploadsBasePath, "templates"), {
        setHeaders: (res, filePath) => {
          res.setHeader("Content-Type", "application/pdf");
        },
      })
    );

    // Serve signed PDFs
    const signedPath = path.join(uploadsBasePath, "signed");
    console.log(`📁 Serving signed PDFs from: ${signedPath}`);
    // Verify directory exists
    try {
      await fs.access(signedPath);
      console.log(`✅ Signed PDFs directory exists: ${signedPath}`);
    } catch (error) {
      console.warn(
        `⚠️ Signed PDFs directory does not exist, will be created: ${signedPath}`
      );
      await fs.mkdir(signedPath, { recursive: true });
    }

    // Serve signed PDFs with static middleware
    app.use(
      "/uploads/signed",
      express.static(signedPath, {
        setHeaders: (res, filePath) => {
          res.setHeader("Content-Type", "application/pdf");
        },
        index: false, // Don't serve directory listings
      })
    );

    // Fallback route handler for signed PDFs (in case static middleware doesn't match)
    app.get("/uploads/signed/:filename", async (req, res, next) => {
      const filename = req.params.filename;
      // signedPath is already the correct absolute path (backend/uploads/signed)
      const filePath = path.join(signedPath, filename);
      console.log(`🔍 Looking for signed PDF at: ${filePath}`);
      console.log(`🔍 signedPath is: ${signedPath}`);

      try {
        // Check if file exists
        await fs.access(filePath);
        console.log(`✅ Serving signed PDF: ${filePath}`);
        // Send the file with absolute path
        res.sendFile(
          path.resolve(filePath),
          {
            headers: {
              "Content-Type": "application/pdf",
            },
          },
          (err) => {
            if (err) {
              console.error(`❌ Error sending file ${filePath}:`, err);
              if (!res.headersSent) {
                res.status(500).json({
                  success: false,
                  error: "Error serving file",
                });
              }
            }
          }
        );
      } catch (error) {
        // File doesn't exist, let 404 handler take over
        console.error(`❌ Signed PDF not found: ${filePath}`);
        console.error(`❌ Error: ${error.message}`);
        next();
      }
    });

    // Legacy support: serve from /uploads for backward compatibility
    app.use(
      "/uploads",
      express.static(uploadsBasePath, {
        setHeaders: (res, filePath) => {
          res.setHeader("Content-Type", "application/pdf");
        },
      })
    );

    // Favicon handler - return 204 No Content to prevent 404 errors
    app.get("/favicon.ico", (req, res) => {
      res.status(204).end();
    });

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: pool ? "connected" : "disconnected",
      });
    });

    // Initialize routes
    initRoutes(app, pool);

    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start server
    app.listen(appConfig.port, () => {
      console.log(`🚀 Server running on port ${appConfig.port}`);
      console.log(`📝 Environment: ${appConfig.nodeEnv}`);
      console.log(`🌐 Base URL: ${appConfig.baseUrl}`);
    });
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  if (pool) {
    await pool.end();
    console.log("Database pool closed");
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  if (pool) {
    await pool.end();
    console.log("Database pool closed");
  }
  process.exit(0);
});

// Initialize app
initializeApp();

export default app;
