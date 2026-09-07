import { CONSECUTIVE_FAILURES_FOR_DOWN } from '@pingo/shared';
import type { MonitorStatus } from '@pingo/shared';

export type MonitorRuntimeState = {
  status: MonitorStatus;
  consecutiveFailures: number;
};

export type CheckOutcome = 'UP' | 'DOWN';

export type StateTransition = {
  nextStatus: MonitorStatus;
  consecutiveFailures: number;
  incidentStart: boolean;
  incidentRecover: boolean;
};

export function applyCheckResult(
  state: MonitorRuntimeState,
  outcome: CheckOutcome,
  failuresRequired = CONSECUTIVE_FAILURES_FOR_DOWN,
): StateTransition {
  if (outcome === 'UP') {
    const recovering = state.status === 'DOWN';
    return {
      nextStatus: 'UP',
      consecutiveFailures: 0,
      incidentStart: false,
      incidentRecover: recovering,
    };
  }

  const consecutiveFailures = state.consecutiveFailures + 1;
  if (consecutiveFailures >= failuresRequired) {
    return {
      nextStatus: 'DOWN',
      consecutiveFailures,
      incidentStart: state.status !== 'DOWN',
      incidentRecover: false,
    };
  }

  return {
    nextStatus: state.status === 'DOWN' ? 'DOWN' : state.status === 'UP' ? 'UP' : 'UNKNOWN',
    consecutiveFailures,
    incidentStart: false,
    incidentRecover: false,
  };
}
