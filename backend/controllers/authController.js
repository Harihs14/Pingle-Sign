import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import appConfig from "../config/app.js";

/**
 * Authentication Controller
 * Handles login and authentication
 */
export class AuthController {
  constructor() {
    // Get credentials from environment variables
    this.adminEmail = process.env.ADMIN_EMAIL || "";
    const plainPassword = process.env.ADMIN_PASSWORD || "";
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecret();
    this.jwtExpiry = process.env.JWT_EXPIRY || "24h"; // 24 hours default

    // Hash password on initialization (if plain password provided)
    // If password is already hashed (starts with $2a$ or $2b$), use it directly
    if (plainPassword) {
      if (plainPassword.startsWith("$2a$") || plainPassword.startsWith("$2b$")) {
        // Already hashed
        this.adminPasswordHash = plainPassword;
      } else {
        // Hash the plain password (sync for initialization)
        const saltRounds = 12;
        this.adminPasswordHash = bcrypt.hashSync(plainPassword, saltRounds);
        console.log("✅ Admin password hashed on initialization");
      }
    }

    // Validate required environment variables
    if (!this.adminEmail || !this.adminPasswordHash) {
      console.warn(
        "⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in environment variables"
      );
      console.warn("   ADMIN_EMAIL:", this.adminEmail || "NOT SET");
      console.warn("   ADMIN_PASSWORD:", this.adminPasswordHash ? "SET" : "NOT SET");
    } else {
      console.log("✅ Authentication configured successfully");
      console.log("   Admin Email:", this.adminEmail);
      console.log("   Password:", this.adminPasswordHash ? "✓ Hashed" : "✗ Missing");
    }
  }

  /**
   * Generate a secret if not provided (for development only)
   * In production, JWT_SECRET must be set in environment variables
   */
  generateSecret() {
    if (appConfig.nodeEnv === "production") {
      throw new Error(
        "JWT_SECRET must be set in environment variables for production"
      );
    }
    // Generate a random secret for development
    return crypto.randomBytes(64).toString("hex");
  }

  /**
   * Login - Authenticate user with email and password
   */
  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Email and password are required",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Invalid email format",
        });
      }

      // Check if credentials are configured
      if (!this.adminEmail || !this.adminPasswordHash) {
        console.error("❌ Admin credentials not configured");
        console.error("   ADMIN_EMAIL:", this.adminEmail ? "✓ Set" : "✗ Missing");
        console.error("   ADMIN_PASSWORD:", this.adminPasswordHash ? "✓ Set" : "✗ Missing");
        return res.status(500).json({
          success: false,
          error: "Authentication not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env file",
        });
      }

      // Compare email (case-insensitive)
      if (email.toLowerCase() !== this.adminEmail.toLowerCase()) {
        // Use constant-time comparison to prevent timing attacks
        await bcrypt.compare(password, this.adminPasswordHash); // Dummy comparison
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Compare password using bcrypt (secure constant-time comparison)
      const passwordMatch = await bcrypt.compare(
        password,
        this.adminPasswordHash
      );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          email: this.adminEmail,
          type: "admin",
        },
        this.jwtSecret,
        {
          expiresIn: this.jwtExpiry,
          issuer: "signing-app",
          audience: "signing-app-client",
        }
      );

      // Set secure HTTP-only cookie (optional, additional security layer)
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: appConfig.nodeEnv === "production", // HTTPS only in production
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Return success response
      res.json({
        success: true,
        data: {
          token,
          email: this.adminEmail,
          expiresIn: this.jwtExpiry,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      next(new Error("Authentication failed"));
    }
  };

  /**
   * Verify token - Check if token is valid
   */
  verifyToken = async (req, res, next) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies?.authToken;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "No token provided",
        });
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret, {
          issuer: "signing-app",
          audience: "signing-app-client",
        });

        res.json({
          success: true,
          data: {
            email: decoded.email,
            type: decoded.type,
          },
        });
      } catch (jwtError) {
        if (jwtError.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            error: "Token expired",
          });
        }
        if (jwtError.name === "JsonWebTokenError") {
          return res.status(401).json({
            success: false,
            error: "Invalid token",
          });
        }
        throw jwtError;
      }
    } catch (error) {
      console.error("Error verifying token:", error);
      next(new Error("Token verification failed"));
    }
  };

  /**
   * Logout - Clear authentication
   */
  logout = async (req, res) => {
    // Clear cookie if set
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: appConfig.nodeEnv === "production",
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  };
}

export default AuthController;

