import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";

async function loadOwnedWishlist(id: string, ownerId: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Wishlist.findOne({ _id: id, ownerId });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const wishlist = await loadOwnedWishlist(id, session.sub);
  if (!wishlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await WishlistItem.find({ wishlistId: wishlist._id }).sort({ createdAt: 1 }).lean();

  return NextResponse.json({
    id: wishlist._id.toString(),
    title: wishlist.title,
    description: wishlist.description ?? null,
    slug: wishlist.slug,
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const wishlist = await loadOwnedWishlist(id, session.sub);
  if (!wishlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body?.title === "string" && body.title.trim()) wishlist.title = body.title.trim();
  if (typeof body?.description === "string") wishlist.description = body.description.trim();
  wishlist.updatedAt = new Date();
  await wishlist.save();

  return NextResponse.json({
    id: wishlist._id.toString(),
    title: wishlist.title,
    description: wishlist.description ?? null,
    slug: wishlist.slug,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const wishlist = await loadOwnedWishlist(id, session.sub);
  if (!wishlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await WishlistItem.deleteMany({ wishlistId: wishlist._id });
  await wishlist.deleteOne();

  return NextResponse.json({ ok: true });
}
