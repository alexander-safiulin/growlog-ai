'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Sprout } from 'lucide-react';

const CYCLES = [
  {
    id: 'active',
    name: 'Весна 2026',
    cultivar: 'Критикал',
    stage: 'Вегетация',
    day: 24,
    status: 'active' as const,
  },
  {
    id: 'past',
    name: 'Зима 2025',
    cultivar: 'Северный свет',
    stage: 'Завершён',
    day: 84,
    status: 'harvested' as const,
  },
];

export function CyclesListMockup() {
  return (
    <MockupAppShell title="Циклы" activeTab="cycles">
      <div className="space-y-3">
        <Button className="h-11 w-full rounded-xl gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Новый цикл
        </Button>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Активный</p>
        {CYCLES.filter((c) => c.status === 'active').map((c) => (
          <article
            key={c.id}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5 shadow-[var(--elev-1)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sprout className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.cultivar} · {c.stage}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">День {c.day}</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                Сейчас
              </span>
            </div>
          </article>
        ))}

        <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Архив</p>
        <ul className="space-y-2">
          {CYCLES.filter((c) => c.status === 'harvested').map((c) => (
            <li
              key={c.id}
              className={cn(
                'rounded-xl border border-border bg-card p-3.5',
                'flex items-center justify-between gap-2'
              )}
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.cultivar} · {c.day} дней</p>
              </div>
              <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-lg text-xs">
                Повторить
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </MockupAppShell>
  );
}
