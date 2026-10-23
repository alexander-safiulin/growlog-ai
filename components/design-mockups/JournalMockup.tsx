'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { Field } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { previewTimelineEvents } from '@/lib/preview/mock-farm-data';
import { Camera, Filter, Mic, Search } from 'lucide-react';
import { useState } from 'react';

const EVENT_LABELS: Record<string, string> = {
  feeding: 'Кормление',
  observation: 'Наблюдение',
  watering: 'Полив',
  note: 'Заметка',
  issue_detected: 'Проблема',
};

export function JournalMockup() {
  const [view, setView] = useState<'feed' | 'calendar'>('feed');

  return (
    <MockupAppShell title="Журнал" activeTab="journal">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              readOnly
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm"
              placeholder="Поиск по записям"
              value=""
            />
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background"
            aria-label="Фильтр"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        <ScrollableTabs
          items={[
            { id: 'feed', label: 'Лента' },
            { id: 'calendar', label: 'Календарь' },
          ]}
          value={view}
          onChange={setView}
          aria-label="Вид журнала"
        />

        <NativeSelect className="h-11 rounded-xl" value="all">
          <option value="all">Все типы событий</option>
          <option value="feeding">Кормление</option>
          <option value="observation">Наблюдение</option>
        </NativeSelect>

        <ul className="space-y-3">
          {previewTimelineEvents.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-border/80 bg-card p-3 shadow-[var(--elev-1)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-primary">
                  {EVENT_LABELS[e.event_type] ?? e.event_type}
                </span>
                <time className="text-[11px] text-muted-foreground tabular-nums">
                  {new Date(e.occurred_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              {e.title && <p className="mt-1 text-sm font-medium">{e.title}</p>}
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
            </li>
          ))}
        </ul>

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-semibold">Быстрая запись</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
            >
              <Mic className="h-4 w-4" />
              Голос
            </button>
            <button
              type="button"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium"
            >
              <Camera className="h-4 w-4" />
              Фото
            </button>
          </div>
          <Field label="Текст" className="mt-3">
            <textarea
              readOnly
              className="min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Что сделали или заметили"
            />
          </Field>
        </section>
      </div>
    </MockupAppShell>
  );
}
