import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken, createTokenCookieHeader } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  country: z.string().min(1),
  platform: z.enum(["ig", "tiktok", "other"]),
  consentComms: z.boolean(),
  ageVerified: z.literal(true),
  honeypot: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, country, platform, consentComms, ageVerified, honeypot } =
      result.data;

    // Honeypot check: if filled, silently accept but don't create a user
    if (honeypot) {
      return NextResponse.json({
        success: true,
        redirect: "/briefing",
      });
    }

    // Check for existing email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An agent with this email is already registered." },
        { status: 409 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        country,
        platform,
        consentComms,
        ageVerified,
      },
    });

    // Sign JWT and set cookie
    const token = signToken({ userId: user.id });
    const cookieHeader = createTokenCookieHeader(token);

    const response = NextResponse.json({
      success: true,
      redirect: "/briefing",
    });

    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
