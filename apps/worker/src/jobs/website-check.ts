import { prisma } from '@pingo/database';
import {
  applyCheckResult,
  checkHttp,
  siteDownKey,
  siteRecoveryKey,
} from '@pingo/monitoring';
import {
  ERROR_CATEGORY_LABELS,
  childLogger,
  isMockMonitoring,
  type WebsiteCheckJob,
} from '@pingo/shared';
import { queueAlert } from '../services/alerts.js';
import {
  formatDuration,
  formatUtc,
  toAlertLocale,
  websiteDownMessage,
  websiteRecoveredMessage,
} from '@pingo/notifications';

const log = childLogger({ job: 'website-check' });

export async function processWebsiteCheck(data: WebsiteCheckJob) {
  const started = Date.now();
  const monitor = await prisma.monitor.findUnique({
    where: { id: data.monitorId },
    include: { user: { include: { preferences: true, telegram: true } } },
  });
  if (!monitor || monitor.pausedAt) return;
  const locale = toAlertLocale(monitor.user.telegram?.locale);

  const result = isMockMonitoring()
    ? mockHttp(monitor.url)
    : await checkHttp({
        url: monitor.url,
        timeoutSeconds: monitor.timeoutSeconds,
        followRedirects: monitor.followRedirects,
        expectedStatusCodes: monitor.expectedStatusCodes,
      });

  const transition = applyCheckResult(
    { status: monitor.status, consecutiveFailures: monitor.consecutiveFailures },
    result.status,
  );

  await prisma.monitorCheck.create({
    data: {
      monitorId: monitor.id,
      status: result.status,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
      errorType: result.errorType,
      errorMessage: result.errorMessage,
      redirectTarget: result.redirectTarget,
    },
  });

  let openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, status: 'OPEN' },
    orderBy: { startedAt: 'desc' },
  });

  if (transition.incidentStart) {
    const reason =
      result.errorMessage ??
      (result.errorType ? ERROR_CATEGORY_LABELS[result.errorType] : 'Website down');
    openIncident = await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        startedAt: new Date(),
        reason,
        firstFailure: result,
        lastFailure: result,
        status: 'OPEN',
      },
    });
    await prisma.analyticsEvent.create({
      data: { userId: monitor.userId, name: 'incident_started', properties: { monitorId: monitor.id } },
    });
    if (monitor.user.preferences?.websiteDowntime !== false && openIncident) {
      await queueAlert({
        userId: monitor.userId,
        monitorId: monitor.id,
        type: 'WEBSITE_DOWN',
        deduplicationKey: siteDownKey(monitor.id, openIncident.id),
        text: websiteDownMessage({
          hostname: monitor.displayHostname,
          http: result.httpStatus
            ? `${result.httpStatus}${result.errorMessage && !result.errorMessage.startsWith('HTTP') ? ` ${result.errorMessage}` : result.httpStatus === 502 ? ' Bad Gateway' : ''}`
            : (result.errorMessage ?? 'failed'),
          failedChecks: transition.consecutiveFailures,
          startedAt: formatUtc(openIncident.startedAt),
          locale,
        }),
      });
    }
  } else if (openIncident && result.status === 'DOWN') {
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { lastFailure: result },
    });
  }

  if (transition.incidentRecover && openIncident) {
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - openIncident.startedAt.getTime();
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { status: 'RESOLVED', endedAt, durationMs },
    });
    await prisma.analyticsEvent.create({
      data: { userId: monitor.userId, name: 'incident_recovered', properties: { monitorId: monitor.id } },
    });
    if (monitor.user.preferences?.websiteRecovery !== false) {
      await queueAlert({
        userId: monitor.userId,
        monitorId: monitor.id,
        type: 'WEBSITE_RECOVERY',
        deduplicationKey: siteRecoveryKey(monitor.id, openIncident.id),
        text: websiteRecoveredMessage({
          hostname: monitor.displayHostname,
          downtime: formatDuration(durationMs, locale),
          responseMs: result.latencyMs,
          locale,
        }),
      });
    }
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: transition.nextStatus,
      consecutiveFailures: transition.consecutiveFailures,
      lastCheckedAt: new Date(),
      lastSuccessfulAt: result.status === 'UP' ? new Date() : monitor.lastSuccessfulAt,
      currentLatencyMs: result.latencyMs,
      currentHttpStatus: result.httpStatus,
      lastErrorType: result.errorType,
      lastErrorMessage: result.errorMessage,
      nextCheckAt: new Date(Date.now() + monitor.checkIntervalSeconds * 1000),
    },
  });

  log.info({
    monitorId: monitor.id,
    duration: Date.now() - started,
    result: result.status,
    errorCategory: result.errorType,
    latencyMs: result.latencyMs,
  }, 'website check finished');
}

function mockHttp(url: string) {
  if (url.includes('down.') || url.includes('/down')) {
    return {
      status: 'DOWN' as const,
      httpStatus: 502,
      latencyMs: 1200,
      errorType: 'HTTP_ERROR' as const,
      errorMessage: 'HTTP 502',
      redirectTarget: null,
      finalUrl: url,
    };
  }
  return {
    status: 'UP' as const,
    httpStatus: 200,
    latencyMs: 186,
    errorType: null,
    errorMessage: null,
    redirectTarget: null,
    finalUrl: url,
  };
}
