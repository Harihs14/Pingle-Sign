import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { secureStorage } from "@/utils/security";

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = secureStorage.get(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.data);
      } else {
        // Token invalid, clear it
        secureStorage.remove(TOKEN_KEY);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      secureStorage.remove(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      // Store token
      secureStorage.set(TOKEN_KEY, result.data.token);
      setUser(result.data);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message || "Login failed. Please try again.",
      };
    }
  };

  const logout = async () => {
    try {
      const token = secureStorage.get(TOKEN_KEY);
      if (token) {
        // Call logout endpoint
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and state
      secureStorage.remove(TOKEN_KEY);
      setUser(null);
      navigate("/login");
    }
  };

  const getToken = () => {
    return secureStorage.get(TOKEN_KEY);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

