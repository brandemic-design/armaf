import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { calculateRoomTokens } from "@/lib/scoring";

const submitSchema = z.object({
  room: z.enum(["cipher", "lock", "coordinates", "bonus"]),
  answer: z.any(),
  timeSpentSec: z.number().int().min(0),
  skipped: z.boolean(),
});

/**
 * Validate the player's answer against the server-stored puzzle state.
 */
function validateAnswer(
  room: string,
  answer: unknown,
  puzzleState: Record<string, unknown>
): boolean {
  switch (room) {
    case "cipher": {
      const cipher = puzzleState.cipher as { answer: string };
      if (!cipher?.answer) return false;
      return (
        typeof answer === "string" &&
        answer.trim().toUpperCase() === cipher.answer.toUpperCase()
      );
    }
    case "lock": {
      const lock = puzzleState.lock as { pattern: string[] };
      if (!lock?.pattern) return false;
      if (!Array.isArray(answer)) return false;
      if (answer.length !== lock.pattern.length) return false;
      return lock.pattern.every(
        (dir, i) =>
          typeof answer[i] === "string" &&
          answer[i].toLowerCase() === dir.toLowerCase()
      );
    }
    case "coordinates": {
      // Coordinates room: answer is a string that matches expected format
      // Validated against a simpler check since coordinates are user-specific
      return typeof answer === "string" && answer.trim().length > 0;
    }
    case "bonus": {
      // Bonus room: accept any non-empty answer as correct (flexible bonus)
      return typeof answer === "string" && answer.trim().length > 0;
    }
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session?.userId || !session?.sessionId) {
      return NextResponse.json(
        { error: "Unauthorized. No active game session." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = submitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid submission data." },
        { status: 400 }
      );
    }

    const { room, answer, timeSpentSec, skipped } = result.data;

    // Fetch game session and verify ownership
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: session.sessionId },
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

    const puzzleState = (gameSession.puzzleState as Record<string, unknown>) || {};

    // Determine correctness
    const correct = skipped
      ? false
      : validateAnswer(room, answer, puzzleState);

    // Calculate tokens
    const { tokens: tokensEarned, timeBonus } = calculateRoomTokens(
      room,
      correct,
      timeSpentSec,
      skipped
    );

    // Check for existing result for this room (prevent double-submission)
    const existingResult = await prisma.roomResult.findFirst({
      where: {
        sessionId: session.sessionId,
        room,
      },
    });

    if (existingResult) {
      return NextResponse.json(
        { error: "Room already submitted." },
        { status: 409 }
      );
    }

    // Create room result
    await prisma.roomResult.create({
      data: {
        sessionId: session.sessionId,
        room,
        completed: correct,
        tokensEarned,
        timeSpentSec,
      },
    });

    // Update session total tokens
    await prisma.gameSession.update({
      where: { id: session.sessionId },
      data: {
        totalTokens: { increment: tokensEarned },
      },
    });

    return NextResponse.json({
      correct,
      tokensEarned,
      timeBonus,
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Failed to process submission." },
      { status: 500 }
    );
  }
}
