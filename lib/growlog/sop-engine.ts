/**
 * SOP engine (ADR-006): re-exports shared materialize from `@growlog/domain`.
 * Pure helpers live in `sop-engine-pure.ts` (client-safe).
 */
export {
  canTransitionSopRun,
  computeRunPriority,
  effectiveDueBoundaryIso,
  isRunPastDue,
  normalizeLocalTime,
  sortSopRunsForDailyFocus,
  type SopRunPriorityDb,
} from '@/lib/growlog/sop-engine-pure';

export {
  applySopOverdueForCycle,
  createSopRunFromSourceEvent,
  farmAnchorDateFromOccurredAt,
  farmLocalDateString,
  materializeSopRunsForDay,
  materializeSopRunsForScopeDay,
  refreshSopComplianceForDay,
  type MaterializeResult,
} from '@growlog/domain/growlog/sop-materialize';
