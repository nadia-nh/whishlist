"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

type InlineEditableSelectProps = {
  value: string | null;
  options: Option[];
  emptyLabel: string;
  onSave: (next: string | null) => Promise<void>;
  formatReadLabel?: (label: string) => string;
};

export default function InlineEditableSelect({
  value,
  options,
  emptyLabel,
  onSave,
  formatReadLabel,
}: InlineEditableSelectProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  async function commit(next: string) {
    const nextValue = next === "" ? null : next;
    if (nextValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(nextValue);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const label = value ? (options.find((o) => o.value === value)?.label ?? value) : null;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={
          label
            ? "text-xs text-gray-500"
            : "text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }
      >
        {label ? (formatReadLabel ? formatReadLabel(label) : label) : emptyLabel}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        ref={selectRef}
        defaultValue={value ?? ""}
        disabled={saving}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
