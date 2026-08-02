"use client";

import { useRouter } from "next/navigation";
import InlineEditableText from "@/components/inline/InlineEditableText";
import InlineEditableSelect from "@/components/inline/InlineEditableSelect";
import { MATCH_PREFERENCES, MATCH_PREFERENCE_LABELS, type ItemFields } from "@/types";

const PRIORITY_OPTIONS = [
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
];

const MATCH_OPTIONS = MATCH_PREFERENCES.map((mp) => ({
  value: mp,
  label: MATCH_PREFERENCE_LABELS[mp],
}));

type ItemCardProps = ItemFields & { isFulfilled: boolean };

export default function ItemCard(props: ItemCardProps) {
  const router = useRouter();

  async function patchItem(body: Record<string, unknown>) {
    const res = await fetch(`/api/items/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Could not save");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${props.title}"?`)) return;
    const res = await fetch(`/api/items/${props.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <InlineEditableText
            value={props.title}
            required
            readClassName="font-medium"
            onSave={(next) => patchItem({ title: next })}
          />
          {props.isFulfilled && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
              Purchased
            </span>
          )}
        </div>

        <InlineEditableText
          value={props.description ?? null}
          multiline
          emptyLabel="+ Add description"
          readClassName="text-sm text-gray-500"
          onSave={(next) => patchItem({ description: next })}
        />

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <InlineEditableText
            value={props.url ?? null}
            emptyLabel="+ Add link"
            placeholder="https://..."
            onSave={(next) => patchItem({ url: next })}
            renderValue={(value, onEdit) => (
              <span className="flex items-center gap-1">
                <a href={value} target="_blank" className="underline">
                  Link
                </a>
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  edit
                </button>
              </span>
            )}
          />

          <InlineEditableText
            value={props.price != null ? String(props.price) : null}
            emptyLabel="+ Add price"
            inputType="number"
            prefix="$"
            onSave={(next) => patchItem({ price: next.trim() === "" ? null : Number(next) })}
          />

          <InlineEditableSelect
            value={props.priority != null ? String(props.priority) : null}
            options={PRIORITY_OPTIONS}
            emptyLabel="+ Set priority"
            formatReadLabel={(label) => `${label} priority`}
            onSave={(next) => patchItem({ priority: next === null ? null : Number(next) })}
          />

          <InlineEditableSelect
            value={props.matchPreference ?? null}
            options={MATCH_OPTIONS}
            emptyLabel="+ Set flexibility"
            onSave={(next) => patchItem({ matchPreference: next })}
          />
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete
      </button>
    </div>
  );
}
