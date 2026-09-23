const BLOCKED_PATTERNS = [
  /х(?:у|y)[йиеё]/iu,
  /п[иi]зд/iu,
  /[еёe]б(?:а|о|у|л|н|т)/iu,
  /бл(?:я|иа)[дт]/iu,
  /п[иi]д(?:о|а)р/iu,
  /гандон/iu,
  /fuck/iu,
  /shit/iu,
  /bitch/iu,
  /cunt/iu
] as const;

export function nicknameModerationKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll("0", "o")
    .replaceAll("1", "i");
}

export function isBlockedNickname(value: string): boolean {
  const key = nicknameModerationKey(value);
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(key));
}
