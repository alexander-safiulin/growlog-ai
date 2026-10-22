'use client';

import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { useTranslation } from '@/components/providers/I18nProvider';
import { catalogSourceDisplayName } from '@/lib/nutrient/catalog-source-label';
import { sourceContributionCounts } from '@/lib/nutrient/catalog-index';
import type { CatalogBundle, ManufacturerManifestP4 } from '@/lib/nutrient/catalog-types';
import type { ProvenanceClass } from '@/lib/nutrient/provenance';

export function NutrientSourcesView({
  catalog,
  manifest,
}: {
  catalog: CatalogBundle;
  manifest: ManufacturerManifestP4;
}) {
  const { t } = useTranslation();
  const counts = sourceContributionCounts(catalog);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.legend')}</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              'manufacturer_label',
              'manufacturer_feedchart',
              'scientific',
              'hydroodo_legacy',
              'community',
            ] as ProvenanceClass[]
          ).map((cls) => (
            <SourceBadge key={cls} provenanceClass={cls} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.registry')}</h2>
        <ul className="space-y-3 text-sm">
          {catalog.sources.map((s) => (
            <li key={s.id} id={s.slug} className="border rounded-md p-3">
              <div className="font-medium">{catalogSourceDisplayName(s.slug, s.name, t)}</div>
              <div className="text-muted-foreground">{s.slug}</div>
              {s.url && (
                <a href={s.url} className="text-primary underline break-all" target="_blank" rel="noreferrer">
                  {s.url}
                </a>
              )}
              <p className="mt-1">{s.license}</p>
              <p>{t('nutrient.sources.retrieved')}: {s.retrieved_at.slice(0, 10)}</p>
              <p>
                {t('nutrient.sources.trust')}:{' '}
                {t(
                  (
                    {
                      high: 'nutrient.trustLevel.high',
                      medium: 'nutrient.trustLevel.medium',
                      low: 'nutrient.trustLevel.low',
                      unverified: 'nutrient.trustLevel.unverified',
                    } as Record<string, string>
                  )[s.trust_level] ?? 'nutrient.trustLevel.unverified',
                )}
              </p>
              <p>{t('nutrient.sources.contributions')}: {counts[s.slug] ?? 0}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.imported')}</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {manifest.imported.map((row) => (
            <li key={row.slug}>
              <strong>{row.name}</strong> — {row.provenance_class}
              {row.url && (
                <>
                  {' '}
                  (<a className="underline" href={row.url} target="_blank" rel="noreferrer">{row.url}</a>)
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.missing')}</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
          {manifest.missing.map((row) => (
            <li key={row.manufacturer}>
              <strong>{row.manufacturer}</strong>: {row.reason}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
