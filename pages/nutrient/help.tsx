import { NutrientHelpPageContent } from '@/components/nutrient/help/NutrientHelpPageContent';
import { NutrientPageShell } from '@/components/nutrient/NutrientPageShell';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import type { GetServerSideProps } from 'next';

type Props = { locale: Locale };

export default function NutrientHelpPage({ locale }: Props) {
  const { title, description } = publicSeoCopy('nutrientHelp', locale);

  return (
    <>
      <PublicSeoHead path="/nutrient/help" title={title} description={description} locale={locale} />
      <NutrientPageShell titleKey="titles.nutrientHelp">
        <NutrientHelpPageContent />
      </NutrientPageShell>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => ({
  props: { locale: resolveServerLocale(ctx) },
});
