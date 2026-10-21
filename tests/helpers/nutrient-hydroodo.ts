import { readFileSync } from 'node:fs';
import path from 'node:path';
import { declaredToElemental } from '../../packages/nutrient-calc/src/oxide';
import type { ElementKey, FertilizerSpec, TargetPpm } from '../../packages/nutrient-calc/src/types';

export interface HydroodoDb {
  components: Array<{
    brand: string;
    name: string;
    declared_pct: Record<string, number>;
    elemental_pct: Record<string, number>;
  }>;
  systems: Array<{
    name: string;
    ppm: Record<string, number>;
  }>;
}

const SEED_PATH = path.join(
  process.cwd(),
  'supabase/seed/nutrient/reference/hydroodo/hydroodo_db.json',
);

export function loadHydroodoDb(): HydroodoDb {
  const raw = readFileSync(SEED_PATH, 'utf8');
  return JSON.parse(raw) as HydroodoDb;
}

export function hydroodoFertilizer(
  brand: string,
  name: string,
  db = loadHydroodoDb(),
): FertilizerSpec {
  const row = db.components.find((c) => c.brand === brand && c.name === name);
  if (!row) throw new Error(`Missing fertilizer ${brand} / ${name}`);
  const { pct } = declaredToElemental(row.declared_pct);
  return {
    id: `${brand}|${name}`,
    brand,
    name,
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    elementalPct: pct,
    declaredPct: row.declared_pct,
  };
}

/** Hydroodo system row uses total N as `N` — map to N_NO3 for solver targets. */
export function hydroodoSystemTarget(systemName: string, db = loadHydroodoDb()): TargetPpm {
  const sys = db.systems.find((s) => s.name === systemName);
  if (!sys) throw new Error(`Missing system ${systemName}`);
  const target: TargetPpm = {};
  for (const [k, v] of Object.entries(sys.ppm)) {
    if (v == null || v === 0) continue;
    if (k === 'N') {
      target.N_NO3 = v;
      continue;
    }
    target[k as ElementKey] = v;
  }
  return target;
}
