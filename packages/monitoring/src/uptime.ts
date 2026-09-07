export function calculateUptimePercent(params: {
  upCount: number;
  downCount: number;
}): number | null {
  const total = params.upCount + params.downCount;
  if (total === 0) return null;
  return Math.round((params.upCount / total) * 10000) / 100;
}

export function formatUptime(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}%`;
}
