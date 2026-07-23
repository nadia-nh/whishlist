import NewWishlistForm from "@/components/NewWishlistForm";

export default function NewWishlistPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Create a wishlist</h1>
      <NewWishlistForm />
    </main>
  );
}
