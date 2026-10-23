import type { GuestWorkspaceSession } from '@growlog/domain';

export function buildGuestWorkspaceSession(fields: {
  selectedIds: string[];
  profileSlug: string;
  activeSystemId: string;
  activeStepId: string;
  activeWaterProfileId: string;
  activeFeedScheduleId: string;
  volumeL: number;
  tankMode: 'single' | 'ab';
  model: 'canonical' | 'hydroodo_legacy';
  stockFactor: number;
}): GuestWorkspaceSession {
  return {
    selectedIds: fields.selectedIds,
    profileSlug: fields.profileSlug,
    activeSystemId: fields.activeSystemId,
    activeStepId: fields.activeStepId,
    activeWaterProfileId: fields.activeWaterProfileId,
    activeFeedScheduleId: fields.activeFeedScheduleId,
    volumeL: fields.volumeL,
    tankMode: fields.tankMode,
    model: fields.model,
    stockFactor: fields.stockFactor,
  };
}

export function serializeGuestWorkspaceSession(
  session: GuestWorkspaceSession | undefined,
): string {
  if (!session) return '';
  return JSON.stringify(session);
}

export function guestWorkspaceSessionsEqual(
  a: GuestWorkspaceSession | undefined,
  b: GuestWorkspaceSession | undefined,
): boolean {
  return serializeGuestWorkspaceSession(a) === serializeGuestWorkspaceSession(b);
}
