import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";
import DeleteWishlistButton from "@/components/DeleteWishlistButton";
import CopyShareLink from "@/components/CopyShareLink";
import QuickAddItemForm from "@/components/QuickAddItemForm";
import ItemCard from "@/components/ItemCard";

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) notFound();

  await connectDB();
  if (!mongoose.isValidObjectId(id)) notFound();

  const wishlist = await Wishlist.findOne({ _id: id, ownerId: session.sub }).lean();
  if (!wishlist) notFound();

  const items = await WishlistItem.find({ wishlistId: wishlist._id }).sort({ createdAt: 1 }).lean();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shareUrl = `${appUrl}/w/${wishlist.slug}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{wishlist.title}</h1>
          {wishlist.description && <p className="text-sm text-gray-500">{wishlist.description}</p>}
        </div>
        <DeleteWishlistButton id={wishlist._id.toString()} />
      </div>

      <CopyShareLink url={shareUrl} />

      <QuickAddItemForm wishlistId={wishlist._id.toString()} />

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No items yet — add your first one above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemCard
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
