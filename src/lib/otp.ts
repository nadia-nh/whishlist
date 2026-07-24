import { randomInt, createHmac } from "crypto";

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHmac("sha256", JWT_SECRET).update(code).digest("hex");
}
