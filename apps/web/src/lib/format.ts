export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(undefined, options).format(value);
}

export function formatPercent(value: number) {
  return `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
}

export function formatDurationMs(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  if (value >= 1000) {
    return `${formatNumber(value / 1000, { maximumFractionDigits: 2 })} s`;
  }

  return `${formatNumber(value)} ms`;
}

export function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
