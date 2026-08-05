const durationPattern = /^(\d+)(s|m|h|d)$/;

const unitToMilliseconds = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
} as const;

export function parseDurationToMilliseconds(value: string): number {
  const match = durationPattern.exec(value);

  if (!match) {
    throw new Error(`Invalid duration "${value}". Use a value like 15m, 1h, or 7d.`);
  }

  const amount = Number(match[1] ?? 0);
  const unit = match[2] as keyof typeof unitToMilliseconds;

  if (amount <= 0) {
    throw new Error(`Invalid duration "${value}". Duration must be positive.`);
  }

  return amount * unitToMilliseconds[unit];
}

export function parseDurationToSeconds(value: string): number {
  return Math.floor(parseDurationToMilliseconds(value) / 1000);
}

export function addDuration(date: Date, duration: string): Date {
  return new Date(date.getTime() + parseDurationToMilliseconds(duration));
}
