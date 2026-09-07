import { DOMAIN_ALERT_THRESHOLDS, SSL_ALERT_THRESHOLDS } from '@pingo/shared';

export function sslAlertThreshold(daysRemaining: number | null): number | null {
  if (daysRemaining == null) return null;
  let matched: number | null = null;
  for (const threshold of SSL_ALERT_THRESHOLDS) {
    if (daysRemaining <= threshold) matched = threshold;
  }
  return matched;
}

export function domainAlertThreshold(daysRemaining: number | null): number | null {
  if (daysRemaining == null) return null;
  if (daysRemaining < 0) return 1;
  let matched: number | null = null;
  for (const threshold of DOMAIN_ALERT_THRESHOLDS) {
    if (daysRemaining <= threshold) matched = threshold;
  }
  return matched;
}

export function shouldEmitThresholdAlert(
  lastAlertThreshold: number | null | undefined,
  nextThreshold: number | null,
): nextThreshold is number {
  if (nextThreshold == null) return false;
  if (lastAlertThreshold == null) return true;
  return nextThreshold < lastAlertThreshold;
}
