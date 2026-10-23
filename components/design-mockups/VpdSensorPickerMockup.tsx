'use client';

import { MockupAppShell } from '@/components/design-mockups/MockupAppShell';
import { MockupVpdWidgetPanel } from '@/components/design-mockups/MockupVpdWidgetPanel';
import { cn } from '@/lib/utils';

const SENSORS = [
  { name: 'Датчик гроубокса', detail: '58 % · влажность' },
  { name: 'Будка у окна', detail: '61 % · влажность' },
  { name: 'Климат-станция', detail: '24,1 °C · воздух' },
];

/** Долгое нажатие на метрику — лист выбора датчика (как `Popover` в `VpdWidget`). */
export function VpdSensorPickerMockup() {
  return (
    <div className="relative h-full min-h-[844px] w-full">
      <MockupAppShell title="Фокус дня" activeTab="home" dimmed>
        <div className="opacity-40">
          <MockupVpdWidgetPanel />
        </div>
      </MockupAppShell>

      <div className="absolute inset-0 z-30 bg-foreground/20" aria-hidden />

      <div
        className="absolute inset-x-0 bottom-0 z-40 flex max-h-[70%] flex-col rounded-t-2xl border border-border bg-card shadow-[var(--elev-2)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="px-4 pb-2 pt-3">
          <h2 className="text-base font-semibold">Датчик влажности</h2>
          <p className="text-xs text-muted-foreground">SmartLife · привязка до следующей смены</p>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-2">
          {SENSORS.map((s, i) => (
            <li key={s.name}>
              <button
                type="button"
                className={cn(
                  'flex min-h-11 w-full flex-col items-start rounded-xl px-3 py-2.5 text-left text-sm',
                  i === 0 ? 'bg-primary/10' : 'hover:bg-muted/50'
                )}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        <div
          className="border-t border-grow-leaf/15 bg-card/95 px-1 pt-1 opacity-80"
          style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
        >
          <p className="py-2 text-center text-[10px] text-muted-foreground">Нижняя панель остаётся на месте</p>
        </div>
      </div>
    </div>
  );
}
