'use client';

import { AppBrandLine } from '@/components/layout/AppBrandLine';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';
import { Beaker, BookOpen, HelpCircle, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

function isNutrientNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NutrientPublicShell({
  title,
  titleShort,
  children,
}: {
  title: string;
  titleShort?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { pathname } = useRouter();

  const bottomNav = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/nutrient/calculator', label: t('nutrient.nav.calculator'), icon: Beaker },
    { href: '/nutrient/sources', label: t('nutrient.nav.sources'), icon: BookOpen },
    { href: '/nutrient/help', label: t('nutrient.nav.help'), icon: HelpCircle },
  ];

  const headerTitle = titleShort ?? title;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-grow-leaf/15 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href="/" className="inline-block max-w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <AppBrandLine />
            </Link>
            <h1 className="text-base font-semibold leading-snug line-clamp-2 sm:line-clamp-1" title={title}>
              {headerTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-lg min-w-0 flex-1 px-4 py-4 pb-[calc(4.25rem+max(0.5rem,env(safe-area-inset-bottom)))]"
      >
        {children}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-grow-leaf/15 bg-card/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label={t('nav.main')}
      >
        <div className="mx-auto flex max-w-lg justify-between gap-0.5 px-1 pt-1">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = isNutrientNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-0.5 py-1.5 text-[9px] font-medium transition-colors sm:text-[10px]',
                  active
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                <Icon className="mb-0.5 h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                <span className="max-w-full truncate text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
