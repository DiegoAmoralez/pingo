export type StatusRule = {
  singles: number[];
  ranges: Array<[number, number]>;
};

export function parseExpectedStatusCodes(input: string): StatusRule {
  const singles: number[] = [];
  const ranges: Array<[number, number]> = [];
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const range = part.match(/^(\d{3})\s*-\s*(\d{3})$/);
    if (range) {
      ranges.push([Number(range[1]), Number(range[2])]);
      continue;
    }
    const code = Number(part);
    if (Number.isInteger(code) && code >= 100 && code <= 599) {
      singles.push(code);
    }
  }
  if (singles.length === 0 && ranges.length === 0) {
    return { singles: [], ranges: [[200, 399]] };
  }
  return { singles, ranges };
}

export function isExpectedStatus(status: number, rule: StatusRule): boolean {
  if (rule.singles.includes(status)) return true;
  return rule.ranges.some(([from, to]) => status >= from && status <= to);
}
