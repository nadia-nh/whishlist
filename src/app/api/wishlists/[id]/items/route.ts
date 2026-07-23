import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import WishlistItem from "@/models/WishlistItem";
import { MATCH_PREFERENCES } from "@/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const wishlist = await Wishlist.findOne({ _id: id, ownerId: session.sub });
  if (!wishlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const url = typeof body?.url === "string" ? body.url.trim() : undefined;
  const price = typeof body?.price === "number" && body.price >= 0 ? body.price : undefined;
  const priority = [1, 2, 3].includes(body?.priority) ? body.priority : undefined;
  const matchPreference = MATCH_PREFERENCES.includes(body?.matchPreference)
    ? body.matchPreference
    : undefined;

  const item = await WishlistItem.create({
    wishlistId: wishlist._id,
    title,
    description,
    url,
    price,
    priority,
    matchPreference,
  });

  return NextResponse.json(
    {
      id: item._id.toString(),
      title: item.title,
      description: item.description ?? null,
      url: item.url ?? null,
      price: item.price ?? null,
      priority: item.priority ?? null,
      matchPreference: item.matchPreference ?? null,
      isFulfilled: item.isFulfilled,
    },
    { status: 201 }
  );
}
