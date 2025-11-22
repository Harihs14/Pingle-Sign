import { AppError } from "../utils/errors.js";

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || [];

  // Log error for debugging
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err);
  } else {
    console.error("Error:", err.message);
  }

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    if (err.errors) {
      errors = err.errors;
    }
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation error";
    errors = [err.message];
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = "File upload error";
    errors = [err.message];
  }

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
}

export default { errorHandler, notFoundHandler };






