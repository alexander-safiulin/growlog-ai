'use client';

import { GrowEcoBackdrop } from '@/components/layout/GrowEcoBackdrop';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { PageHead } from '@/components/layout/PageHead';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Sprout } from 'lucide-react';

/** Localhost-only snapshot of current onboarding form. */
export default function PreviewOnboardingPage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();

  return (
    <>
      <PageHead titleKey="titles.onboarding" />
      <GrowEcoBackdrop className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="absolute right-4 top-4 flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-4 w-4" />
          </span>
          {t('appName')}
        </Link>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('onboarding.title')}</CardTitle>
            <CardDescription>{t('onboarding.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder={t('onboarding.farmName')} defaultValue="Домашний сетап" readOnly />
            <Input placeholder={t('onboarding.timezone')} defaultValue="Europe/Moscow" readOnly />
            <Input placeholder={t('onboarding.cycleName')} defaultValue={t('onboarding.defaultCycleName')} readOnly />
            <Input placeholder={t('onboarding.cultivar')} defaultValue="Blue Dream" readOnly />
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="veg">veg</option>
            </select>
            <Button type="button" className="w-full">{t('onboarding.submit')}</Button>
          </CardContent>
        </Card>
      </GrowEcoBackdrop>
    </>
  );
}
