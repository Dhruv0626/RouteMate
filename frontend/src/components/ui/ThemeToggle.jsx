import React from "react";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useAuth();

  return (
    <button
      onClick={toggleTheme}
      className="hover:text-primary rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) shadow-lg backdrop-blur-md transition-all duration-300"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun
          size={20}
          className="animate-in fade-in zoom-in spin-in-90 duration-500"
        />
      ) : (
        <Moon
          size={20}
          className="animate-in fade-in zoom-in spin-in-90 duration-500"
        />
      )}
    </button>
  );
};

export default ThemeToggle;
