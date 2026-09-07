import { Resolver } from 'node:dns/promises';
import type { DnsChange, DnsRecords } from '@pingo/shared';
import { toAsciiHostname } from './url.js';

const EMPTY: DnsRecords = { A: [], AAAA: [], CNAME: [], MX: [], NS: [], TXT: [] };

export async function lookupDns(hostname: string): Promise<DnsRecords> {
  const ascii = toAsciiHostname(hostname);
  const resolver = new Resolver();
  const records: DnsRecords = { ...EMPTY, A: [], AAAA: [], CNAME: [], MX: [], NS: [], TXT: [] };

  const tasks: Array<Promise<void>> = [
    resolveSafe(resolver.resolve4(ascii), (values) => {
      records.A = values.slice().sort();
    }),
    resolveSafe(resolver.resolve6(ascii), (values) => {
      records.AAAA = values.slice().sort();
    }),
    resolveSafe(resolver.resolveCname(ascii), (values) => {
      records.CNAME = values.map((v) => v.toLowerCase()).sort();
    }),
    resolveSafe(resolver.resolveMx(ascii), (values) => {
      records.MX = values.map((v) => `${v.priority} ${v.exchange.toLowerCase()}`).sort();
    }),
    resolveSafe(resolver.resolveNs(ascii), (values) => {
      records.NS = values.map((v) => v.toLowerCase()).sort();
    }),
    resolveSafe(resolver.resolveTxt(ascii), (values) => {
      records.TXT = values.map((chunks) => chunks.join('')).sort();
    }),
  ];

  await Promise.all(tasks);
  return records;
}

export function diffDns(previous: DnsRecords, next: DnsRecords): DnsChange[] {
  const types: Array<keyof DnsRecords> = ['A', 'AAAA', 'CNAME', 'MX', 'NS'];
  const changes: DnsChange[] = [];
  for (const type of types) {
    const oldValues = [...(previous[type] ?? [])].sort();
    const newValues = [...(next[type] ?? [])].sort();
    if (oldValues.join('|') !== newValues.join('|')) {
      changes.push({ type, oldValues, newValues });
    }
  }
  return changes;
}

async function resolveSafe<T>(promise: Promise<T>, assign: (value: T) => void): Promise<void> {
  try {
    assign(await promise);
  } catch {
    // ENODATA / ENOTFOUND is a valid empty set for that record type
  }
}
