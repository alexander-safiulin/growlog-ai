import type { ElementKey, TargetPpm } from './types';

/** Rough ion-balance check: sum cation meq vs anion meq (simplified nutrient ions). */
export function ionBalanceWarning(achieved: TargetPpm): string | null {
  const cationMeq =
    (achieved.K ?? 0) / 39.098 +
    (achieved.Ca ?? 0) / 20.039 * 2 +
    (achieved.Mg ?? 0) / 12.1525 * 2 +
    (achieved.N_NH4 ?? 0) / 14.007;

  const anionMeq =
    (achieved.N_NO3 ?? 0) / 14.007 +
    (achieved.P ?? 0) / 15.487 * 2 +
    (achieved.S ?? 0) / 16.03 * 2;

  if (cationMeq + anionMeq < 1e-6) return null;

  const ratio = cationMeq / anionMeq;
  if (ratio < 0.5 || ratio > 2) {
    return `ion_balance_skew:${ratio.toFixed(2)}`;
  }
  return null;
}

export function totalNitrogenPpm(achieved: TargetPpm): number {
  return (achieved.N_NO3 ?? 0) + (achieved.N_NH4 ?? 0) + (achieved.N_UREA ?? 0);
}

export function ammoniumShare(achieved: TargetPpm): number {
  const total = totalNitrogenPpm(achieved);
  if (total <= 0) return 0;
  return (achieved.N_NH4 ?? 0) / total;
}
