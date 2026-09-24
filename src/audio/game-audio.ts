import { AUDIO_ASSETS } from "../assets/game-assets";

export type GameSound =
  | "card"
  | "take"
  | "pass"
  | "win"
  | "loss"
  | "timeout"
  | "ui";

const volumes: Readonly<Record<GameSound, number>> = {
  card: 0.17,
  take: 0.19,
  pass: 0.11,
  win: 0.46,
  loss: 0.42,
  timeout: 0.44,
  ui: 0.24
};

const channelCounts: Readonly<Record<GameSound, number>> = {
  card: 3,
  take: 2,
  pass: 1,
  win: 1,
  loss: 1,
  timeout: 1,
  ui: 2
};

type AudioPool = {
  channels: HTMLAudioElement[];
  cursor: number;
};

let enabled = true;
let context: AudioContext | null = null;
const audioPools = new Map<GameSound, AudioPool>();
const noiseBuffers = new Map<string, AudioBuffer>();

export function isGameAudioEnabled(): boolean {
  return enabled;
}

function canUseHtmlAudio(): boolean {
  if (typeof Audio === "undefined") return false;
  if (typeof navigator === "undefined") return true;
  return !/jsdom/i.test(navigator.userAgent);
}

function audioPool(sound: GameSound): AudioPool | null {
  if (!canUseHtmlAudio()) return null;

  const existing = audioPools.get(sound);
  if (existing) return existing;

  try {
    const channels = Array.from(
      { length: channelCounts[sound] },
      () => {
        const audio = new Audio(AUDIO_ASSETS[sound]);
        audio.preload = "auto";
        audio.volume = volumes[sound];
        return audio;
      }
    );
    const pool = { channels, cursor: 0 };
    audioPools.set(sound, pool);
    return pool;
  } catch {
    return null;
  }
}

function stopHtmlAudio(): void {
  for (const pool of audioPools.values()) {
    for (const audio of pool.channels) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Browser audio can disappear while the page is being suspended.
      }
    }
  }
}

export function setGameAudioEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    stopHtmlAudio();
    if (context?.state === "running") {
      void context.suspend().catch(() => undefined);
    }
  }
}

function playAsset(sound: GameSound): boolean {
  const pool = audioPool(sound);
  if (!pool || pool.channels.length === 0) return false;

  const audio = pool.channels[pool.cursor % pool.channels.length]!;
  pool.cursor = (pool.cursor + 1) % pool.channels.length;

  try {
    audio.pause();
    audio.currentTime =
      sound === "card" || sound === "take" ? 0.008 : 0;
    audio.volume = volumes[sound];
    audio.playbackRate =
      sound === "card" || sound === "take"
        ? 0.94 + Math.random() * 0.09
        : 1;

    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      void playback.catch(() => {
        playFallback(sound);
      });
    }
    return true;
  } catch {
    return false;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
  if (!AudioCtor) return null;

  context ??= new AudioCtor();
  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
  return context;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  delay = 0
): void {
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noiseBurst(
  ctx: AudioContext,
  options: Readonly<{
    duration: number;
    volume: number;
    frequency: number;
    q?: number;
    delay?: number;
    playbackRate?: number;
  }>
): void {
  const delay = options.delay ?? 0;
  const start = ctx.currentTime + delay;
  const key = `${ctx.sampleRate}:${Math.round(options.duration * 1000)}`;
  let buffer = noiseBuffers.get(key);
  if (!buffer) {
    const frameCount = Math.max(
      1,
      Math.floor(ctx.sampleRate * options.duration)
    );
    buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Build the paper texture once, then reuse it for every card action.
    let previous = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.72 + white * 0.28;
      data[index] = previous;
    }
    noiseBuffers.set(key, buffer);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = buffer;
  source.playbackRate.value = options.playbackRate ?? 1;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(options.frequency, start);
  filter.Q.setValueAtTime(options.q ?? 0.7, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(
    options.volume,
    start + 0.012
  );
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, options.volume * 0.35),
    start + Math.min(options.duration * 0.55, 0.055)
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + options.duration
  );

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + options.duration + 0.025);
}

function playCardTableSound(sound: "card" | "take" | "pass"): boolean {
  if (!enabled) return false;
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return false;

  try {
    const variation = 0.92 + Math.random() * 0.16;

    if (sound === "card") {
      noiseBurst(ctx, {
        duration: 0.095,
        volume: 0.034,
        frequency: 760 + Math.random() * 180,
        q: 0.55,
        playbackRate: variation
      });
      noiseBurst(ctx, {
        duration: 0.06,
        volume: 0.012,
        frequency: 330,
        q: 0.8,
        delay: 0.008,
        playbackRate: variation
      });
      return true;
    }

    if (sound === "take") {
      noiseBurst(ctx, {
        duration: 0.13,
        volume: 0.028,
        frequency: 560,
        q: 0.5,
        playbackRate: variation
      });
      noiseBurst(ctx, {
        duration: 0.11,
        volume: 0.019,
        frequency: 690,
        q: 0.55,
        delay: 0.055,
        playbackRate: 0.96 + Math.random() * 0.1
      });
      noiseBurst(ctx, {
        duration: 0.09,
        volume: 0.015,
        frequency: 820,
        q: 0.6,
        delay: 0.105,
        playbackRate: 0.96 + Math.random() * 0.1
      });
      return true;
    }

    noiseBurst(ctx, {
      duration: 0.07,
      volume: 0.011,
      frequency: 620,
      q: 0.5,
      playbackRate: variation
    });
    return true;
  } catch {
    return false;
  }
}

function playFallback(sound: GameSound): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    switch (sound) {
      case "card":
      case "take":
      case "pass":
        if (playCardTableSound(sound)) return;
        break;
      case "win":
        tone(ctx, 392, 0.13, 0.022, "sine");
        tone(ctx, 494, 0.14, 0.022, "sine", 0.09);
        tone(ctx, 659, 0.2, 0.026, "sine", 0.18);
        break;
      case "loss":
        tone(ctx, 294, 0.13, 0.02, "triangle");
        tone(ctx, 220, 0.18, 0.018, "triangle", 0.1);
        break;
      case "timeout":
        tone(ctx, 210, 0.12, 0.025, "triangle");
        tone(ctx, 170, 0.16, 0.022, "triangle", 0.11);
        break;
      case "ui":
        tone(ctx, 420, 0.035, 0.009, "sine");
        break;
    }
  } catch {
    // Audio is best-effort in embedded/mobile browsers.
  }
}

export function primeGameAudio(): void {
  if (!enabled) return;

  // Pre-create the small HTML audio pools while the game is idle so the
  // first card action does not pay the media element setup cost.
  audioPool("card");
  audioPool("take");
  audioPool("pass");

  const ctx = getContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
}

export function playGameSound(sound: GameSound): void {
  if (!enabled) return;

  // Gameplay actions use a generated paper/felt sound so rapid card play
  // stays soft and natural even on phone speakers.
  if (
    (sound === "card" || sound === "take" || sound === "pass") &&
    playCardTableSound(sound)
  ) {
    return;
  }

  if (!playAsset(sound)) {
    playFallback(sound);
  }
}

export function pauseGameAudio(): void {
  stopHtmlAudio();

  if (context?.state === "running") {
    void context.suspend().catch(() => undefined);
  }
}

export const gameAudioPauseService = {
  pauseAll: pauseGameAudio
} as const;
