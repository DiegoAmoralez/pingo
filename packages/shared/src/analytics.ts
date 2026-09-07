import type { AnalyticsEventName } from './types.js';
import { logger } from './logger.js';

type AnalyticsProvider = {
  track(event: AnalyticsEventName, properties?: Record<string, unknown>, userId?: string): Promise<void>;
};

class NoopAnalytics implements AnalyticsProvider {
  async track() {}
}

class PostHogAnalytics implements AnalyticsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly host: string,
  ) {}

  async track(
    event: AnalyticsEventName,
    properties: Record<string, unknown> = {},
    userId?: string,
  ): Promise<void> {
    try {
      await fetch(`${this.host.replace(/\/$/, '')}/capture/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          event,
          distinct_id: userId ?? 'anonymous',
          properties,
        }),
      });
    } catch (error) {
      logger.warn({ err: error, event }, 'analytics track failed');
    }
  }
}

let provider: AnalyticsProvider | null = null;

export function getAnalytics(): AnalyticsProvider {
  if (provider) return provider;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) {
    provider = new NoopAnalytics();
    return provider;
  }
  provider = new PostHogAnalytics(key, process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com');
  return provider;
}

export async function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
  userId?: string,
) {
  await getAnalytics().track(event, properties, userId);
}
