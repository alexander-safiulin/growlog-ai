import { SiteHelpPage } from '@/components/help/SiteHelpPage';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import type { GetServerSideProps } from 'next';

type Props = { locale: Locale };

export default function HelpPage({ locale }: Props) {
  const { title, description } = publicSeoCopy('help', locale);

  return (
    <>
      <PublicSeoHead path="/help" title={title} description={description} locale={locale} />
      <SiteHelpPage />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => ({
  props: { locale: resolveServerLocale(ctx) },
});
