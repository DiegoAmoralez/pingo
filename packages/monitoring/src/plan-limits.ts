import { getPlan, PlanLimitError, type PlanCode } from '@pingo/shared';

export function assertCanCreateMonitor(params: {
  plan: PlanCode;
  activeMonitorCount: number;
}) {
  const plan = getPlan(params.plan);
  if (params.activeMonitorCount >= plan.maxMonitors) {
    throw new PlanLimitError(`You've reached your ${plan.name} plan limit.`, {
      plan: plan.code,
      maxMonitors: plan.maxMonitors,
    });
  }
}

export function clampCheckInterval(plan: PlanCode, requested?: number): number {
  const definition = getPlan(plan);
  const value = requested ?? definition.minCheckIntervalSeconds;
  return Math.max(value, definition.minCheckIntervalSeconds);
}

export function historyRetentionDays(plan: PlanCode): number {
  return getPlan(plan).historyDays;
}

export function monitorsToPauseCount(plan: PlanCode, activeCount: number): number {
  const allowed = getPlan(plan).maxMonitors;
  return Math.max(0, activeCount - allowed);
}
