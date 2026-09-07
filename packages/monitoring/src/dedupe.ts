export function siteDownKey(monitorId: string, incidentId: string) {
  return `site-down:${monitorId}:${incidentId}`;
}

export function siteRecoveryKey(monitorId: string, incidentId: string) {
  return `site-recovery:${monitorId}:${incidentId}`;
}

export function sslExpiryKey(monitorId: string, threshold: number) {
  return `ssl-expiry:${monitorId}:${threshold}`;
}

export function domainExpiryKey(domainId: string, threshold: number) {
  return `domain-expiry:${domainId}:${threshold}`;
}

export function dnsChangeKey(monitorId: string, snapshotId: string) {
  return `dns-change:${monitorId}:${snapshotId}`;
}

export function nsChangeKey(monitorId: string, snapshotId: string) {
  return `ns-change:${monitorId}:${snapshotId}`;
}

export function testNotificationKey(userId: string, at: number) {
  return `test:${userId}:${at}`;
}
