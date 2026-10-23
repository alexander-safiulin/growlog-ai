import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/components/providers/I18nProvider';
import {
  provenanceBadgeVariant,
  provenanceFromMetadata,
  type ProvenanceClass,
} from '@/lib/nutrient/provenance';

export function SourceBadge({
  provenanceClass,
  metadata,
  sourceSlug,
  compact,
}: {
  provenanceClass?: ProvenanceClass;
  metadata?: Record<string, unknown> | null;
  sourceSlug?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const cls = provenanceClass ?? provenanceFromMetadata(metadata);
  if (!cls) return null;
  const labelKey = {
    manufacturer_label: 'nutrient.provenance.manufacturer_label',
    manufacturer_feedchart: 'nutrient.provenance.manufacturer_feedchart',
    hydroodo_legacy: 'nutrient.provenance.hydroodo_legacy',
    scientific: 'nutrient.provenance.scientific',
    community: 'nutrient.provenance.community',
  } satisfies Record<ProvenanceClass, string>;
  const label = t(labelKey[cls]);
  const variant = provenanceBadgeVariant(cls);
  const href = `/nutrient/sources${sourceSlug ? `#${sourceSlug}` : ''}`;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center">
      <Badge
        variant={variant}
        className={
          compact
            ? 'min-h-11 px-2.5 py-2 text-[10px] leading-tight sm:text-xs'
            : 'min-h-11 px-3 py-2 text-xs'
        }
      >
        {label}
      </Badge>
    </Link>
  );
}
