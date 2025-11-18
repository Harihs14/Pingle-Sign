import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

export const appConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  baseUrl: process.env.BASE_URL || "http://localhost:5173",
  // Upload directories - all in backend/uploads/
  uploadsDir: path.join(__dirname, "../uploads"),
  templatesDir: path.join(__dirname, "../uploads/templates"),
  signedDir: path.join(__dirname, "../uploads/signed"),
  // Legacy support - will be removed
  uploadDir: path.join(__dirname, "../uploads/signed"),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB default
  allowedMimeTypes: ["application/pdf"],
  tokenExpiry: parseInt(process.env.TOKEN_EXPIRY || "2592000000", 10), // 30 days default
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};

export default appConfig;
