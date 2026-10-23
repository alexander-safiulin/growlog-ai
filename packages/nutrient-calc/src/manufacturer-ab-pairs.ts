import { buildChemistryMatrix, collectGroups, type ChemistryModel } from './chemistry-matrix';
import type { Dose, FertilizerSpec, SolveForwardOptions, SolveSolution } from './types';

export function shouldLinkManufacturerAbPairs(
  model: ChemistryModel,
  options?: SolveForwardOptions,
): boolean {
  if (options?.linkManufacturerAbPairs != null) return options.linkManufacturerAbPairs;
  return model === 'canonical';
}

export interface ManufacturerAbPair {
  partA: FertilizerSpec;
  partB: FertilizerSpec;
  /** Part B amount per 1 unit of part A (same dose units). */
  ratioBPerA: number;
  pairKey: string;
}

type ParsedPart = { stem: string; part: 'a' | 'b' };

/** Names differing only by trailing A/B or Part A / Part B (not GROW/BLOOM tokens). */
export function parseManufacturerAbPartName(name: string): ParsedPart | null {
  const trimmed = name.trim();
  const partB = trimmed.match(/^(.*)\s+(?:part\s+)?b\s*$/i);
  if (partB && !/\bbloom\b/i.test(trimmed)) {
    return { stem: partB[1].trim(), part: 'b' };
  }
  const partA = trimmed.match(/^(.*)\s+(?:part\s+)?a\s*$/i);
  if (partA && !/\bgrow\b/i.test(trimmed)) {
    return { stem: partA[1].trim(), part: 'a' };
  }
  return null;
}

function pairKey(brand: string, stem: string): string {
  return `${brand.toLowerCase()}|${stem.toLowerCase()}`;
}

function ratioFromMetadata(a: FertilizerSpec, b: FertilizerSpec): number {
  const fromA = a.metadata?.ab_part_b_per_part_a;
  const fromB = b.metadata?.ab_part_b_per_part_a;
  if (typeof fromA === 'number' && fromA > 0) return fromA;
  if (typeof fromB === 'number' && fromB > 0) return fromB;
  return 1;
}

export function detectManufacturerAbPairs(fertilizers: FertilizerSpec[]): ManufacturerAbPair[] {
  const byKey = new Map<string, { a?: FertilizerSpec; b?: FertilizerSpec }>();
  for (const f of fertilizers) {
    const parsed = parseManufacturerAbPartName(f.name);
    if (!parsed) continue;
    const brand = (f.brand ?? '').trim() || (f.name.split(/\s+/)[0] ?? 'unknown');
    const key = pairKey(brand, parsed.stem);
    const slot = byKey.get(key) ?? {};
    if (parsed.part === 'a') slot.a = f;
    else slot.b = f;
    byKey.set(key, slot);
  }
  const out: ManufacturerAbPair[] = [];
  for (const [key, slot] of byKey) {
    if (!slot.a || !slot.b) continue;
    out.push({
      partA: slot.a,
      partB: slot.b,
      ratioBPerA: ratioFromMetadata(slot.a, slot.b),
      pairKey: key,
    });
  }
  return out.sort((x, y) => x.pairKey.localeCompare(y.pairKey));
}

export function planManufacturerAbLinkage(fertilizers: FertilizerSpec[]): {
  forOptimize: FertilizerSpec[];
  pairs: ManufacturerAbPair[];
} {
  const pairs = detectManufacturerAbPairs(fertilizers);
  const bIds = new Set(pairs.map((p) => p.partB.id));
  const forOptimize = fertilizers.filter((f) => !bIds.has(f.id));
  return { forOptimize, pairs };
}

/** Merge part B chemistry into part A columns (B is not an independent decision variable). */
export function augmentMatrixWithLinkedPartB(
  A: number[][],
  forOptimize: FertilizerSpec[],
  pairs: ManufacturerAbPair[],
  groups: string[],
  model: ChemistryModel,
): number[][] {
  if (pairs.length === 0) return A;
  const out = A.map((row) => [...row]);
  const idToIdx = new Map(forOptimize.map((f, i) => [f.id, i]));
  for (const pair of pairs) {
    const jA = idToIdx.get(pair.partA.id);
    if (jA == null) continue;
    const bMat = buildChemistryMatrix([pair.partB], groups, model);
    for (let i = 0; i < groups.length; i++) {
      out[i][jA] += (bMat[i]?.[0] ?? 0) * pair.ratioBPerA;
    }
  }
  return out;
}

export function achievedPpmFromDoseRows(
  doses: Dose[],
  fertilizers: FertilizerSpec[],
  target: Record<string, number>,
  water: Record<string, number> | undefined,
  model: ChemistryModel,
): Record<string, number> {
  const groups = collectGroups(fertilizers, target, model);
  const x = fertilizers.map(
    (f) => doses.find((d) => d.fertilizerId === f.id)?.amountPerL ?? 0,
  );
  const A = buildChemistryMatrix(fertilizers, groups, model);
  const achievedVec = groups.map((_, i) =>
    A[i].reduce((sum, aij, j) => sum + aij * x[j], 0),
  );
  const achievedPpm: Record<string, number> = {};
  for (let i = 0; i < groups.length; i++) {
    const w = water?.[groups[i]] ?? 0;
    const v = achievedVec[i] + w;
    if (v !== 0) achievedPpm[groups[i]] = v;
  }
  return achievedPpm;
}

export function expandAbLinkedDoses(
  doses: Dose[],
  pairs: ManufacturerAbPair[],
  minDose = 0.001,
): Dose[] {
  const byId = new Map(doses.map((d) => [d.fertilizerId, d]));
  const out = doses.filter((d) => !pairs.some((p) => p.partB.id === d.fertilizerId));
  for (const pair of pairs) {
    const doseA = byId.get(pair.partA.id);
    const doseB = byId.get(pair.partB.id);
    const amountA = doseA?.amountPerL ?? 0;
    const amountB = doseB?.amountPerL ?? 0;
    let masterA = amountA;
    let masterB = amountB;
    if (amountA > minDose && amountB <= minDose) {
      masterB = amountA * pair.ratioBPerA;
    } else if (amountB > minDose && amountA <= minDose) {
      masterA = amountB / pair.ratioBPerA;
    } else if (amountA > minDose && amountB > minDose) {
      masterB = amountA * pair.ratioBPerA;
    } else {
      continue;
    }
    const unitA = doseA?.unit ?? pair.partA.doseUnit;
    const unitB = doseB?.unit ?? pair.partB.doseUnit;
    const nameA = doseA?.fertilizerName ?? pair.partA.name;
    const nameB = doseB?.fertilizerName ?? pair.partB.name;
    const tankA = doseA?.tank ?? pair.partA.tank ?? 'single';
    const tankB = doseB?.tank ?? pair.partB.tank ?? 'single';
    const idxA = out.findIndex((d) => d.fertilizerId === pair.partA.id);
    const rowA: Dose = {
      fertilizerId: pair.partA.id,
      fertilizerName: nameA,
      amountPerL: masterA,
      unit: unitA,
      tank: tankA,
      amountTotal: doseA?.amountTotal,
    };
    const rowB: Dose = {
      fertilizerId: pair.partB.id,
      fertilizerName: nameB,
      amountPerL: masterB,
      unit: unitB,
      tank: tankB,
      amountTotal: doseB?.amountTotal,
    };
    if (idxA >= 0) out[idxA] = rowA;
    else out.push(rowA);
    out.push(rowB);
  }
  return out;
}

export function solutionSatisfiesAbPairs(
  sol: SolveSolution,
  pairs: ManufacturerAbPair[],
  minDose = 0.01,
): boolean {
  const byId = new Map(sol.doses.map((d) => [d.fertilizerId, d.amountPerL]));
  for (const pair of pairs) {
    const a = byId.get(pair.partA.id) ?? 0;
    const b = byId.get(pair.partB.id) ?? 0;
    if (a >= minDose && b < minDose) return false;
    if (b >= minDose && a < minDose) return false;
  }
  return true;
}

export function manufacturerAbPairPlusCorrectionSubset(
  selected: FertilizerSpec[],
): FertilizerSpec[] | null {
  const subsets = manufacturerAbPairCorrectionSubsets(selected);
  return subsets.length > 0 ? subsets[0] : null;
}

/** One subset per detected pair: that pair at linked ratio plus non-A/B correction salts. */
export function manufacturerAbPairCorrectionSubsets(
  selected: FertilizerSpec[],
): FertilizerSpec[][] {
  const pairs = detectManufacturerAbPairs(selected);
  if (pairs.length === 0) return [];
  const linkedIds = new Set<string>();
  for (const p of pairs) {
    linkedIds.add(p.partA.id);
    linkedIds.add(p.partB.id);
  }
  const corrections = selected.filter((f) => !linkedIds.has(f.id));
  return pairs.map((pair) => [pair.partA, pair.partB, ...corrections]);
}
