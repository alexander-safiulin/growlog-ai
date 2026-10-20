export type ProcedureHit = {
  id: string;
  sourceType: 'sop_revision' | 'knowledge_item' | 'playbook_threshold';
  title: string;
  text: string;
};

const ACTION_RE =
  /(что делать|как быть|как исправить|что предпринять|чем обработать|what should|how do i|how to|what do i do|fix this|treat|ทำอย่างไร|ควรทำ|แก้|ဘယ်လိုလုပ်)/i;

export function asksForProcedure(query: string): boolean {
  return ACTION_RE.test(query);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}.]+/u)
    .filter((t) => t.length >= 4);
}

/** Code decides routine vs escalation. A hit is shared wording with an approved SOP, playbook item, or threshold. */
export function matchApprovedProcedure(
  query: string,
  procedures: ProcedureHit[]
): ProcedureHit | null {
  const qTokens = new Set(tokens(query));
  const qLower = query.toLowerCase();
  for (const proc of procedures) {
    if (proc.sourceType === 'playbook_threshold') {
      const code = proc.title.toLowerCase();
      if (code && qLower.includes(code)) return proc;
      continue;
    }
    const hay = tokens(`${proc.title} ${proc.text}`);
    if (hay.some((t) => qTokens.has(t))) return proc;
  }
  return null;
}
