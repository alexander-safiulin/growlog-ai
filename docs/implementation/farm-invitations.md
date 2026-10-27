# Farm invitations by email

Migration: `supabase/migrations/20261026130000_farm_invitations.sql`.

## Flow

1. Farm **admin** creates a pending row in `farm_invitations` via `create_farm_invitation` (normalized email, role, 30-day expiry).
2. No email is sent yet; the admin shares the login URL verbally.
3. On web/mobile session restore, `accept_pending_invitations_for_current_user` runs before the farm list loads. It matches `auth.users.email` when `email_confirmed_at` is set.
4. Acceptance inserts `farm_users` (`ON CONFLICT DO NOTHING` so roles are never downgraded) and marks the invite accepted.
5. A dismissible banner announces the new farm; active farm is **not** auto-switched.

## Roles

| Role | Members / invites UI | Invite / revoke | Change roles / remove others |
|------|----------------------|-----------------|------------------------------|
| admin | yes | yes | yes |
| manager | list only | no | no |
| grower | no | no | no |
| viewer | no | no | no |

Viewer write restrictions remain UI-only (see ADR-009).

## Last admin

`farm_users_enforce_mutations` raises `last_admin` when an authenticated user would demote or remove the sole admin of a non-deleted farm. Cascades from farm or user deletion are allowed when `auth.uid()` is null.

## Client

- Domain: `packages/domain/src/growlog/farm-membership.ts`, mutations/queries in `mutations.ts` / `queries.ts`.
- The members screen reads the roster and the current role from `farm_users`. `list_farm_members` only fills in emails. A failed directory call must not hide the invite form or the roster.
- Guest nutrient merge targets the user's oldest **admin** farm via `pickGuestMergeTargetFarmId`.
