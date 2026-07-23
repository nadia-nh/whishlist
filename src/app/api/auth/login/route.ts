import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email } },
    { upsert: true, new: true }
  );

  const token = await signSession({ sub: user._id.toString(), email: user.email });

  const res = NextResponse.json({ email: user.email });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return res;
}
