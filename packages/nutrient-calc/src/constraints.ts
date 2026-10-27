import { isHardCapGroup, isMacroGroup, microHarmCeilingPpm, overdoseCeilingPpm } from './objective';
import type { SolveForwardOptions } from './types';

export interface ConstraintContext {
  groups: string[];
  netTarget: Record<string, number>;
  achieved: Record<string, number>;
  /** ppm outside the checked doses (source water, fixed A+B); shifts absolute micro ceilings. */
  backgroundPpm?: Record<string, number>;
  doses: number[];
  maxDosePerL?: number[];
  options?: SolveForwardOptions;
  nh4MgL?: number;
  nTotalMgL?: number;
  ecMsCm?: number;
}

export interface ConstraintViolation {
  code: string;
  detail?: string;
}

export function checkHardConstraints(ctx: ConstraintContext): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const overdose = ctx.options?.overdosePctByGroup;
  const microCap = ctx.options?.microOverdoseCap ?? 'soft';

  for (const g of ctx.groups) {
    const t = ctx.netTarget[g] ?? 0;
    const harm = isMacroGroup(g)
      ? undefined
      : microHarmCeilingPpm(g, Math.max(0, t), ctx.backgroundPpm?.[g] ?? 0);
    const a0 = ctx.achieved[g] ?? 0;
    if (harm != null && a0 > harm + 1e-6) {
      violations.push({ code: 'micro_harm_cap', detail: `${g}:${a0}>${harm}` });
    }
    if (t <= 0) continue;
    if (!isHardCapGroup(g, microCap)) continue;
    const a = ctx.achieved[g] ?? 0;
    const max = overdoseCeilingPpm(g, t, overdose);
    if (a > max + 1e-6) {
      violations.push({
        code: 'overdose_cap',
        detail: `${g}:${a}>${max}`,
      });
    }
  }

  for (let j = 0; j < ctx.doses.length; j++) {
    if (ctx.doses[j] < -1e-9) {
      violations.push({ code: 'negative_dose', detail: `j=${j}` });
    }
    const maxD = ctx.maxDosePerL?.[j];
    if (maxD != null && ctx.doses[j] > maxD + 1e-9) {
      violations.push({ code: 'max_dose', detail: `j=${j}` });
    }
  }

  const maxShare = ctx.options?.maxAmmoniumShare;
  if (maxShare != null && ctx.nTotalMgL != null && ctx.nTotalMgL > 1e-9) {
    const share = (ctx.nh4MgL ?? 0) / ctx.nTotalMgL;
    if (share > maxShare + 1e-6) {
      violations.push({ code: 'nh4_share', detail: String(share) });
    }
  }

  const maxEc = ctx.options?.maxEcMsCm;
  if (maxEc != null && ctx.ecMsCm != null && ctx.ecMsCm > maxEc + 1e-6) {
    violations.push({ code: 'ec_cap', detail: String(ctx.ecMsCm) });
  }

  return violations;
}

export function satisfiesHardConstraints(ctx: ConstraintContext): boolean {
  return checkHardConstraints(ctx).length === 0;
}
