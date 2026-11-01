/** Compact solution_snapshot for LLM context (not full JSON). */
export function summarizeSolutionSnapshotForRetrieval(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const s = snapshot as Record<string, unknown>;
  const name = typeof s.name === 'string' ? s.name.trim() : '';
  const ec = s.ec_ms_calculated;
  const doses = Array.isArray(s.doses_per_l) ? s.doses_per_l : [];
  const doseParts = doses
    .slice(0, 8)
    .map((d) => {
      if (!d || typeof d !== 'object') return '';
      const o = d as Record<string, unknown>;
      const label = String(o.product_label ?? '?');
      const dose = o.dose_per_l;
      const unit = o.unit != null ? String(o.unit) : '';
      return `${label} ${dose}${unit ? ` ${unit}` : ''}`;
    })
    .filter(Boolean);
  const elements = s.elements_mg_per_l;
  let elemStr = '';
  if (elements && typeof elements === 'object' && !Array.isArray(elements)) {
    elemStr = Object.entries(elements as Record<string, unknown>)
      .slice(0, 8)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
  }
  const parts = [
    name ? `recipe=${name}` : null,
    ec != null && ec !== '' ? `EC≈${ec}` : null,
    doseParts.length ? `doses: ${doseParts.join('; ')}` : null,
    elemStr ? `mg/L: ${elemStr}` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(' · ').slice(0, 600);
}
