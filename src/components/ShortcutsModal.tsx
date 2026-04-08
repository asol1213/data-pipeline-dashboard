"use client";

import { useState, useEffect, useCallback } from "react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "Ctrl+K", description: "Command Palette" },
      { keys: "?", description: "Keyboard Shortcuts" },
    ],
  },
  {
    title: "Data",
    shortcuts: [{ keys: "Ctrl+U", description: "Upload CSV" }],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: "Ctrl+S", description: "Save (in spreadsheet/builder)" },
      { keys: "Ctrl+Z", description: "Undo (in spreadsheet)" },
      { keys: "Ctrl+F", description: "Find (in spreadsheet)" },
      { keys: "Ctrl+H", description: "Find & Replace" },
      { keys: "Escape", description: "Close modal/panel" },
    ],
  },
];

export default function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    if (e.key === "Escape" && open) {
      setOpen(false);
      return;
    }

    if (e.key === "?" && !isInput) {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-bg-card border border-border-subtle rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-tooltip overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-bg-card-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-text-secondary">
                      {s.description}
                    </span>
                    <kbd className="px-2 py-0.5 rounded-md bg-bg-secondary border border-border-subtle text-xs font-mono text-text-primary">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-bg-secondary/50">
          <p className="text-xs text-text-muted text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle text-text-secondary font-mono">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
