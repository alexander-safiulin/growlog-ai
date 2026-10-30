'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { cn } from '@/lib/utils';
import { ImageIcon, Search } from 'lucide-react';
import { useState } from 'react';

type JournalEntry = {
  id: string;
  type: string;
  time: string;
  title?: string;
  body: string;
  hasPhoto?: boolean;
};

const FILTER_CHIPS = ['Все', 'Кормление', 'Полив', 'Наблюдение', 'Фото'] as const;

const GROUPS: { dayLabel: string; entries: JournalEntry[] }[] = [
  {
    dayLabel: 'Сегодня, 23 марта',
    entries: [
      {
        id: 'j1',
        type: 'Кормление',
        time: '09:15',
        title: 'Кормление',
        body: 'EC 1,6 мСм/см, pH 5,8. Листья бодрые.',
        hasPhoto: true,
      },
      {
        id: 'j2',
        type: 'Наблюдение',
        time: '07:40',
        body: 'Верхние узлы тянутся равномерно.',
      },
    ],
  },
  {
    dayLabel: '22 марта',
    entries: [
      {
        id: 'j3',
        type: 'Полив',
        time: '11:00',
        title: 'Полив',
        body: 'Сток 12 %, дренаж чистый.',
      },
      {
        id: 'j4',
        type: 'Фото',
        time: '18:20',
        body: 'Снимок кроны перед формировкой.',
        hasPhoto: true,
      },
    ],
  },
];

export function JournalMockup() {
  const [chip, setChip] = useState<string>('Все');

  return (
    <MockupAppShell title="Журнал" activeTab="journal">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            readOnly
            className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm"
            placeholder="Поиск по записям"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={cn(
                'shrink-0 rounded-full px-3 py-2 text-xs font-semibold min-h-9',
                chip === c
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {GROUPS.map((group) => (
          <section key={group.dayLabel}>
            <h2 className="sticky top-0 z-10 -mx-1 mb-2 bg-background/95 px-1 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
              {group.dayLabel}
            </h2>
            <ul className="space-y-2">
              {group.entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border/80 bg-card p-3 shadow-[var(--elev-1)]"
                >
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-primary">{e.type}</span>
                        <time className="text-[11px] text-muted-foreground tabular-nums">{e.time}</time>
                      </div>
                      {e.title && <p className="mt-0.5 text-sm font-medium">{e.title}</p>}
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">{e.body}</p>
                    </div>
                    {e.hasPhoto && (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"
                        aria-hidden
                      >
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </MockupAppShell>
  );
}
