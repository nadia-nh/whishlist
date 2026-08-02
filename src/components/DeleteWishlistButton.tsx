"use client";

import { useRouter } from "next/navigation";

export default function DeleteWishlistButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this wishlist and all its items? This can't be undone.")) return;
    const res = await fetch(`/api/wishlists/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      Delete wishlist
    </button>
  );
}
