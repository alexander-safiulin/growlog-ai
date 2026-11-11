'use client';

import { useFarmAiLocale } from '@/lib/i18n/use-farm-ai-locale';
import { useTranslation } from '@/components/providers/I18nProvider';
import { PRODUCT_LOCALES, PRODUCT_LOCALE_LABELS, type ProductLocale } from '@/lib/i18n/locales';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AiLanguagePreference() {
  const { t } = useTranslation();
  const { aiLocale, setAiLocale, syncing } = useFarmAiLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.aiLanguageTitle')}</CardTitle>
        <CardDescription>{t('settings.aiLanguageDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <select
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={aiLocale}
          disabled={syncing}
          onChange={(e) => void setAiLocale(e.target.value as ProductLocale)}
        >
          {PRODUCT_LOCALES.map((code) => (
            <option key={code} value={code}>
              {PRODUCT_LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
