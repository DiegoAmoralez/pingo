export type DomainInformation = {
  domain: string;
  registrar: string | null;
  registeredAt: Date | null;
  expiresAt: Date | null;
  updatedAtRegistry: Date | null;
  status: string | null;
  nameservers: string[];
  source: string | null;
};

export interface DomainInformationProvider {
  lookup(domain: string): Promise<DomainInformation | null>;
}

type RdapBootstrap = {
  services: Array<[string[], string[]]>;
};

let bootstrapCache: { fetchedAt: number; data: RdapBootstrap } | null = null;
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;

export class RdapDomainProvider implements DomainInformationProvider {
  async lookup(domain: string): Promise<DomainInformation | null> {
    try {
      const servers = await this.serversFor(domain);
      for (const server of servers) {
        const url = `${server.replace(/\/$/, '')}/domain/${encodeURIComponent(domain)}`;
        const response = await fetch(url, {
          headers: { accept: 'application/rdap+json, application/json' },
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) continue;
        const json = (await response.json()) as RdapResponse;
        return mapRdap(domain, json, url);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async serversFor(domain: string): Promise<string[]> {
    const labels = domain.toLowerCase().split('.');
    const tld = labels.at(-1) ?? domain;
    const bootstrap = await loadBootstrap();
    const matches: string[] = [];
    for (const [tlds, urls] of bootstrap.services) {
      if (tlds.includes(`.${tld}`) || tlds.includes(tld) || tlds.includes(domain)) {
        matches.push(...urls);
      }
    }
    if (matches.length === 0) {
      matches.push('https://rdap.org');
    }
    return [...new Set(matches)];
  }
}

async function loadBootstrap(): Promise<RdapBootstrap> {
  if (bootstrapCache && Date.now() - bootstrapCache.fetchedAt < BOOTSTRAP_TTL_MS) {
    return bootstrapCache.data;
  }
  const response = await fetch('https://data.iana.org/rdap/dns.json', {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    return bootstrapCache?.data ?? { services: [] };
  }
  const data = (await response.json()) as RdapBootstrap;
  bootstrapCache = { fetchedAt: Date.now(), data };
  return data;
}

type RdapResponse = {
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  nameservers?: Array<{ ldhName?: string }>;
  events?: Array<{ eventAction?: string; eventDate?: string }>;
  entities?: Array<{
    roles?: string[];
    vcardArray?: unknown;
    entities?: RdapResponse['entities'];
  }>;
  secureDNS?: unknown;
};

function mapRdap(domain: string, json: RdapResponse, source: string): DomainInformation {
  const events = json.events ?? [];
  const expiresAt = dateFor(events, ['expiration', 'expire']);
  const registeredAt = dateFor(events, ['registration']);
  const updatedAtRegistry = dateFor(events, ['last changed', 'last update of rdap database']);
  const nameservers = (json.nameservers ?? [])
    .map((ns) => ns.ldhName?.toLowerCase().replace(/\.$/, ''))
    .filter((v): v is string => Boolean(v));

  return {
    domain,
    registrar: findRegistrar(json.entities ?? []),
    registeredAt,
    expiresAt,
    updatedAtRegistry,
    status: (json.status ?? []).join(', ') || null,
    nameservers,
    source,
  };
}

function dateFor(events: Array<{ eventAction?: string; eventDate?: string }>, actions: string[]): Date | null {
  const event = events.find((item) => actions.includes((item.eventAction ?? '').toLowerCase()));
  if (!event?.eventDate) return null;
  const date = new Date(event.eventDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function findRegistrar(
  entities: Array<{ roles?: string[]; vcardArray?: unknown; entities?: unknown }>,
): string | null {
  for (const entity of entities) {
    if (entity.roles?.includes('registrar')) {
      const name = vcardFn(entity.vcardArray);
      if (name) return name;
    }
    if (Array.isArray(entity.entities)) {
      const nested = findRegistrar(entity.entities as typeof entities);
      if (nested) return nested;
    }
  }
  return null;
}

function vcardFn(vcardArray: unknown): string | null {
  if (!Array.isArray(vcardArray) || vcardArray[1] == null) return null;
  const rows = vcardArray[1];
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (Array.isArray(row) && row[0] === 'fn' && typeof row[3] === 'string') {
      return row[3];
    }
  }
  return null;
}

export function daysUntil(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}
