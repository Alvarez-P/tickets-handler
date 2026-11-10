const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export const durationToSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error(`Duración no válida: ${value}`);
  }
  return Number(match[1]) * UNIT_SECONDS[match[2]];
};
