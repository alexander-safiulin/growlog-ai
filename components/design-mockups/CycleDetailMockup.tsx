'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { Button } from '@/components/ui/button';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { previewFeedSystem, previewGrowCycle, previewTimelineEvents } from '@/lib/preview/mock-farm-data';
import { cn } from '@/lib/utils';
import { Beaker, ChevronRight, Leaf, Link2, Sprout } from 'lucide-react';
import { useState } from 'react';

export function CycleDetailMockup() {
  const cycle = previewGrowCycle;
  const [section, setSection] = useState<'overview' | 'timeline' | 'feeding'>('overview');
  const activeStep = previewFeedSystem.steps.find((s) => s.id === previewFeedSystem.activeStepId);

  return (
    <MockupAppShell title={cycle.name} activeTab="cycles" hideBottomNav>
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--elev-1)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sprout className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{cycle.cultivar_name}</p>
              <p className="text-sm text-muted-foreground">
                {cycle.stage === 'veg' ? 'Вегетация' : cycle.stage} · с{' '}
                {new Date(cycle.start_date).toLocaleDateString('ru-RU')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Партия {cycle.batch_code}</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Активен
            </span>
          </div>
        </section>

        <ScrollableTabs
          items={[
            { id: 'overview', label: 'Обзор' },
            { id: 'timeline', label: 'Таймлайн' },
            { id: 'feeding', label: 'Питание' },
          ]}
          value={section}
          onChange={setSection}
          aria-label="Разделы цикла"
        />

        {section === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'День цикла', value: '24' },
                { label: 'Записей', value: '47' },
                { label: 'Цель EC', value: '1,6' },
                { label: 'Область', value: 'Main' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/70 bg-background px-3 py-2.5"
                >
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="flex w-full min-h-11 items-center justify-between rounded-xl border border-border bg-card px-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Система питания: {previewFeedSystem.name}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {section === 'timeline' && (
          <ul className="space-y-2">
            {previewTimelineEvents.map((e) => (
              <li key={e.id} className="flex gap-3">
                <div className="flex w-3 shrink-0 flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {new Date(e.occurred_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm font-medium">{e.title ?? e.event_type}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {section === 'feeding' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Beaker className="h-4 w-4" />
                Привязанная система
              </div>
              <p className="mt-1 text-sm">{previewFeedSystem.name}</p>
              {activeStep && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Активный шаг: {activeStep.week_label} · EC{' '}
                  <span className="tabular-nums text-foreground">
                    {activeStep.ec_target_ms_cm?.toString().replace('.', ',')} мСм/см
                  </span>
                  · pH{' '}
                  <span className="tabular-nums text-foreground">
                    {activeStep.ph_target?.toString().replace('.', ',')}
                  </span>
                </p>
              )}
              <Button className="mt-3 h-11 w-full rounded-xl" size="sm">
                Открыть калькулятор
              </Button>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Шаги плана</p>
            <ul className="space-y-2">
              {previewFeedSystem.steps.map((step) => {
                const active = step.id === previewFeedSystem.activeStepId;
                return (
                  <li
                    key={step.id}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-sm',
                      active ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{step.week_label}</span>
                      {active && (
                        <span className="text-[10px] font-semibold uppercase text-primary">Сейчас</span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      <Leaf className="mr-1 inline h-3.5 w-3.5" />
                      EC {step.ec_target_ms_cm?.toString().replace('.', ',')} · pH{' '}
                      {step.ph_target?.toString().replace('.', ',')}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </MockupAppShell>
  );
}
