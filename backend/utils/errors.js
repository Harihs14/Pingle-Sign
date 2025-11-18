/**
 * Custom error classes
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500);
    this.name = "DatabaseError";
  }
}

export class FileError extends AppError {
  constructor(message = "File operation failed") {
    super(message, 500);
    this.name = "FileError";
  }
}

export default {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  FileError,
};

