export type RandomSource = () => number;

export function createCryptoSeed(): number {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required for production match seeding");
  }
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0]!;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
