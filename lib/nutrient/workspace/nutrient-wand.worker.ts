import { solveMagicWand, type SolveForwardInput } from '@growlog/nutrient-calc';

export type NutrientWandWorkerRequest = {
  id: number;
  input: SolveForwardInput;
};

export type NutrientWandWorkerResponse = {
  id: number;
  result?: ReturnType<typeof solveMagicWand>;
  error?: string;
};

self.onmessage = (event: MessageEvent<NutrientWandWorkerRequest>) => {
  const { id, input } = event.data;
  try {
    const result = solveMagicWand(input);
    const payload: NutrientWandWorkerResponse = { id, result };
    self.postMessage(payload);
  } catch (err) {
    const payload: NutrientWandWorkerResponse = { id, error: err instanceof Error ? err.message : String(err) };
    self.postMessage(payload);
  }
};
