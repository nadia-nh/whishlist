import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { EMAIL_RE, signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { hashOtp, MAX_OTP_ATTEMPTS } from "@/lib/otp";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!EMAIL_RE.test(email) || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email });

  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    return NextResponse.json({ error: "Request a new code first" }, { status: 400 });
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired, request a new one" }, { status: 400 });
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts, request a new code" }, { status: 429 });
  }

  if (!safeEqual(hashOtp(code), user.otpCodeHash)) {
    user.otpAttempts += 1;
    await user.save();
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  await user.save();

  const token = await signSession({ sub: user._id.toString(), email: user.email });
  const res = NextResponse.json({ email: user.email });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return res;
}
