# Farm invitations by email

Migration: `supabase/migrations/20261026130000_farm_invitations.sql`.

## Flow

1. Farm **admin** creates a pending row in `farm_invitations` via `create_farm_invitation`. The address is normalized (`normalize_invite_email`: lowercase, whitespace and zero-width characters removed, `mailto:` and `Name <email>` unwrapped, trailing punctuation dropped when the domain is already complete) and rejected with `invalid_email` unless it is a normal address (`invite_email_is_valid`). Role and 30-day expiry are unchanged.
2. No email is sent yet; the admin shares the login URL verbally.
3. After sign-in (confirmed email), the client loads pending invites via `list_pending_farm_invitations_for_current_user`. A banner prompts the user to accept; nothing is applied silently on page load.
4. Accept runs `accept_farm_invitation` (or the bulk `accept_pending_invitations_for_current_user` in tests). It inserts `farm_users` (`ON CONFLICT DO NOTHING` so roles are never downgraded) and marks the invite accepted. Existing farms and the active farm selection are unchanged unless the user switches farm.
5. A dismissible “added to farm” banner offers **Open** / **Leave farm**; active farm is **not** auto-switched.

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
