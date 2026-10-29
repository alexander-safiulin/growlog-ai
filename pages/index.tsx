import { LandingAuthRedirect } from '@/components/landing/LandingAuthRedirect';
import { LandingPageContent } from '@/components/landing/LandingPageContent';
import { JsonLdHead } from '@/components/seo/JsonLdHead';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import { buildGrowlogJsonLd } from '@/lib/seo/json-ld';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import type { GetServerSideProps } from 'next';

type Props = { locale: Locale };

export default function HomePage({ locale }: Props) {
  const { title, description } = publicSeoCopy('home', locale);

  return (
    <>
      <PublicSeoHead path="/" title={title} description={description} locale={locale} />
      <JsonLdHead graphs={buildGrowlogJsonLd()} />
      <LandingPageContent locale={locale} />
      <LandingAuthRedirect />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => ({
  props: { locale: resolveServerLocale(ctx) },
});
