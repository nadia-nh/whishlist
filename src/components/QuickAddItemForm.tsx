"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuickAddItemForm({ wishlistId }: { wishlistId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitItem();
  }

  async function submitItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/wishlists/${wishlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Could not add item");
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitItem();
            }
          }}
          placeholder="Add an item…"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-gray-400">Just a name is fine — add details later.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
