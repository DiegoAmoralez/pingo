/**
 * Callback payloads must stay under 64 bytes. Every action is a short prefix,
 * optionally followed by ":" and an id / key.
 */
export const CB = {
  menu: 'm',
  sites: 's',
  site: 's:',
  check: 'c:',
  pauseToggle: 'p:',
  deleteAsk: 'd:',
  deleteConfirm: 'dd:',
  incidents: 'i',
  siteIncidents: 'i:',
  add: 'a',
  cancel: 'cancel',
  notifications: 'n',
  notificationToggle: 'n:',
  notificationTest: 'nt',
  plan: 'pl',
  checkout: 'pl:',
  portal: 'portal',
  account: 'ac',
  disconnectAsk: 'x',
  disconnectConfirm: 'xx',
  language: 'l',
  setLanguage: 'l:',
  help: 'h',
  noop: 'noop',
} as const;

export function withId(prefix: string, id: string): string {
  return `${prefix}${id}`;
}

export function idFrom(prefix: string, data: string): string {
  return data.slice(prefix.length);
}
