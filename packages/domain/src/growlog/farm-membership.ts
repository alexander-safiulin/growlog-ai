import type { FarmRole } from '../types/farm';
import type { Farm } from '../types/database';

export function normalizeFarmInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type FarmMembershipRow = {
  farm_id: string;
  role: FarmRole;
};

/** Default guest-data merge target: oldest farm where the user is admin; never a viewer-only farm. */
export function pickGuestMergeTargetFarmId(
  farms: Farm[],
  memberships: FarmMembershipRow[],
  activeFarmId: string | null,
): string | null {
  const roleByFarm = new Map(memberships.map((m) => [m.farm_id, m.role]));
  const byCreated = (a: Farm, b: Farm) => a.created_at.localeCompare(b.created_at);

  const adminFarms = farms.filter((f) => roleByFarm.get(f.id) === 'admin').sort(byCreated);
  if (adminFarms.length > 0) return adminFarms[0].id;

  if (activeFarmId && roleByFarm.get(activeFarmId) !== 'viewer') {
    return activeFarmId;
  }

  const editable = farms
    .filter((f) => {
      const role = roleByFarm.get(f.id);
      return role && role !== 'viewer';
    })
    .sort(byCreated);
  return editable[0]?.id ?? null;
}

export type AcceptedFarmInvitation = {
  farm_id: string;
  farm_name: string;
  role: FarmRole;
};

export function parseAcceptedInvitations(rows: unknown): AcceptedFarmInvitation[] {
  if (!Array.isArray(rows)) return [];
  const out: AcceptedFarmInvitation[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const farmId = o.farm_id;
    const farmName = o.farm_name;
    const role = o.role;
    if (typeof farmId !== 'string' || typeof farmName !== 'string') continue;
    if (role !== 'grower' && role !== 'manager' && role !== 'admin' && role !== 'viewer') continue;
    out.push({ farm_id: farmId, farm_name: farmName, role });
  }
  return out;
}
