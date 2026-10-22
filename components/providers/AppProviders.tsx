'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { FarmProvider } from '@/components/providers/FarmProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import type { Locale } from '@/lib/i18n/locales';

export function AppProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <I18nProvider initialLocale={initialLocale}>
          <FarmProvider>{children}</FarmProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
