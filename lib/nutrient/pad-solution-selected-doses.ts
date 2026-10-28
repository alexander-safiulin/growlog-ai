import type { Dose, FertilizerSpec, SolveForwardResult, SolveSolution } from '@growlog/nutrient-calc';

function zeroDose(spec: FertilizerSpec, volumeL?: number): Dose {
  return {
    fertilizerId: spec.id,
    fertilizerName: spec.name,
    amountPerL: 0,
    unit: spec.doseUnit,
    tank: spec.tank ?? 'single',
    amountTotal: volumeL != null && volumeL > 0 ? 0 : undefined,
  };
}

/** Show every user-selected fertilizer on the mix card; unused salts stay at 0 g/L for manual tuning. */
export function padSolutionWithSelectedFertilizers(
  solution: SolveSolution,
  selectedSpecs: FertilizerSpec[],
  selectedProductOrder: string[],
  volumeL?: number,
): SolveSolution {
  const specById = new Map(selectedSpecs.map((spec) => [spec.id, spec]));
  const order = selectedProductOrder.filter((id) => specById.has(id));
  for (const spec of selectedSpecs) {
    if (!order.includes(spec.id)) order.push(spec.id);
  }

  const byFertId = new Map<string, Dose[]>();
  for (const dose of solution.doses) {
    const list = byFertId.get(dose.fertilizerId) ?? [];
    list.push(dose);
    byFertId.set(dose.fertilizerId, list);
  }

  const doses: Dose[] = [];
  const placed = new Set<string>();

  for (const id of order) {
    const spec = specById.get(id);
    if (!spec) continue;
    const existing = byFertId.get(id);
    if (existing?.length) {
      doses.push(...existing);
    } else {
      doses.push(zeroDose(spec, volumeL));
    }
    placed.add(id);
  }

  for (const dose of solution.doses) {
    if (!placed.has(dose.fertilizerId)) {
      doses.push(dose);
      placed.add(dose.fertilizerId);
    }
  }

  return { ...solution, doses };
}

export function padSolveForwardResultWithSelectedDoses(
  result: SolveForwardResult,
  selectedSpecs: FertilizerSpec[],
  selectedProductOrder: string[],
  volumeL?: number,
): SolveForwardResult {
  const pad = (solution: SolveSolution) =>
    padSolutionWithSelectedFertilizers(solution, selectedSpecs, selectedProductOrder, volumeL);
  return {
    ...result,
    best: pad(result.best),
    alternatives: result.alternatives.map(pad),
  };
}
