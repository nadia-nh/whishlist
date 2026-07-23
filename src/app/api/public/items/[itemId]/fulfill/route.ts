import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WishlistItem from "@/models/WishlistItem";

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  if (!mongoose.isValidObjectId(itemId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const fulfilledBy = typeof body?.fulfilledBy === "string" ? body.fulfilledBy.trim() || undefined : undefined;

  await connectDB();

  // Atomic conditional update: only succeeds if the item is currently unfulfilled,
  // preventing two concurrent guests from both "winning" the claim.
  const updated = await WishlistItem.findOneAndUpdate(
    { _id: itemId, isFulfilled: false },
    { $set: { isFulfilled: true, fulfilledAt: new Date(), fulfilledBy } },
    { new: true }
  );

  if (updated) {
    return NextResponse.json({ id: updated._id.toString(), isFulfilled: true });
  }

  const exists = await WishlistItem.exists({ _id: itemId });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ error: "Already claimed" }, { status: 409 });
}
