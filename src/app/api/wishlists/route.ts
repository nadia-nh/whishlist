import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import Wishlist from "@/models/Wishlist";
import { generateSlug } from "@/lib/slug";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await connectDB();
  const wishlists = await Wishlist.find({ ownerId: session.sub }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(
    wishlists.map((w) => ({
      id: w._id.toString(),
      title: w.title,
      description: w.description ?? null,
      slug: w.slug,
      createdAt: w.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "My Wishlist";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;

  await connectDB();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const wishlist = await Wishlist.create({
        ownerId: session.sub,
        title,
        description,
        slug: generateSlug(),
      });
      return NextResponse.json(
        {
          id: wishlist._id.toString(),
          title: wishlist.title,
          description: wishlist.description ?? null,
          slug: wishlist.slug,
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      const isDuplicateSlug =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: number }).code === 11000;
      if (!isDuplicateSlug) throw err;
      // retry with a freshly generated slug
    }
  }

  return NextResponse.json({ error: "Failed to generate a unique link, try again" }, { status: 500 });
}
