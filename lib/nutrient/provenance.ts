export type ProvenanceClass =
  | 'manufacturer_label'
  | 'manufacturer_feedchart'
  | 'hydroodo_legacy'
  | 'scientific'
  | 'community';

export const PROVENANCE_CLASSES: ProvenanceClass[] = [
  'manufacturer_label',
  'manufacturer_feedchart',
  'hydroodo_legacy',
  'scientific',
  'community',
];

export function provenanceFromMetadata(
  metadata?: Record<string, unknown> | null,
): ProvenanceClass | undefined {
  const v = metadata?.provenance_class;
  if (typeof v === 'string' && PROVENANCE_CLASSES.includes(v as ProvenanceClass)) {
    return v as ProvenanceClass;
  }
  return undefined;
}

export function provenanceBadgeVariant(
  cls: ProvenanceClass,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (cls) {
    case 'manufacturer_label':
    case 'manufacturer_feedchart':
      return 'default';
    case 'scientific':
      return 'secondary';
    case 'community':
      return 'outline';
    case 'hydroodo_legacy':
      return 'outline';
    default:
      return 'outline';
  }
}
