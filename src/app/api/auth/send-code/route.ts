import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { EMAIL_RE } from "@/lib/auth";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!checkRateLimit(`send-code:${email}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many code requests, try again later" },
      { status: 429 }
    );
  }

  await connectDB();

  const code = generateOtp();
  await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: { email },
      $set: { otpCodeHash: hashOtp(code), otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0 },
    },
    { upsert: true }
  );

  await sendOtpEmail(email, code);

  return NextResponse.json({ ok: true });
}
