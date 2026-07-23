"use client";

import { useState } from "react";
import { MATCH_PREFERENCE_LABELS, type MatchPreference } from "@/types";

type PublicItemCardProps = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  price?: number | null;
  priority?: number | null;
  matchPreference?: MatchPreference | null;
  isFulfilled: boolean;
};

const PRIORITY_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

export default function PublicItemCard(props: PublicItemCardProps) {
  const [isFulfilled, setIsFulfilled] = useState(props.isFulfilled);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/items/${props.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilledBy: name.trim() || undefined }),
      });
      if (res.status === 409) {
        setIsFulfilled(true);
        setError("Someone already claimed this item.");
        return;
      }
      if (!res.ok) throw new Error("Could not update this item");
      setIsFulfilled(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{props.title}</span>
            {isFulfilled && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                Purchased
              </span>
            )}
          </div>
          {props.description && <p className="text-sm text-gray-500">{props.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {props.url && (
              <a href={props.url} target="_blank" className="underline">
                Link
              </a>
            )}
            {props.price != null && <span>${props.price}</span>}
            {props.priority != null && <span>{PRIORITY_LABELS[props.priority]} priority</span>}
            {props.matchPreference && <span>{MATCH_PREFERENCE_LABELS[props.matchPreference]}</span>}
          </div>
        </div>

        {!isFulfilled && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
          >
            Mark as purchased
          </button>
        )}
      </div>

      {!isFulfilled && showConfirm && (
        <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900">
          <label className="flex flex-col gap-1 text-sm">
            Your name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
              className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {submitting ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
      {isFulfilled && error && <p className="text-sm text-gray-500">{error}</p>}
    </div>
  );
}
