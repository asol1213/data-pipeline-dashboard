"use client";

import { useState, useRef, useEffect } from "react";

interface EditableCellProps {
  value: string;
  isEditing: boolean;
  isSelected: boolean;
  columnType: string;
  onStartEdit: () => void;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  onNavigate: (direction: "up" | "down" | "left" | "right") => void;
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
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      // Delay focus to ensure input is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, value]);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
      onNavigate("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSave();
      onNavigate(e.shiftKey ? "left" : "right");
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const isNumber = columnType === "number";

  if (isEditing) {
    return (
      <td
        className="px-0 py-0"
        style={{ minWidth: 80 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border-2 border-accent rounded focus:outline-none font-mono"
          style={{ minWidth: 80 }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={onStartEdit}
      className={`px-3 py-2 text-sm cursor-pointer select-none transition-colors ${
        isSelected
          ? "outline outline-2 outline-accent bg-accent/5"
          : "hover:bg-bg-card-hover"
      } ${isNumber ? "text-right font-mono text-text-secondary" : "text-text-primary"}`}
      style={{ minWidth: 80 }}
    >
      {value}
    </td>
  );
}
