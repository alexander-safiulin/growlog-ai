'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { MockupSparkline } from '@/components/design-mockups/MockupSparkline';
import { Button } from '@/components/ui/button';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { previewFeedSystem, previewGrowCycle } from '@/lib/preview/mock-farm-data';
import { cn } from '@/lib/utils';
import { MockupTaskRow } from '@/components/design-mockups/MockupTaskRow';
import { Beaker, CalendarClock, ClipboardCheck, Leaf, Repeat } from 'lucide-react';
import { useState } from 'react';

type SectionId = 'overview' | 'chronology' | 'feeding';

const TAB_ITEMS = [
  { id: 'overview' as const, label: 'Обзор' },
  { id: 'chronology' as const, label: 'Хронология' },
  { id: 'feeding' as const, label: 'Питание' },
];

const CHRONOLOGY_EVENTS = [
  {
    id: 'c1',
    type: 'Кормление',
    at: '2026-03-23T09:15:00',
    title: 'Кормление',
    body: 'EC 1,6 мСм/см, pH 5,8. Раствор Coco A+B, неделя 4.',
  },
  {
    id: 'c2',
    type: 'Кормление',
    at: '2026-03-20T09:00:00',
    title: 'Кормление',
    body: 'EC 1,4 мСм/см. Переход на шаг недели 4.',
  },
  {
    id: 'c3',
    type: 'Полив',
    at: '2026-03-21T11:00:00',
    title: 'Полив',
    body: 'Сток 12 %.',
  },
  {
    id: 'c4',
    type: 'Наблюдение',
    at: '2026-03-22T20:40:00',
    body: 'Влажность ночью чуть выше нормы.',
  },
];

function CycleDetailSubtitle() {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span>Вегетация · день 24</span>
      <span
        className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
      >
        Активен
      </span>
    </div>
  );
}

function CycleDetailStickyTabs({
  section,
  setSection,
}: {
  section: SectionId;
  setSection: (s: SectionId) => void;
}) {
  return (
    <div
      className="-mx-4 sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 pb-2 pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
    >
      <ScrollableTabs
        items={TAB_ITEMS}
        value={section}
        onChange={setSection}
        aria-label="Разделы цикла"
      />
    </div>
  );
}

export function CycleDetailMockup({ initialSection = 'overview' }: { initialSection?: SectionId }) {
  const cycle = previewGrowCycle;
  const [section, setSection] = useState<SectionId>(initialSection);
  const activeStep = previewFeedSystem.steps.find((s) => s.id === previewFeedSystem.activeStepId);
  const cultivarTitle = `Сорт ${cycle.cultivar_name ?? 'Критикал'}`;

  return (
    <MockupAppShell
      title={cultivarTitle}
      titleLarge
      subtitleRow={<CycleDetailSubtitle />}
      activeTab="cycles"
    >
      <CycleDetailStickyTabs section={section} setSection={setSection} />

      <div className="mt-3 space-y-3">
        {section === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/70 bg-card p-2.5">
                <p className="text-[11px] text-muted-foreground">EC, мСм/см</p>
                <p className="text-lg font-semibold tabular-nums">1,6</p>
                <MockupSparkline values={[1.2, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6]} />
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-2.5">
                <p className="text-[11px] text-muted-foreground">pH</p>
                <p className="text-lg font-semibold tabular-nums">5,8</p>
                <MockupSparkline
                  values={[5.9, 5.85, 5.82, 5.8, 5.79, 5.8, 5.81, 5.8]}
                  strokeClassName="stroke-emerald-600 dark:stroke-emerald-400"
                  fillClassName="fill-emerald-500/10"
                />
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-left"
            >
              <p className="text-[11px] text-muted-foreground">Дефицит влаги (VPD) · SmartLife</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                1,12 кПа
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Нажмите — виджет и пробные значения</p>
            </button>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Beaker className="h-4 w-4" />
                {previewFeedSystem.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeStep?.week_label ?? 'Неделя 4'} · цель EC{' '}
                <span className="tabular-nums text-foreground">
                  {activeStep?.ec_target_ms_cm?.toString().replace('.', ',')} мСм/см
                </span>
              </p>
              <Button className="mt-2.5 h-11 w-full rounded-xl text-sm" size="sm">
                Открыть в калькуляторе
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" />
                Ближайшее
              </p>
              <ul className="divide-y divide-border/60">
                <li>
                  <MockupTaskRow label="Кормление" state="open" trailing="завтра, 09:00" />
                </li>
                <li>
                  <MockupTaskRow label="Формировка кроны" state="overdue" />
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                События
              </p>
              <p className="text-sm text-muted-foreground">Последнее кормление: сегодня, 09:15</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-xl text-sm">
                Сбор урожая
              </Button>
              <Button variant="secondary" className="h-11 gap-1.5 rounded-xl text-sm">
                <Repeat className="h-4 w-4" />
                Повторить цикл
              </Button>
            </div>
          </>
        )}

        {section === 'chronology' && (
          <ul className="space-y-0">
            {CHRONOLOGY_EVENTS.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <div className="flex w-3 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'mt-2 h-2 w-2 rounded-full',
                      e.type === 'Кормление' ? 'bg-primary' : 'bg-muted-foreground/50'
                    )}
                  />
                  {i < CHRONOLOGY_EVENTS.length - 1 && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(e.at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    <span className="ml-1 font-medium text-primary">{e.type}</span>
                  </p>
                  {e.title && <p className="text-sm font-medium">{e.title}</p>}
                  <p className="text-sm leading-snug text-muted-foreground">{e.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {section === 'feeding' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Шаги системы питания</p>
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
                      {active && <span className="text-[10px] font-semibold text-primary">Текущий</span>}
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
