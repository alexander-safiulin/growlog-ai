import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { NutrientSourcesView } from '@/components/nutrient/NutrientSourcesView';
import { HreflangHead } from '@/components/layout/HreflangHead';
import type { CatalogBundle, ManufacturerManifestP4 } from '@/lib/nutrient/catalog-types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GetStaticProps } from 'next';

interface Props {
  catalog: CatalogBundle;
  manifest: ManufacturerManifestP4;
}

export default function NutrientSourcesPage({ catalog, manifest }: Props) {
  return (
    <>
      <HreflangHead path="/nutrient/sources" />
      <NutrientPageShell titleKey="titles.nutrientSources">
        <NutrientSourcesView catalog={catalog} manifest={manifest} />
      </NutrientPageShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const root = process.cwd();
  const catalog = JSON.parse(
    readFileSync(path.join(root, 'supabase/seed/nutrient/adr014-catalog.bundle.json'), 'utf8'),
  ) as CatalogBundle;
  const manifest = JSON.parse(
    readFileSync(path.join(root, 'supabase/seed/nutrient/manufacturers/manifest-p4.json'), 'utf8'),
  ) as ManufacturerManifestP4;
  return { props: { catalog, manifest } };
};
