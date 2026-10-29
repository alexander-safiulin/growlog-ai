import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { NutrientSourcesView } from '@/components/nutrient/NutrientSourcesView';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import type { CatalogBundle, ManufacturerManifestP4 } from '@/lib/nutrient/catalog-types';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GetServerSideProps } from 'next';

interface Props {
  catalog: CatalogBundle;
  manifest: ManufacturerManifestP4;
  locale: Locale;
}

export default function NutrientSourcesPage({ catalog, manifest, locale }: Props) {
  const { title, description } = publicSeoCopy('nutrientSources', locale);

  return (
    <>
      <PublicSeoHead path="/nutrient/sources" title={title} description={description} locale={locale} />
      <NutrientPageShell titleKey="titles.nutrientSources">
        <NutrientSourcesView catalog={catalog} manifest={manifest} />
      </NutrientPageShell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const root = process.cwd();
  const catalog = JSON.parse(
    readFileSync(path.join(root, 'supabase/seed/nutrient/adr014-catalog.bundle.json'), 'utf8'),
  ) as CatalogBundle;
  const manifest = JSON.parse(
    readFileSync(path.join(root, 'supabase/seed/nutrient/manufacturers/manifest-p4.json'), 'utf8'),
  ) as ManufacturerManifestP4;
  return {
    props: {
      catalog,
      manifest,
      locale: resolveServerLocale(ctx),
    },
  };
};
