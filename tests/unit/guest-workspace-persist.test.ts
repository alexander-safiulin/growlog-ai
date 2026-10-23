import { describe, expect, it } from 'vitest';
import {
  buildGuestWorkspaceSession,
  guestWorkspaceSessionsEqual,
  serializeGuestWorkspaceSession,
} from '@/lib/nutrient/guest/guest-workspace-session';

describe('guest workspace persist helpers', () => {
  it('detects equal sessions to avoid redundant writes', () => {
    const a = buildGuestWorkspaceSession({
      selectedIds: ['a', 'b'],
      profileSlug: 'veg',
      activeSystemId: 'sys-1',
      activeStepId: 'step-1',
      activeWaterProfileId: 'w-1',
      activeFeedScheduleId: '',
      volumeL: 10,
      tankMode: 'single',
      model: 'canonical',
      stockFactor: 1,
    });
    const b = { ...a, selectedIds: ['a', 'b'] };
    expect(guestWorkspaceSessionsEqual(a, b)).toBe(true);
    expect(serializeGuestWorkspaceSession(a)).toBe(serializeGuestWorkspaceSession(b));
  });

  it('detects when workspace changed', () => {
    const a = buildGuestWorkspaceSession({
      selectedIds: ['a'],
      profileSlug: 'veg',
      activeSystemId: '',
      activeStepId: '',
      activeWaterProfileId: '',
      activeFeedScheduleId: '',
      volumeL: 10,
      tankMode: 'single',
      model: 'canonical',
      stockFactor: 1,
    });
    const c = buildGuestWorkspaceSession({
      ...a,
      selectedIds: ['a', 'c'],
    });
    expect(guestWorkspaceSessionsEqual(a, c)).toBe(false);
  });

  it('regression: stable serialization prevents autosave loops', () => {
    const session = buildGuestWorkspaceSession({
      selectedIds: [],
      profileSlug: 'veg',
      activeSystemId: '',
      activeStepId: '',
      activeWaterProfileId: '',
      activeFeedScheduleId: '',
      volumeL: 10,
      tankMode: 'single',
      model: 'canonical',
      stockFactor: 1,
    });
    const round1 = serializeGuestWorkspaceSession(session);
    const round2 = serializeGuestWorkspaceSession({ ...session });
    expect(round1).toBe(round2);
  });
});
