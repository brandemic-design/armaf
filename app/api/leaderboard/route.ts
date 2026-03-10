import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");

    const where = country ? { country } : {};

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      orderBy: { totalTokens: "desc" },
      take: 100,
    });

    // Fetch the total count to determine "First 500" status
    // An entry is "First 500" if its completedAt is among the earliest 500
    const first500Cutoff = await prisma.leaderboardEntry.findMany({
      orderBy: { completedAt: "asc" },
      take: 500,
      select: { id: true },
    });

    const first500Ids = new Set(first500Cutoff.map((e) => e.id));

    const enriched = entries.map((entry, index) => ({
      position: index + 1,
      nickname: entry.nickname,
      country: entry.country,
      totalTokens: entry.totalTokens,
      rank: entry.rank,
      isFirst500: first500Ids.has(entry.id),
    }));

    return NextResponse.json({ entries: enriched });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard." },
      { status: 500 }
    );
  }
}
