/** Pick a farm-unique feed system name (unique per farm_id in DB). */
export function uniqueFeedSystemName(base: string, existingNames: string[]): string {
  const trimmed = base.trim();
  if (!trimmed) return trimmed;
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (!taken.has(trimmed.toLowerCase())) return trimmed;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${trimmed} ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${trimmed} ${Date.now()}`;
}

export function isFeedSystemNameConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '23505';
}
