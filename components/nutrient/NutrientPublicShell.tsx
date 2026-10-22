'use client';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import Link from 'next/link';

export function NutrientPublicShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-sm">{t('appName')}</Link>
          <nav className="flex gap-3 text-sm">
            <Link href="/nutrient/calculator" className="hover:underline">
              {t('nutrient.nav.calculator')}
            </Link>
            <Link href="/nutrient/sources" className="hover:underline">
              {t('nutrient.nav.sources')}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>
        {children}
      </main>
    </div>
  );
}
