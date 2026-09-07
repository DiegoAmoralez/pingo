import { RdapDomainProvider, type DomainInformation, type DomainInformationProvider } from './rdap.js';

let provider: DomainInformationProvider = new RdapDomainProvider();

export function setDomainInformationProvider(next: DomainInformationProvider) {
  provider = next;
}

export function getDomainInformationProvider(): DomainInformationProvider {
  return provider;
}

export async function lookupDomain(domain: string): Promise<DomainInformation | null> {
  return provider.lookup(domain);
}

export type { DomainInformation, DomainInformationProvider };
