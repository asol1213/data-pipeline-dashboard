"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import FormulaAutoComplete from "./FormulaAutoComplete";

interface EditableCellProps {
  value: string;
  isEditing: boolean;
  isSelected: boolean;
  columnType: string;
  onStartEdit: () => void;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  onNavigate: (direction: "up" | "down" | "left" | "right") => void;
  highlight?: "match" | "current";
  headers?: string[];
}

export default function EditableCell({
  value,
  isEditing,
  isSelected,
  columnType,
  onStartEdit,
  onSave,
  onCancel,
  onNavigate,
  highlight,
  headers = [],
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      // Delay focus to ensure input is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
        if (inputRef.current) {
          setInputRect(inputRef.current.getBoundingClientRect());
        }
      });
    } else {
      setShowAutoComplete(false);
    }
  }, [isEditing, value]);

  const handleValueChange = useCallback((newVal: string) => {
    setEditValue(newVal);
    setShowAutoComplete(newVal.startsWith("="));
    if (inputRef.current) {
      setInputRect(inputRef.current.getBoundingClientRect());
    }
  }, []);

  const handleAutoCompleteSelect = useCallback((selected: string) => {
    // Insert the selected value at the appropriate position
    const afterEquals = editValue.substring(1);
    const lastTokenMatch = afterEquals.match(/[A-Z]*$/i);
    const prefix = lastTokenMatch
      ? editValue.substring(0, editValue.length - lastTokenMatch[0].length)
      : editValue;
    const newValue = prefix + selected;
    setEditValue(newValue);
    setShowAutoComplete(newValue.startsWith("="));
    inputRef.current?.focus();
  }, [editValue]);

  const handleSave = () => {
    setShowAutoComplete(false);
    onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
      onNavigate("down");
    } else if (e.key === "Tab" && !showAutoComplete) {
      e.preventDefault();
      handleSave();
      onNavigate(e.shiftKey ? "left" : "right");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowAutoComplete(false);
      onCancel();
    }
  };

  const isNumber = columnType === "number";

  if (isEditing) {
    return (
      <td
        className="px-0 py-0 relative"
        style={{ minWidth: 80 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => handleValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow autocomplete clicks
            setTimeout(() => {
              if (!showAutoComplete) handleSave();
            }, 150);
          }}
          className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border-2 border-accent rounded focus:outline-none font-mono"
          style={{ minWidth: 80 }}
        />
        <FormulaAutoComplete
          inputValue={editValue}
          anchorRect={inputRect}
          headers={headers}
          onSelect={handleAutoCompleteSelect}
          visible={showAutoComplete}
        />
      </td>
    );
  }

  const highlightClass = highlight === "current"
    ? "bg-yellow-400/40"
    : highlight === "match"
      ? "bg-yellow-300/20"
      : "";

  return (
    <td
      onClick={onStartEdit}
      className={`px-3 py-2 text-sm cursor-pointer select-none transition-colors ${
        isSelected
          ? "outline outline-2 outline-accent bg-accent/5"
          : "hover:bg-bg-card-hover"
      } ${isNumber ? "text-right font-mono text-text-secondary" : "text-text-primary"} ${highlightClass}`}
      style={{ minWidth: 80 }}
    >
      {value}
    </td>
  );
}
