import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";
import { MATCH_PREFERENCES } from "@/types";

async function loadOwnedItem(itemId: string, ownerId: string) {
  if (!mongoose.isValidObjectId(itemId)) return null;
  const item = await WishlistItem.findById(itemId);
  if (!item) return null;
  const wishlist = await Wishlist.findOne({ _id: item.wishlistId, ownerId });
  if (!wishlist) return null;
  return item;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { itemId } = await params;
  await connectDB();
  const item = await loadOwnedItem(itemId, session.sub);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body?.title === "string" && body.title.trim()) item.title = body.title.trim();
  if (typeof body?.description === "string") item.description = body.description.trim() || undefined;
  if (typeof body?.url === "string") item.url = body.url.trim() || undefined;
  if (typeof body?.price === "number" || body?.price === null) {
    item.price = typeof body.price === "number" && body.price >= 0 ? body.price : undefined;
  }
  if ([1, 2, 3].includes(body?.priority) || body?.priority === null) {
    item.priority = [1, 2, 3].includes(body?.priority) ? body.priority : undefined;
  }
  if (MATCH_PREFERENCES.includes(body?.matchPreference) || body?.matchPreference === null) {
    item.matchPreference = MATCH_PREFERENCES.includes(body?.matchPreference)
      ? body.matchPreference
      : undefined;
  }
  await item.save();

  return NextResponse.json({
    id: item._id.toString(),
    title: item.title,
    description: item.description ?? null,
    url: item.url ?? null,
    price: item.price ?? null,
    priority: item.priority ?? null,
    matchPreference: item.matchPreference ?? null,
    isFulfilled: item.isFulfilled,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { itemId } = await params;
  await connectDB();
  const item = await loadOwnedItem(itemId, session.sub);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await item.deleteOne();
  return NextResponse.json({ ok: true });
}
