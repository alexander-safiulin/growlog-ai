/** True when target specifies nitrogen by form (canonical), not legacy total N. */
export function targetUsesNitrogenForms(target: Record<string, number>): boolean {
  return (
    (target.N_NO3 ?? 0) > 0 ||
    (target.N_NH4 ?? 0) > 0 ||
    (target.N_UREA ?? 0) > 0 ||
    (target.N_UNKNOWN ?? 0) > 0
  );
}

/** Drop redundant total-N row when forms are targeted (avoids double-count / unsolicited N). */
export function achievedForObjective(
  target: Record<string, number>,
  achieved: Record<string, number>,
): Record<string, number> {
  if (!targetUsesNitrogenForms(target) || (target.N ?? 0) > 0) {
    return achieved;
  }
  const out = { ...achieved };
  delete out.N;
  return out;
}
