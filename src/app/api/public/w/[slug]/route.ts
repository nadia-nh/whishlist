import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDB();

  const wishlist = await Wishlist.findOne({ slug }).lean();
  if (!wishlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await WishlistItem.find({ wishlistId: wishlist._id }).sort({ createdAt: 1 }).lean();

  return NextResponse.json({
    title: wishlist.title,
    description: wishlist.description ?? null,
    items: items.map((i) => ({
      id: i._id.toString(),
      title: i.title,
      description: i.description ?? null,
      url: i.url ?? null,
      price: i.price ?? null,
      priority: i.priority ?? null,
      matchPreference: i.matchPreference ?? null,
      isFulfilled: i.isFulfilled,
      fulfilledBy: i.fulfilledBy ?? null,
    })),
  });
}
