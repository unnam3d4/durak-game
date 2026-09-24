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
  card: 0.72,
  take: 0.68,
  pass: 0.55,
  win: 0.66,
  loss: 0.62,
  timeout: 0.68,
  ui: 0.48
};

let enabled = true;
let context: AudioContext | null = null;
const audioPrototypes = new Map<GameSound, HTMLAudioElement>();
const activeAudio = new Set<HTMLAudioElement>();

export function isGameAudioEnabled(): boolean {
  return enabled;
}

export function setGameAudioEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    for (const audio of activeAudio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Browser audio can disappear while the page is being suspended.
      }
    }
    activeAudio.clear();
    if (context?.state === "running") {
      void context.suspend().catch(() => undefined);
    }
  }
}

function playAsset(sound: GameSound): boolean {
  if (typeof Audio === "undefined") return false;

  try {
    let prototype = audioPrototypes.get(sound);
    if (!prototype) {
      prototype = new Audio(AUDIO_ASSETS[sound]);
      prototype.preload = "auto";
      audioPrototypes.set(sound, prototype);
    }

    const audio = prototype.cloneNode(true) as HTMLAudioElement;
    audio.volume = volumes[sound];
    activeAudio.add(audio);

    const clear = () => activeAudio.delete(audio);
    audio.addEventListener("ended", clear, { once: true });
    audio.addEventListener("error", clear, { once: true });

    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      void playback.catch(() => {
        clear();
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
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playFallback(sound: GameSound): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    switch (sound) {
      case "card":
        tone(ctx, 260, 0.055, 0.045, "triangle");
        tone(ctx, 390, 0.035, 0.018, "sine", 0.018);
        break;
      case "take":
        tone(ctx, 170, 0.11, 0.04, "triangle");
        tone(ctx, 125, 0.12, 0.025, "sine", 0.035);
        break;
      case "pass":
        tone(ctx, 310, 0.06, 0.026, "sine");
        break;
      case "win":
        tone(ctx, 392, 0.13, 0.035, "sine");
        tone(ctx, 494, 0.14, 0.035, "sine", 0.09);
        tone(ctx, 659, 0.2, 0.04, "sine", 0.18);
        break;
      case "loss":
        tone(ctx, 294, 0.13, 0.032, "triangle");
        tone(ctx, 220, 0.18, 0.03, "triangle", 0.1);
        break;
      case "timeout":
        tone(ctx, 210, 0.12, 0.04, "square");
        tone(ctx, 170, 0.16, 0.035, "square", 0.11);
        break;
      case "ui":
        tone(ctx, 440, 0.04, 0.018, "sine");
        break;
    }
  } catch {
    // Audio is best-effort in embedded/mobile browsers.
  }
}

export function playGameSound(sound: GameSound): void {
  if (!enabled) return;
  if (!playAsset(sound)) {
    playFallback(sound);
  }
}

export function pauseGameAudio(): void {
  for (const audio of activeAudio) {
    try {
      audio.pause();
    } catch {
      // Ignore audio teardown races in embedded browsers.
    }
  }
  activeAudio.clear();

  if (context?.state === "running") {
    void context.suspend().catch(() => undefined);
  }
}

export const gameAudioPauseService = {
  pauseAll: pauseGameAudio
} as const;
