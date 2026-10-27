'use client';

import { NutrientHelpPageContent } from '@/components/nutrient/help/NutrientHelpPageContent';
import { AppBrandLine } from '@/components/layout/AppBrandLine';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import Link from 'next/link';

export function SiteHelpPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-grow-leaf/15 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <AppBrandLine />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/nutrient/calculator"
              className="hidden text-muted-foreground transition-colors hover:text-grow-leaf sm:inline"
            >
              {t('titles.nutrientCalculatorShort')}
            </Link>
            <Link href="/auth/login" className="text-muted-foreground transition-colors hover:text-grow-leaf">
              {t('landing.signIn')}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <NutrientHelpPageContent />
      </main>
    </div>
  );
}
