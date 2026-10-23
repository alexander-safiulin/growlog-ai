import { buildLocaleBootstrapScript } from '@/lib/i18n/locales';
import { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <script
          dangerouslySetInnerHTML={{ __html: buildLocaleBootstrapScript() }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
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
