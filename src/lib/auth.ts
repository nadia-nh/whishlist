import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  sub: string; // user id
  email: string;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
