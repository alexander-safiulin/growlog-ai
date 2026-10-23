'use client';

import { AppBrandLine } from '@/components/layout/AppBrandLine';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Home,
  List,
  MoreHorizontal,
  Plus,
  Settings2,
  Thermometer,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type MockupTabId = 'home' | 'journal' | 'capture' | 'cycles' | 'more';

const TAB_ITEMS: { id: MockupTabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'journal', label: 'Журнал', icon: List },
  { id: 'capture', label: 'Запись', icon: Plus },
  { id: 'cycles', label: 'Циклы', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: MoreHorizontal },
];

export function MockupContextLine() {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Домашний сетап · <span className="text-foreground">Весна 2026</span> ·{' '}
      <span className="text-foreground">Гроубокс 1</span>
    </p>
  );
}

export function MockupAppShell({
  title,
  activeTab,
  children,
  headerExtra,
  dimmed,
}: {
  title: string;
  activeTab: MockupTabId;
  children: ReactNode;
  headerExtra?: ReactNode;
  /** For sheet overlays: keep tab bar visible but subdued */
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative isolate flex h-full min-h-[844px] w-full flex-col overflow-hidden bg-background text-foreground',
        dimmed && 'pointer-events-none'
      )}
    >
      <header className="shrink-0 border-b border-grow-leaf/15 bg-card/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="px-4 pb-3 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <AppBrandLine />
              <h1 className="mt-1 truncate text-lg font-semibold leading-tight">{title}</h1>
              <MockupContextLine />
            </div>
            {headerExtra ?? (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"
                  aria-label="Климат и замеры"
                >
                  <Thermometer className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"
                  aria-label="Настройки"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      </main>

      <nav
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 shrink-0 border-t border-grow-leaf/15 bg-card/95 backdrop-blur-md',
          dimmed && 'opacity-55'
        )}
        aria-label="Основная навигация"
      >
        <div
          className="flex items-end justify-between px-0.5 pt-1"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const isCapture = id === 'capture';
            if (isCapture) {
              return (
                <button
                  key={id}
                  type="button"
                  className="relative -mt-4 flex min-w-[4.25rem] flex-col items-center gap-0.5"
                >
                  <span
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl shadow-[var(--elev-2)]',
                      active
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    <Plus className="h-7 w-7" />
                  </span>
                  <span className="text-[10px] font-semibold text-primary">{label}</span>
                </button>
              );
            }
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex min-h-11 min-w-[3.1rem] flex-1 flex-col items-center justify-center rounded-xl py-1 text-[10px] font-semibold',
                  active ? 'bg-primary/12 text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
