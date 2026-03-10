export const ROOM_BASE_TOKENS: Record<string, number> = {
  cipher: 1,
  lock: 1,
  coordinates: 1,
  bonus: 1,
};

export const SKIP_PENALTY = -1;

export const TIME_BONUS_THRESHOLDS: Record<string, number> = {
  cipher: 90,       // seconds — bonus if completed under this
  lock: 60,
  coordinates: 120,
  bonus: 45,
};

export function calculateRoomTokens(
  room: string,
  completed: boolean,
  timeSpentSec: number,
  skipped: boolean
): { tokens: number; timeBonus: number } {
  if (skipped) return { tokens: SKIP_PENALTY, timeBonus: 0 };
  if (!completed) return { tokens: 0, timeBonus: 0 };

  const base = ROOM_BASE_TOKENS[room] ?? 1;
  const threshold = TIME_BONUS_THRESHOLDS[room] ?? 90;
  const timeBonus = timeSpentSec < threshold ? 1 : 0;

  return { tokens: base + timeBonus, timeBonus };
}

export function calculateRank(totalTokens: number): string {
  if (totalTokens >= 4) return "elite";
  if (totalTokens >= 3) return "operative";
  return "rookie";
}

export function getRankLabel(rank: string): string {
  switch (rank) {
    case "elite":
      return "Elite Agent";
    case "operative":
      return "Operative";
    default:
      return "Rookie";
  }
}
