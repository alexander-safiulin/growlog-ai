/** farm_users.role (ADR-009) */
export const FARM_ROLES = ['grower', 'manager', 'admin', 'viewer'] as const;
export type FarmRole = (typeof FARM_ROLES)[number];

export type FarmMemberRow = {
  user_id: string;
  display_name: string | null;
  role: FarmRole;
  email: string | null;
  created_at: string;
};

export type FarmInvitationRow = {
  id: string;
  email_normalized: string;
  role: FarmRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
