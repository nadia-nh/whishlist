import Link from "next/link";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import WishlistCard from "@/components/WishlistCard";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await getSessionUser();
  await connectDB();
  const wishlists = session
    ? await Wishlist.find({ ownerId: session.sub }).sort({ createdAt: -1 }).lean()
    : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your wishlists</h1>
          <p className="text-sm text-gray-500">{session?.email}</p>
        </div>
        <LogoutButton />
      </div>

      <Link
        href="/wishlists/new"
        className="w-fit rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
      >
        + New wishlist
      </Link>

      {wishlists.length === 0 ? (
        <p className="text-sm text-gray-500">No wishlists yet — create your first one above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {wishlists.map((w) => (
            <WishlistCard
              key={w._id.toString()}
              id={w._id.toString()}
              title={w.title}
              description={w.description}
              slug={w.slug}
            />
          ))}
        </div>
      )}
    </main>
  );
}
