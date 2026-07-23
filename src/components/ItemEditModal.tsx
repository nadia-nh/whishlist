"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MATCH_PREFERENCES, MATCH_PREFERENCE_LABELS, type MatchPreference } from "@/types";

type ItemFields = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  price?: number | null;
  priority?: number | null;
  matchPreference?: MatchPreference | null;
};

export default function ItemEditModal({
  item,
  onClose,
}: {
  item: ItemFields;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");
  const [priority, setPriority] = useState(item.priority != null ? String(item.priority) : "");
  const [matchPreference, setMatchPreference] = useState<string>(item.matchPreference ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          url,
          price: price === "" ? null : Number(price),
          priority: priority === "" ? null : Number(priority),
          matchPreference: matchPreference === "" ? null : matchPreference,
        }),
      });
      if (!res.ok) throw new Error("Could not save changes");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold">Edit item</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Link
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Price estimate
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">None</option>
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            How flexible is this?
            <select
              value={matchPreference}
              onChange={(e) => setMatchPreference(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">Not specified</option>
              {MATCH_PREFERENCES.map((mp) => (
                <option key={mp} value={mp}>
                  {MATCH_PREFERENCE_LABELS[mp]}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
