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
    <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
      Delete wishlist
    </button>
  );
}
