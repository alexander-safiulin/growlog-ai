import { assignmentsEqual, type VpdSourceAssignment } from './vpd';
import {
  smartDefaultVpdSources,
  type ClimateSourceRow,
  type SmartDefaultResult,
  type VpdPersistedSources,
} from './vpd-climate';

/** User-persisted picks plus in-memory auto-fill for empty slots only (never drops saved refs). */
export function effectiveVpdSources(input: {
  persisted: VpdPersistedSources;
  rows: ClimateSourceRow[];
  cycleZoneId: string | null;
}): SmartDefaultResult {
  const emptySlots: VpdPersistedSources = {
    assignment: {
      airTemp: input.persisted.assignment.airTemp,
      leafTemp: input.persisted.assignment.leafTemp,
      rh: input.persisted.assignment.rh,
    },
    leafMode: input.persisted.leafMode,
  };

  const auto = smartDefaultVpdSources({
    rows: input.rows,
    cycleZoneId: input.cycleZoneId,
    saved: {
      assignment: {
        airTemp: emptySlots.assignment.airTemp,
        leafTemp: emptySlots.assignment.leafTemp,
        rh: emptySlots.assignment.rh,
      },
      leafMode: emptySlots.leafMode,
    },
  });

  const autoFilledAir =
    !input.persisted.assignment.airTemp && auto.assignment.airTemp != null;
  const autoFilledRh = !input.persisted.assignment.rh && auto.assignment.rh != null;
  const autoFilledLeaf =
    input.persisted.leafMode === 'none' &&
    !input.persisted.assignment.leafTemp &&
    auto.leafMode !== 'none';

  return {
    assignment: auto.assignment,
    leafMode: auto.leafMode,
    autoSelected: autoFilledAir || autoFilledRh || autoFilledLeaf || auto.autoSelected,
  };
}

export function vpdPersistedEqual(a: VpdPersistedSources, b: VpdPersistedSources): boolean {
  return (
    assignmentsEqual(a.assignment, b.assignment) &&
    a.leafMode === b.leafMode
  );
}

export function hasUserVpdPersistence(persisted: VpdPersistedSources): boolean {
  const { assignment, leafMode } = persisted;
  return (
    leafMode !== 'none' ||
    assignment.airTemp != null ||
    assignment.rh != null ||
    assignment.leafTemp != null
  );
}

export function assignmentFromEffective(
  effective: VpdSourceAssignment,
  leafMode: VpdPersistedSources['leafMode']
): VpdPersistedSources {
  return { assignment: effective, leafMode };
}
