import type { LeafSkillResult } from './types';

export function formatLeafSkillBody(result: LeafSkillResult): string {
  const lines: string[] = [];
  if (result.hypotheses.length === 0) {
    lines.push('По кадру не удалось выделить уверенные гипотезы — нужны уточнения.');
  } else {
    lines.push('Возможные причины (гипотезы, не диагноз):');
    for (const h of result.hypotheses) {
      lines.push(`• ${h.label}`);
    }
  }
  if (result.grounded_facts.length) {
    lines.push('');
    lines.push('Из журнала:');
    for (const f of result.grounded_facts) lines.push(`• ${f}`);
  }
  if (result.missing_data.length) {
    lines.push('');
    lines.push('Не хватает данных:');
    for (const m of result.missing_data) lines.push(`• ${m}`);
  }
  if (result.next_step.kind !== 'none') {
    lines.push('');
    lines.push(`Следующий шаг: ${result.next_step.prompt}`);
  }
  return lines.join('\n');
}
