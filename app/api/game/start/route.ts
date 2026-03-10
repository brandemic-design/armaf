import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionFromCookie,
  signToken,
  createTokenCookieHeader,
} from "@/lib/auth";

/**
 * Generate a random Caesar-style cipher mapping.
 * Returns an object with the shift amount and the encoded phrase.
 */
function generateCipherPuzzle() {
  const phrases = [
    "ARMAF UNLOCKS THE VAULT",
    "DECODE THE HIDDEN SIGNAL",
    "THE MISSION IS UNDERWAY",
    "TRUST NO ONE BUT YOURSELF",
    "INTELLIGENCE IS THE WEAPON",
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const shift = Math.floor(Math.random() * 20) + 3; // shift between 3-22

  const encoded = phrase
    .split("")
    .map((char) => {
      if (char >= "A" && char <= "Z") {
        return String.fromCharCode(
          ((char.charCodeAt(0) - 65 + shift) % 26) + 65
        );
      }
      return char; // spaces and punctuation stay
    })
    .join("");

  return {
    encoded,
    shift,
    answer: phrase,
  };
}

/**
 * Generate a random lock pattern (sequence of directional inputs).
 */
function generateLockPuzzle() {
  const directions = ["up", "right", "down", "left"] as const;
  const length = Math.floor(Math.random() * 3) + 4; // 4-6 steps
  const pattern: string[] = [];

  for (let i = 0; i < length; i++) {
    pattern.push(directions[Math.floor(Math.random() * directions.length)]);
  }

  return {
    pattern,
    // Hints are provided as partial reveals, e.g. first and last
    hints: [pattern[0], pattern[pattern.length - 1]],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please register first." },
        { status: 401 }
      );
    }

    const puzzleState = {
      cipher: generateCipherPuzzle(),
      lock: generateLockPuzzle(),
    };

    const gameSession = await prisma.gameSession.create({
      data: {
        userId: session.userId,
        puzzleState: puzzleState as object,
      },
    });

    // Update JWT to include sessionId
    const newToken = signToken({
      userId: session.userId,
      sessionId: gameSession.id,
    });

    const response = NextResponse.json({
      success: true,
      sessionId: gameSession.id,
      puzzle: {
        cipher: {
          encoded: puzzleState.cipher.encoded,
          shift: puzzleState.cipher.shift,
        },
        lock: {
          hints: puzzleState.lock.hints,
          length: puzzleState.lock.pattern.length,
        },
      },
    });

    response.headers.set("Set-Cookie", createTokenCookieHeader(newToken));
    return response;
  } catch (error) {
    console.error("Game start error:", error);
    return NextResponse.json(
      { error: "Failed to start game session." },
      { status: 500 }
    );
  }
}
