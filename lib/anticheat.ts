import { prisma } from "./db";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_STARTS_PER_HOUR = 3;
const MIN_COMPLETION_TIME_SEC = 30;

export async function checkRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      sessions: {
        where: { startedAt: { gte: windowStart } },
      },
    },
  });

  if (!user) return true; // new user, allow
  return user.sessions.length < MAX_STARTS_PER_HOUR;
}

export function isSuspiciouslyFast(timeSpentSec: number): boolean {
  return timeSpentSec < MIN_COMPLETION_TIME_SEC;
}

export function validateCipherAnswer(
  answer: string,
  puzzleState: { target: string }
): boolean {
  return answer.toUpperCase().trim() === puzzleState.target.toUpperCase().trim();
}

export function validateLockAnswer(
  answer: number[],
  puzzleState: { pattern: number[] }
): boolean {
  if (answer.length !== puzzleState.pattern.length) return false;
  return answer.every((v, i) => v === puzzleState.pattern[i]);
}

export function generateRewardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ARM-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += "-";
  }
  return code;
}

export function isHoneypotFilled(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0;
}
