"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/app/theme-provider";

const ACCENT_COLORS = [
  { name: "Blue", value: "#3b82f6", hover: "#2563eb" },
  { name: "Purple", value: "#8b5cf6", hover: "#7c3aed" },
  { name: "Green", value: "#10b981", hover: "#059669" },
  { name: "Orange", value: "#f59e0b", hover: "#d97706" },
  { name: "Red", value: "#ef4444", hover: "#dc2626" },
  { name: "Cyan", value: "#06b6d4", hover: "#0891b2" },
] as const;

const ACCENT_STORAGE_KEY = "datapipe-accent-color";

function applyAccentColor(color: string, hover: string) {
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-hover", hover);
  document.documentElement.style.setProperty(
    "--accent-subtle",
    color + "1a"
  );
}

export default function ThemeCustomizer() {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(ACCENT_COLORS[0].name);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore accent on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored) {
      const found = ACCENT_COLORS.find((c) => c.name === stored);
      if (found) {
        setSelectedColor(found.name);
        applyAccentColor(found.value, found.hover);
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectColor(color: (typeof ACCENT_COLORS)[number]) {
    setSelectedColor(color.name);
    applyAccentColor(color.value, color.hover);
    localStorage.setItem(ACCENT_STORAGE_KEY, color.name);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
        title="Theme settings"
        aria-label="Theme settings"
      >
        {theme === "dark" ? (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-xl p-3 min-w-[180px] z-50 animate-tooltip">
          {/* Dark/Light toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors mb-2"
          >
            {theme === "dark" ? (
              <>
                <span>&#9728;&#65039;</span> Switch to Light
              </>
            ) : (
              <>
                <span>&#127769;</span> Switch to Dark
              </>
            )}
          </button>

          {/* Accent color picker */}
          <div className="border-t border-border-subtle pt-2">
            <p className="text-xs text-text-muted font-medium px-1 mb-2">
              Accent Color
            </p>
            <div className="grid grid-cols-6 gap-1.5 px-1">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => selectColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedColor === color.name
                      ? "border-text-primary scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={`Set accent color to ${color.name}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
