const NITROGEN_FORM_ROWS = ['N_NO3', 'N_NH4', 'N_UREA'] as const;

function ppm(map: Record<string, number>, key: string): number {
  const value = map[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** True when target specifies nitrogen by form (canonical), not legacy total N. */
export function targetUsesNitrogenForms(target: Record<string, number>): boolean {
  return (
    ppm(target, 'N_NO3') > 0 ||
    ppm(target, 'N_NH4') > 0 ||
    ppm(target, 'N_UREA') > 0 ||
    ppm(target, 'N_UNKNOWN') > 0
  );
}

/**
 * Goal is elemental N (`N`), not a form. Nitrate, ammonium and urea then count toward that
 * goal. `N_UNKNOWN` is the same milligrams as `N` and is not a second goal.
 */
export function shouldFoldNitrogenFormsIntoTotal(target: Record<string, number>): boolean {
  return ppm(target, 'N') > 0 && !targetUsesNitrogenForms(target);
}

/**
 * Add nitrate / ammonium / urea coefficients into the total-N row.
 * Does not add `N_UNKNOWN`: that row already duplicates `N`.
 */
export function foldNitrogenFormsIntoTotalRow(groups: string[], matrix: number[][]): void {
  const nRow = groups.indexOf('N');
  if (nRow < 0) return;
  const dest = matrix[nRow];
  if (!dest) return;
  for (const key of NITROGEN_FORM_ROWS) {
    const i = groups.indexOf(key);
    if (i < 0) continue;
    const row = matrix[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) dest[j] += row[j] ?? 0;
    row.fill(0);
  }
}

/**
 * Objective view of achieved ppm.
 * Form targets drop the duplicate `N` key. A total-N target sums the forms into `N` once.
 * `N_UNKNOWN` is omitted unless the target asks for it: it is the same nitrogen as `N`.
 */
export function achievedForObjective(
  target: Record<string, number>,
  achieved: Record<string, number>,
): Record<string, number> {
  const formTargeted = targetUsesNitrogenForms(target);
  const totalTargeted = ppm(target, 'N') > 0;
  const unknownTargeted = ppm(target, 'N_UNKNOWN') > 0;
  const fold = totalTargeted && !formTargeted;
  const dropTotalN = formTargeted && !totalTargeted && ppm(achieved, 'N') > 0;
  const dropUnknown = !unknownTargeted && ppm(achieved, 'N_UNKNOWN') > 0;
  const hasForms =
    ppm(achieved, 'N_NO3') > 0 || ppm(achieved, 'N_NH4') > 0 || ppm(achieved, 'N_UREA') > 0;
  if (!dropTotalN && !dropUnknown && !(fold && (hasForms || dropUnknown))) return achieved;

  const out = { ...achieved };
  if (dropTotalN) delete out.N;
  if (dropUnknown) delete out.N_UNKNOWN;
  if (fold && (hasForms || ppm(achieved, 'N_UNKNOWN') > 0)) {
    const forms = ppm(achieved, 'N_NO3') + ppm(achieved, 'N_NH4') + ppm(achieved, 'N_UREA');
    const unspecified = Math.max(ppm(achieved, 'N'), ppm(achieved, 'N_UNKNOWN'));
    out.N = forms + unspecified;
    delete out.N_NO3;
    delete out.N_NH4;
    delete out.N_UREA;
    delete out.N_UNKNOWN;
  }
  return out;
}
