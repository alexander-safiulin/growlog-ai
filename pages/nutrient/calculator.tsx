import dynamic from 'next/dynamic';
import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GetServerSideProps } from 'next';

const NutrientCalculatorWorkspace = dynamic(
  () =>
    import('@/components/nutrient/NutrientCalculatorWorkspace').then((m) => m.NutrientCalculatorWorkspace),
  { ssr: false },
);

interface Props {
  catalog: CatalogBundle;
  locale: Locale;
}

export default function NutrientCalculatorPage({ catalog, locale }: Props) {
  const { title, description } = publicSeoCopy('nutrientCalculator', locale);

  return (
    <>
      <PublicSeoHead
        path="/nutrient/calculator"
        title={title}
        description={description}
        locale={locale}
      />
      <NutrientPageShell titleKey="titles.nutrientCalculator">
        <NutrientCalculatorWorkspace catalog={catalog} />
      </NutrientPageShell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
  const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as CatalogBundle;
  return {
    props: {
      catalog,
      locale: resolveServerLocale(ctx),
    },
  };
};
