import jwt from "jsonwebtoken";

/**
 * Authentication Middleware
 * Verifies JWT token and protects routes
 */
export const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "No token provided",
      });
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ JWT_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, jwtSecret, {
        issuer: "signing-app",
        audience: "signing-app-client",
      });

      // Attach user info to request object
      req.user = {
        email: decoded.email,
        type: decoded.type,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          message: "Please login again",
        });
      }
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Invalid token",
          message: "Please login again",
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

export default authenticate;

