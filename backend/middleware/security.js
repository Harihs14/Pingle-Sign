import rateLimit from "express-rate-limit";
import helmet from "helmet";

/**
 * Security middleware
 */

/**
 * Helmet security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Rate limiting for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiting for document creation
 */
export const documentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 document creations per hour
  message: {
    success: false,
    error: "Too many document creation requests, please try again later.",
  },
});

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
}

/**
 * CORS configuration
 */
export function configureCors(origin) {
  // In development, allow localhost with any port
  const isDevelopment = process.env.NODE_ENV !== "production";
  const defaultOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

  // Use provided origin or default
  const configuredOrigin = origin || defaultOrigin;

  if (isDevelopment) {
    // Allow any localhost port in development, plus the configured origin
    return {
      origin: (reqOrigin, callback) => {
        // Allow requests from localhost with any port in development
        if (!reqOrigin) {
          // Some requests (like same-origin) don't have an origin header
          callback(null, true);
        } else if (
          reqOrigin.startsWith("http://localhost:") ||
          reqOrigin.startsWith("http://127.0.0.1:") ||
          reqOrigin === configuredOrigin
        ) {
          callback(null, true);
        } else {
          console.warn(
            `CORS: Blocked origin ${reqOrigin}. Allowed: localhost ports or ${configuredOrigin}`
          );
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Type"],
    };
  }

  // In production, use strict origin matching
  return {
    origin: configuredOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
  };
}

export default {
  securityHeaders,
  apiLimiter,
  documentCreationLimiter,
  requestLogger,
  configureCors,
};
