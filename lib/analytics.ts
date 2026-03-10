"use client";

type EventProperties = Record<string, string | number | boolean>;

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("analytics-consent") === "true";
  } catch {
    return false;
  }
}

export function grantConsent() {
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics-consent", "true");
  }
}

export function revokeConsent() {
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics-consent", "false");
  }
}

function fireGA4(name: string, properties: EventProperties) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (w.gtag) {
    w.gtag("event", name, properties);
  }
}

function fireMeta(name: string, properties: EventProperties) {
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (w.fbq) {
    w.fbq("trackCustom", name, properties);
  }
}

function fireTikTok(name: string, properties: EventProperties) {
  const w = window as unknown as { ttq?: { track: (...args: unknown[]) => void } };
  if (w.ttq?.track) {
    w.ttq.track(name, properties);
  }
}

export function trackEvent(name: string, properties: EventProperties = {}) {
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;

  fireGA4(name, properties);
  fireMeta(name, properties);
  fireTikTok(name, properties);
}

export function trackPageView(path: string) {
  trackEvent("page_view", { page_path: path });
}

// Predefined events
export const Events = {
  missionAccepted: () => trackEvent("mission_accepted"),
  registrationComplete: () => trackEvent("registration_complete"),
  gameStarted: () => trackEvent("game_started"),
  roomEntered: (room: string) => trackEvent("room_entered", { room }),
  roomCompleted: (room: string, time: number, tokens: number) =>
    trackEvent("room_completed", { room, time_spent: time, tokens_earned: tokens }),
  intelTokenEarned: (room: string) => trackEvent("intel_token_earned", { room }),
  missionRank: (rank: string) => trackEvent(`mission_rank_${rank}`),
  shareClicked: (platform: string) => trackEvent("share_clicked", { platform }),
  leaderboardViewed: () => trackEvent("leaderboard_viewed"),
};
