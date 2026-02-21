/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState("dark");

  // Initialize theme and user
  useEffect(() => {
    try {
      // Restore User
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUserState(JSON.parse(storedUser));
      }

      // Restore Theme
      const storedTheme = localStorage.getItem("theme") || "dark";
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } catch {
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
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
