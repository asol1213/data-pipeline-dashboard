"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const FUNCTIONS = [
  { name: "SUM", desc: "Sum of values" },
  { name: "AVERAGE", desc: "Average of values" },
  { name: "COUNT", desc: "Count of values" },
  { name: "MIN", desc: "Minimum value" },
  { name: "MAX", desc: "Maximum value" },
  { name: "IF", desc: "Conditional logic" },
  { name: "ROUND", desc: "Round to decimals" },
  { name: "ABS", desc: "Absolute value" },
];

interface FormulaAutoCompleteProps {
  inputValue: string;
  anchorRect: DOMRect | null;
  headers: string[];
  onSelect: (value: string) => void;
  visible: boolean;
}

export default function FormulaAutoComplete({
  inputValue,
  anchorRect,
  headers,
  onSelect,
  visible,
}: FormulaAutoCompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate column letters from headers
  const columnLetters = headers.map((_, i) => {
    const letter = String.fromCharCode(65 + (i % 26));
    return i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) + letter : letter;
  });

  // Determine suggestions based on input
  const getSuggestions = useCallback((): { label: string; value: string; desc: string }[] => {
    if (!inputValue.startsWith("=")) return [];
    const afterEquals = inputValue.substring(1).toUpperCase();

    if (afterEquals === "") {
      return FUNCTIONS.map(f => ({ label: f.name, value: f.name + "(", desc: f.desc }));
    }

    // Check if the last token looks like a partial column reference
    const lastToken = afterEquals.split(/[^A-Z0-9]/i).pop() || "";

    // If we're inside a function (after open paren), suggest column letters
    const openParens = (inputValue.match(/\(/g) || []).length;
    const closeParens = (inputValue.match(/\)/g) || []).length;
    const insideFunc = openParens > closeParens;

    if (insideFunc && lastToken.length <= 2) {
      const filteredCols = columnLetters
        .filter(l => l.startsWith(lastToken))
        .map((l, i) => ({
          label: `${l} (${headers[i] || "Column"})`,
          value: l,
          desc: `Column ${l}`,
        }));
      if (filteredCols.length > 0) return filteredCols;
    }

    // Filter functions by partial match
    const filteredFuncs = FUNCTIONS
      .filter(f => f.name.startsWith(afterEquals))
      .map(f => ({ label: f.name, value: f.name + "(", desc: f.desc }));

    return filteredFuncs;
  }, [inputValue, headers, columnLetters]);

  const suggestions = getSuggestions();

  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Tab" || e.key === "Enter") {
        if (suggestions.length > 0 && visible) {
          // Let the parent handle the Enter for saving
          // Only Tab should autocomplete
          if (e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            onSelect(suggestions[selectedIndex].value);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [visible, suggestions, selectedIndex, onSelect]);

  if (!visible || !anchorRect || suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="fixed z-[100] bg-bg-card border border-border-subtle rounded-lg shadow-xl py-1 min-w-[200px] max-h-[200px] overflow-y-auto"
      style={{
        left: anchorRect.left,
        top: anchorRect.bottom + 2,
      }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.label}
          className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 transition-colors ${
            i === selectedIndex
              ? "bg-accent/10 text-accent"
              : "text-text-primary hover:bg-bg-card-hover"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.value);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="font-mono font-medium">{s.label}</span>
          <span className="text-xs text-text-muted">{s.desc}</span>
        </button>
      ))}
    </div>
  );
}
