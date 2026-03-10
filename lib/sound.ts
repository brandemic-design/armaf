"use client";

import { Howl } from "howler";

const sounds: Record<string, Howl> = {};

function getOrCreate(name: string, src: string, options?: Partial<{ loop: boolean; volume: number }>): Howl {
  if (!sounds[name]) {
    sounds[name] = new Howl({
      src: [src],
      loop: options?.loop ?? false,
      volume: options?.volume ?? 0.5,
      preload: true,
    });
  }
  return sounds[name];
}

export const SoundManager = {
  ambientHum() {
    return getOrCreate("ambient", "/sounds/ambient-hum.mp3", { loop: true, volume: 0.15 });
  },
  click() {
    return getOrCreate("click", "/sounds/click.mp3", { volume: 0.4 });
  },
  success() {
    return getOrCreate("success", "/sounds/success.mp3", { volume: 0.5 });
  },
  error() {
    return getOrCreate("error", "/sounds/error.mp3", { volume: 0.3 });
  },
  classified() {
    return getOrCreate("classified", "/sounds/classified.mp3", { volume: 0.5 });
  },
  lockOpen() {
    return getOrCreate("lockOpen", "/sounds/lock-open.mp3", { volume: 0.5 });
  },
  tokenEarned() {
    return getOrCreate("tokenEarned", "/sounds/token-earned.mp3", { volume: 0.6 });
  },
  stopAll() {
    Object.values(sounds).forEach((s) => s.stop());
  },
};
