import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";
import PublicItemCard from "@/components/PublicItemCard";

export default async function PublicWishlistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();

  const wishlist = await Wishlist.findOne({ slug }).lean();
  if (!wishlist) notFound();

  const items = await WishlistItem.find({ wishlistId: wishlist._id }).sort({ createdAt: 1 }).lean();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">{wishlist.title}</h1>
        {wishlist.description && <p className="text-sm text-gray-500">{wishlist.description}</p>}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">This wishlist doesn&apos;t have any items yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <PublicItemCard
              key={item._id.toString()}
              id={item._id.toString()}
              title={item.title}
              description={item.description}
              url={item.url}
              price={item.price}
              priority={item.priority}
              matchPreference={item.matchPreference}
              isFulfilled={item.isFulfilled}
            />
          ))}
        </div>
      )}
    </main>
  );
}
