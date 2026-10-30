import { extractStoredLeafSkill } from './parse-observation';

/** Skip photo.analyze only when leaf skill is already stored (re-run legacy v1 rows). */
export function photoAnalysisHasLeafSkill(signals: unknown): boolean {
  return extractStoredLeafSkill(signals) != null;
}
