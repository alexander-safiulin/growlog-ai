import { NutrientCalculatorWorkspace } from '@/components/nutrient/NutrientCalculatorWorkspace';
import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { HreflangHead } from '@/components/layout/HreflangHead';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GetStaticProps } from 'next';

interface Props {
  catalog: CatalogBundle;
}

export default function NutrientCalculatorPage({ catalog }: Props) {
  return (
    <>
      <HreflangHead path="/nutrient/calculator" />
      <NutrientPageShell titleKey="titles.nutrientCalculator">
        <NutrientCalculatorWorkspace catalog={catalog} />
      </NutrientPageShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
  const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as CatalogBundle;
  return { props: { catalog } };
};
