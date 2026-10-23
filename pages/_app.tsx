import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import type { AppProps } from 'next/app';
import { AppProviders } from '@/components/providers/AppProviders';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import type { Locale } from '@/lib/i18n/locales';
import App, { type AppContext } from 'next/app';

type GrowlogAppProps = AppProps & {
  pageProps: AppProps['pageProps'] & { initialLocale?: Locale };
};

function GrowlogApp({ Component, pageProps }: GrowlogAppProps) {
  const initialLocale = pageProps.initialLocale;
  return (
    <AppProviders initialLocale={initialLocale}>
      <Component {...pageProps} />
    </AppProviders>
  );
}

GrowlogApp.getInitialProps = async (appCtx: AppContext) => {
  const appProps = await App.getInitialProps(appCtx);
  const initialLocale = resolveServerLocale(appCtx.ctx);
  return {
    ...appProps,
    pageProps: {
      ...appProps.pageProps,
      initialLocale,
    },
  };
};

export default GrowlogApp;
