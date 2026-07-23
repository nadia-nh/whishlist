"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ItemEditModal from "@/components/ItemEditModal";
import { MATCH_PREFERENCE_LABELS, type MatchPreference } from "@/types";

type ItemCardProps = {
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

export default function ItemCard(props: ItemCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${props.title}"?`)) return;
    const res = await fetch(`/api/items/${props.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{props.title}</span>
            {props.isFulfilled && (
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
        <div className="flex shrink-0 gap-3 text-sm">
          <button onClick={() => setEditing(true)} className="text-gray-500 hover:underline">
            Edit
          </button>
          <button onClick={handleDelete} className="text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>
      {editing && <ItemEditModal item={props} onClose={() => setEditing(false)} />}
    </>
  );
}
