import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LOCALES = ["en", "es", "pt"];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Detect locale from Accept-Language header
  const acceptLang = request.headers.get("accept-language") || "";
  const preferredLang = acceptLang
    .split(",")
    .map((l) => l.split(";")[0].trim().substring(0, 2).toLowerCase())
    .find((l) => SUPPORTED_LOCALES.includes(l));

  if (preferredLang) {
    response.headers.set("x-locale", preferredLang);
  }

  // Forward client IP for geo detection
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  response.headers.set("x-client-ip", ip);

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next|favicon.ico|sounds|images|fonts).*)"],
};
