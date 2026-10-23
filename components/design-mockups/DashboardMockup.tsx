'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { Button } from '@/components/ui/button';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Brain,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

export function DashboardMockup() {
  const [focusTab, setFocusTab] = useState<'today' | 'week'>('today');

  return (
    <MockupAppShell title="Фокус дня" activeTab="home">
      <div className="space-y-4">
        <section className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-4 shadow-[var(--elev-1)]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Снимок цикла</p>
          <p className="mt-1 text-xl font-semibold leading-tight">Весна 2026</p>
          <p className="text-sm text-muted-foreground">День 24 · вегетация · Blue Dream</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1 tabular-nums">
              Сегодня в журнале: <strong className="text-foreground">3</strong>
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 tabular-nums">
              VPD <strong className="text-emerald-600 dark:text-emerald-400">1,12 кПа</strong>
            </span>
          </div>
        </section>

        <ScrollableTabs
          items={[
            { id: 'today', label: 'Сегодня' },
            { id: 'week', label: 'Неделя' },
          ]}
          value={focusTab}
          onChange={setFocusTab}
          aria-label="Период фокуса"
        />

        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-sm">Влажность растёт ночью</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                За три ночи: 58 → 62 → 65 %. Стоит проверить отток воздуха до перехода в цветение.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--elev-1)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Регламенты на сегодня</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">2 из 3</span>
          </div>
          <ul className="mt-3 space-y-2">
            {[
              { label: 'Проверить pH и EC', state: 'done' },
              { label: 'LST по кроне', state: 'overdue' },
              { label: 'Полив по весу горшка', state: 'open' },
            ].map((item) => (
              <li
                key={item.label}
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm"
              >
                <span className={cn(item.state === 'done' && 'text-muted-foreground line-through')}>
                  {item.label}
                  {item.state === 'overdue' && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">· просрочено</span>
                  )}
                </span>
                <Button size="sm" variant="outline" className="h-9 shrink-0 rounded-lg px-3">
                  {item.state === 'done' ? 'Готово' : 'Выполнить'}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-grow-leaf/20 bg-grow-sage/25 p-4 dark:bg-grow-sage/10">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Brain className="h-4 w-4" />
            Фокус ИИ
            <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              уверенность: средняя
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
            Кормления стабильны; EC в целевом коридоре. Следующий шаг — зафиксировать высоту куста для сравнения через неделю.
          </p>
          <Button variant="outline" size="sm" className="mt-3 h-11 w-full rounded-xl">
            Обсудить с ассистентом
          </Button>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-[var(--elev-1)]"
          >
            <Droplets className="h-4 w-4 text-primary" />
            Замер
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-[var(--elev-1)]"
          >
            <CalendarClock className="h-4 w-4 text-primary" />
            Календарь
          </button>
        </section>

        <button
          type="button"
          className="flex w-full min-h-11 items-center justify-between rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground"
        >
          Недавняя история
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </MockupAppShell>
  );
}
