'use client';

import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { useTranslation } from '@/components/providers/I18nProvider';
import { catalogSourceDisplayName } from '@/lib/nutrient/catalog-source-label';
import { catalogSourceLicenseText, shortenSourceUrl } from '@/lib/nutrient/catalog-source-license';
import { sourceContributionCounts } from '@/lib/nutrient/catalog-index';
import type { CatalogBundle, ManufacturerManifestP4 } from '@/lib/nutrient/catalog-types';
import type { ProvenanceClass } from '@/lib/nutrient/provenance';

function asProvenanceClass(value: string): ProvenanceClass | null {
  const allowed: ProvenanceClass[] = [
    'manufacturer_label',
    'manufacturer_feedchart',
    'scientific',
    'hydroodo_legacy',
    'community',
  ];
  return allowed.includes(value as ProvenanceClass) ? (value as ProvenanceClass) : null;
}

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
    <div className="min-w-0 space-y-8 overflow-x-hidden">
      <section className="min-w-0">
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

      <section className="min-w-0">
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.registry')}</h2>
        <ul className="space-y-3 text-sm">
          {catalog.sources.map((s) => (
            <li key={s.id} id={s.slug} className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
              <div className="font-medium break-words">{catalogSourceDisplayName(s.slug, s.name, t)}</div>
              <div className="text-muted-foreground break-all text-xs mt-0.5">{s.slug}</div>
              {s.url && (
                <a
                  href={s.url}
                  className="mt-1 inline-flex min-h-11 max-w-full items-center text-xs text-primary underline decoration-primary/40 underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                  title={s.url}
                >
                  <span className="break-all">{shortenSourceUrl(s.url)}</span>
                </a>
              )}
              <p className="mt-2 break-words text-muted-foreground">
                {catalogSourceLicenseText(s.license ?? '', t)}
              </p>
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

      <section className="min-w-0">
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.imported')}</h2>
        <ul className="space-y-2 text-sm">
          {manifest.imported.map((row) => {
            const prov = asProvenanceClass(row.provenance_class);
            return (
              <li key={row.slug} className="min-w-0 rounded-xl border bg-card/60 p-3">
                <div className="font-medium break-words">{row.name}</div>
                {prov && (
                  <div className="mt-1">
                    <SourceBadge provenanceClass={prov} compact />
                  </div>
                )}
                {row.url && (
                  <a
                    className="mt-1 inline-flex min-h-11 max-w-full items-center text-xs text-primary underline decoration-primary/40 underline-offset-2"
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    title={row.url}
                  >
                    <span className="break-all">{shortenSourceUrl(row.url)}</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="min-w-0">
        <h2 className="text-lg font-medium mb-2">{t('nutrient.sources.missing')}</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {manifest.missing.map((row) => (
            <li key={row.manufacturer} className="min-w-0 break-words rounded-lg border border-dashed p-3">
              <strong className="text-foreground">{row.manufacturer}</strong>: {row.reason}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
