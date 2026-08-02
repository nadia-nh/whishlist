"use client";

import { useEffect, useRef, useState } from "react";

type InlineEditableTextProps = {
  value: string | null;
  onSave: (next: string) => Promise<void>;
  placeholder?: string;
  emptyLabel?: string;
  multiline?: boolean;
  inputType?: "text" | "number";
  required?: boolean;
  readClassName?: string;
  prefix?: string;
  renderValue?: (value: string, onEdit: () => void) => React.ReactNode;
};

export default function InlineEditableText({
  value,
  onSave,
  placeholder,
  emptyLabel = "+ Add",
  multiline = false,
  inputType = "text",
  required = false,
  readClassName = "",
  prefix = "",
  renderValue,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    (multiline ? textareaRef.current : inputRef.current)?.focus();
  }, [editing, multiline]);

  function startEditing() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(value ?? "");
    setError(null);
    setEditing(false);
  }

  async function commit() {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setError("Required");
      return;
    }
    if (trimmed === (value ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!value) {
      return (
        <button
          type="button"
          onClick={startEditing}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {emptyLabel}
        </button>
      );
    }
    if (renderValue) return <>{renderValue(value, startEditing)}</>;
    return (
      <button type="button" onClick={startEditing} className={`text-left ${readClassName}`}>
        {prefix}
        {value}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={2}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
        />
      ) : (
        <input
          ref={inputRef}
          value={draft}
          type={inputType}
          min={inputType === "number" ? 0 : undefined}
          step={inputType === "number" ? "0.01" : undefined}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
        />
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
