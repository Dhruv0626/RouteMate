/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState("light");

  // Initialize theme and user — then verify session is still valid on server
  useEffect(() => {
    const initializeAuth = async () => {
      // Restore Theme first (no network needed)
      const storedTheme = localStorage.getItem("theme") || "light";
      setThemeState(storedTheme);
      applyTheme(storedTheme);

      // Restore User from localStorage for instant UI
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUserState(JSON.parse(storedUser));
        } catch {
          // Corrupted localStorage — clear it
          localStorage.removeItem("user");
        }
      }

      // ── Server-side session check ──────────────────────────────────────
      // Verify session via HTTP-only cookies. This handles standard logins,
      // refresh token cycles, AND redirects from OAuth flows.
      try {
        const { data } = await api.get("/users/profile");
        if (data.success) {
          // Sync latest server data into state + storage
          setUserState(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch {
        // Only clear storage if API explicitely returns 401 Unauthorized
        // Let interceptor handle it, but keep the UI state clean if totally unauth
        if (!storedUser) {
           setUserState(null);
           localStorage.removeItem("user");
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const applyTheme = (currentTheme) => {
    const root = document.documentElement;
    if (currentTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
  };

  const setUser = (userData) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("user");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const logout = async () => {
    try {
      await api.post("/users/logout");
    } catch {
      // Ignore logout API errors
    }
    setUser(null);
    localStorage.removeItem("csrfToken");
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, logout, loading, theme, toggleTheme }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export default AuthContext;
