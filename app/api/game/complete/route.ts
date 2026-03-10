import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { calculateRank } from "@/lib/scoring";
import { getMarketReward } from "@/lib/rewards";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session?.userId || !session?.sessionId) {
      return NextResponse.json(
        { error: "Unauthorized. No active game session." },
        { status: 401 }
      );
    }

    // Fetch game session with user data
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: session.sessionId },
      include: { user: true },
    });

    if (!gameSession || gameSession.userId !== session.userId) {
      return NextResponse.json(
        { error: "Game session not found." },
        { status: 404 }
      );
    }

    if (gameSession.completedAt) {
      return NextResponse.json(
        { error: "Game session already completed." },
        { status: 400 }
      );
    }

    // Calculate final rank
    const rank = calculateRank(gameSession.totalTokens);

    // Mark session as completed
    const completedSession = await prisma.gameSession.update({
      where: { id: session.sessionId },
      data: {
        completedAt: new Date(),
        rank,
      },
    });

    // Create leaderboard entry
    await prisma.leaderboardEntry.create({
      data: {
        nickname: gameSession.user.name,
        country: gameSession.user.country,
        totalTokens: completedSession.totalTokens,
        rank,
        completedAt: completedSession.completedAt!,
      },
    });

    // Get market-specific reward/coordinates
    const reward = getMarketReward(gameSession.user.country);

    return NextResponse.json({
      rank,
      totalTokens: completedSession.totalTokens,
      coordinates: reward.coordinates,
      rewardHint: reward.rewardHint,
      country: reward.country,
    });
  } catch (error) {
    console.error("Game complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete game session." },
      { status: 500 }
    );
  }
}
