import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const TOKEN_NAME = "mission-token";
const TOKEN_EXPIRY = "4h";

interface TokenPayload {
  userId: string;
  sessionId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookie(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function createTokenCookieHeader(token: string): string {
  return `${TOKEN_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=14400`;
}
