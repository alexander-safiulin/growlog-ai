'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/components/providers/I18nProvider';
import {
  hasUsableTargetPpm,
  targetPpmFromAchievedSolution,
} from '@/lib/nutrient/save-custom-target-profile';
import { useState } from 'react';

export function SaveCustomTargetProfileBlock({
  achievedPpm,
  onSave,
  disabled,
}: {
  achievedPpm: Record<string, number> | null | undefined;
  onSave: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetPpm = achievedPpm ? targetPpmFromAchievedSolution(achievedPpm) : {};
  const canSave = !disabled && hasUsableTargetPpm(targetPpm) && name.trim().length > 0;

  const onClick = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    try {
      const slug = await onSave(name.trim(), targetPpm);
      if (slug) {
        setStatus(t('nutrient.saveTargetProfile.done'));
      } else {
        setStatus(t('common.error'));
      }
    } catch {
      setStatus(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!hasUsableTargetPpm(targetPpm)) {
    return (
      <p className="text-xs text-muted-foreground">{t('nutrient.saveTargetProfile.needMix')}</p>
    );
  }

  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <p className="text-xs text-muted-foreground">{t('nutrient.saveTargetProfile.hint')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="h-11 flex-1 rounded-xl"
          placeholder={t('nutrient.saveTargetProfile.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 shrink-0 rounded-xl"
          disabled={!canSave || saving}
          onClick={() => void onClick()}
        >
          {t('nutrient.saveTargetProfile.action')}
        </Button>
      </div>
      {status ? <p className="text-xs text-muted-foreground text-center">{status}</p> : null}
    </div>
  );
}
