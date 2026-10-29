import { buildLocaleBootstrapScript } from '@/lib/i18n/locales';
import { LOCALE_HREFLANG, type Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import Document, { Head, Html, Main, NextScript, type DocumentContext } from 'next/document';
import React from 'react';

type GrowlogDocumentProps = {
  locale: Locale;
};

export default class GrowlogDocument extends Document<GrowlogDocumentProps> {
  render() {
    const lang = LOCALE_HREFLANG[this.props.locale] ?? 'en';

    return (
      <Html lang={lang} suppressHydrationWarning>
        <Head>
          <script
            dangerouslySetInnerHTML={{ __html: buildLocaleBootstrapScript() }}
          />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Growlog • OG Lab" />
          <meta name="theme-color" content="#536C4A" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

GrowlogDocument.getInitialProps = async (ctx: DocumentContext) => {
  const initialProps = await Document.getInitialProps(ctx);
  const locale = resolveServerLocale(ctx);
  return { ...initialProps, locale };
};
