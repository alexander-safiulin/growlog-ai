import { DEFAULT_LOCALE, LOCALE_HREFLANG, LOCALES, type Locale } from '@/lib/i18n/locales';
import { getSiteUrl, publicPageUrl } from '@/lib/i18n/site-url';
import Head from 'next/head';

type Props = {
  path: string;
  title: string;
  description: string;
  /** When false, emits noindex (login and other gated entry points). */
  index?: boolean;
  locale?: Locale;
};

/** Server-safe metadata for indexable public marketing routes. */
export function PublicSeoHead({
  path,
  title,
  description,
  index = true,
  locale = DEFAULT_LOCALE,
}: Props) {
  const canonical = publicPageUrl(path, DEFAULT_LOCALE);
  const ogImage = `${getSiteUrl()}/og-logo.jpg`;
  const robots = index ? 'index, follow' : 'noindex, nofollow';

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      {LOCALES.map((loc: Locale) => (
        <link
          key={loc}
          rel="alternate"
          hrefLang={LOCALE_HREFLANG[loc]}
          href={publicPageUrl(path, loc)}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Growlog" />
      <meta property="og:locale" content={LOCALE_HREFLANG[locale]} />
      <meta property="og:url" content={publicPageUrl(path, locale)} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
