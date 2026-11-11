const materializedAnchorByScope = new Map<string, string>();

/** Skip duplicate SOP materialize for the same farm/cycle anchor day (panic refresh). */
export async function materializeSopRunsForAnchorOnce(
  scopeKey: string,
  anchorDate: string,
  run: () => Promise<void>,
): Promise<void> {
  if (materializedAnchorByScope.get(scopeKey) === anchorDate) return;
  await run();
  materializedAnchorByScope.set(scopeKey, anchorDate);
}
