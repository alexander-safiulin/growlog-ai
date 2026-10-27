import type { FarmRole } from '../types/farm';
import type { Farm } from '../types/database';

const INVITE_EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Paste-tolerant invite address: lowercase, no whitespace, unwrapped mailto/Name <email>. */
export function normalizeFarmInviteEmail(email: string): string {
  let value = email.normalize('NFKC');
  value = value.replace(/[\u200B-\u200D\uFEFF\u00A0\s]+/g, '');
  value = value.replace(/[,;:]+$/g, '');
  value = value.replace(/^mailto:/i, '');
  const wrapped = value.match(/<([^<>]+)>$/);
  if (wrapped?.[1]) value = wrapped[1];
  else value = value.replace(/>+$/g, '');
  value = value.replace(/^["']+|["']+$/g, '');
  value = value.toLowerCase();
  const dotted = value.match(/^(.*@[^@]+\.[^@]{2,})\.+$/);
  if (dotted?.[1]) value = dotted[1];
  return value;
}

export function isValidFarmInviteEmail(email: string): boolean {
  if (email.length === 0 || email.length > 254) return false;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) return false;
  const local = email.slice(0, at);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.')) return false;
  const tld = email.slice(email.lastIndexOf('.') + 1);
  if (tld.length < 2 || email.includes('..')) return false;
  return INVITE_EMAIL.test(email);
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
