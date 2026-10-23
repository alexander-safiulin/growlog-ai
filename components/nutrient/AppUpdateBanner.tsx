'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 3 * 60 * 1000;
const DISMISS_KEY = 'growlog_app_update_banner_dismissed';

export function AppUpdateBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const knownBuildRef = useRef<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/app-build', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { buildId: string };
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === data.buildId) return;
      if (knownBuildRef.current === null) {
        knownBuildRef.current = data.buildId;
        return;
      }
      if (knownBuildRef.current !== data.buildId) {
        setVisible(true);
      }
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    check().catch(() => undefined);
    const interval = window.setInterval(() => {
      check().catch(() => undefined);
    }, POLL_MS);
    const onFocus = () => {
      check().catch(() => undefined);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  if (!visible) return null;

  const reload = () => {
    window.location.reload();
  };

  const dismiss = async () => {
    try {
      const res = await fetch('/api/app-build', { cache: 'no-store' });
      const data = (await res.json()) as { buildId: string };
      sessionStorage.setItem(DISMISS_KEY, data.buildId);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-sm',
        className,
      )}
      role="status"
    >
      <span>{t('nutrient.updateBanner.message')}</span>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" className="min-h-9" onClick={reload}>
          {t('nutrient.updateBanner.reload')}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={dismiss}>
          {t('nutrient.updateBanner.dismiss')}
        </Button>
      </div>
    </div>
  );
}
