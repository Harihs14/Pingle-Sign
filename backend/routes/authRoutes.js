import express from "express";
import AuthController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

/**
 * Initialize auth routes
 */
export function initAuthRoutes() {
  const authController = new AuthController();

  // Strict rate limiting for login endpoint (prevent brute force)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
      success: false,
      error: "Too many login attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  /**
   * @route   POST /api/auth/login
   * @desc    Login with email and password
   * @access  Public
   */
  router.post("/login", loginLimiter, authController.login);

  /**
   * @route   GET /api/auth/verify
   * @desc    Verify authentication token
   * @access  Protected
   */
  router.get("/verify", authenticate, authController.verifyToken);

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout (clear token)
   * @access  Protected
   */
  router.post("/logout", authenticate, authController.logout);

  return router;
}

export default initAuthRoutes;

