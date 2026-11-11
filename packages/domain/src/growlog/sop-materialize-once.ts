const materializedAnchorByScope = new Map<string, string>();

export function sopMaterializeScopeKey(farmId: string, cycleId: string): string {
  return `${farmId}:${cycleId}`;
}

export function clearSopMaterializeOnce(scopeKey: string): void {
  materializedAnchorByScope.delete(scopeKey);
}

/** Skip duplicate calendar materialize for the same farm/cycle anchor day (tab refetch). */
export async function materializeSopRunsForAnchorOnce(
  scopeKey: string,
  anchorDate: string,
  run: () => Promise<void>
): Promise<void> {
  if (materializedAnchorByScope.get(scopeKey) === anchorDate) return;
  await run();
  materializedAnchorByScope.set(scopeKey, anchorDate);
}
