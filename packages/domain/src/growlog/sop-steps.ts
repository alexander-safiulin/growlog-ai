import type { SopExecutionStatus } from '../types/sop';

export const SOP_STEP_MAX = 80;
export const SOP_STEP_TEXT_MAX = 500;

const STEP_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** Only `check` ships in phase 1 (ADR-006 «Шаги регламента»); measure/photo/note come later. */
export type SopStepKind = 'check';

export type SopStep = {
  id: string;
  text: string;
  kind: SopStepKind;
  required: boolean;
};

export type SopStepDraft = {
  text: string;
  required: boolean;
};

/** Stored in `sop_executions.result_json.steps`; keeps step text so history survives SOP edits. */
export type SopStepResult = {
  step_id: string;
  text: string;
  required: boolean;
  checked: boolean;
};

export type SopStepProgress = {
  total: number;
  checked: number;
  requiredTotal: number;
  requiredChecked: number;
  missingRequired: SopStep[];
};

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, SOP_STEP_TEXT_MAX);
}

function nextFreeId(used: Set<string>, start: number): string {
  let n = start;
  while (used.has(`s${n}`)) n += 1;
  return `s${n}`;
}

/**
 * Reads `instructions_json.steps`. Legacy `string[]` (document import, ADR-016) becomes
 * required `check` steps with ids `s1..sN` by position.
 */
export function parseSopSteps(instructionsJson: unknown): SopStep[] {
  if (!instructionsJson || typeof instructionsJson !== 'object' || Array.isArray(instructionsJson)) {
    return [];
  }
  const raw = (instructionsJson as { steps?: unknown }).steps;
  if (!Array.isArray(raw)) return [];

  const used = new Set<string>();
  const out: SopStep[] = [];
  raw.forEach((item, index) => {
    if (out.length >= SOP_STEP_MAX) return;
    let text = '';
    let id: string | null = null;
    let required = true;
    if (typeof item === 'string') {
      text = cleanText(item);
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const row = item as Record<string, unknown>;
      text = typeof row.text === 'string' ? cleanText(row.text) : '';
      if (typeof row.id === 'string' && STEP_ID.test(row.id) && !used.has(row.id)) id = row.id;
      required = row.required !== false;
    }
    if (!text) return;
    const stepId = id ?? nextFreeId(used, index + 1);
    used.add(stepId);
    out.push({ id: stepId, text, kind: 'check', required });
  });
  return out;
}

export function buildSopSteps(drafts: SopStepDraft[]): SopStep[] {
  const out: SopStep[] = [];
  for (const draft of drafts) {
    const text = cleanText(draft.text);
    if (!text) continue;
    out.push({ id: `s${out.length + 1}`, text, kind: 'check', required: draft.required !== false });
    if (out.length >= SOP_STEP_MAX) break;
  }
  return out;
}

export function instructionsJsonForSteps(steps: SopStep[]): Record<string, unknown> {
  return steps.length ? { steps } : {};
}

/** Splits pasted multi-line text into step drafts, dropping list markers like `1.`, `-`, `•`, `[ ]`. */
export function stepDraftsFromText(text: string): SopStepDraft[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:(?:[-*•]|\d+[.)](?=\s)|\[[ xX]?\])\s*)+/, '').trim())
    .filter(Boolean)
    .slice(0, SOP_STEP_MAX)
    .map((line) => ({ text: line, required: true }));
}

export function sopStepProgress(steps: SopStep[], checkedIds: Iterable<string>): SopStepProgress {
  const checkedSet = new Set(checkedIds);
  let checked = 0;
  let requiredTotal = 0;
  let requiredChecked = 0;
  const missingRequired: SopStep[] = [];
  for (const step of steps) {
    const isChecked = checkedSet.has(step.id);
    if (isChecked) checked += 1;
    if (step.required) {
      requiredTotal += 1;
      if (isChecked) requiredChecked += 1;
      else missingRequired.push(step);
    }
  }
  return { total: steps.length, checked, requiredTotal, requiredChecked, missingRequired };
}

export function sopStepResults(steps: SopStep[], checkedIds: Iterable<string>): SopStepResult[] {
  const checkedSet = new Set(checkedIds);
  return steps.map((step) => ({
    step_id: step.id,
    text: step.text,
    required: step.required,
    checked: checkedSet.has(step.id),
  }));
}

/** Status the checklist implies; `null` when there is no checklist or nothing is checked yet. */
export function suggestSopExecutionStatus(
  progress: SopStepProgress
): Extract<SopExecutionStatus, 'done' | 'partially_done'> | null {
  if (progress.total === 0 || progress.checked === 0) return null;
  return progress.missingRequired.length === 0 ? 'done' : 'partially_done';
}
