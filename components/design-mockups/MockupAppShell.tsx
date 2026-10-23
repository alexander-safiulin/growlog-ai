'use client';

import { AppBrandLine } from '@/components/layout/AppBrandLine';
import { cn } from '@/lib/utils';
import {
  Beaker,
  ClipboardList,
  Home,
  List,
  Mic,
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
  { id: 'capture', label: 'Запись', icon: Mic },
  { id: 'cycles', label: 'Циклы', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: MoreHorizontal },
];

export function MockupAppShell({
  title,
  activeTab,
  children,
  headerExtra,
  hideBottomNav,
}: {
  title: string;
  activeTab: MockupTabId;
  children: ReactNode;
  headerExtra?: ReactNode;
  hideBottomNav?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden bg-background text-foreground shadow-2xl ring-1 ring-border/60">
      <header className="shrink-0 border-b border-grow-leaf/15 bg-card/90 backdrop-blur-md">
        <div className="px-4 pb-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <AppBrandLine />
              <h1 className="mt-0.5 truncate text-lg font-semibold leading-tight">{title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Домашний сетап · <span className="text-foreground">Весна 2026</span> · Main
              </p>
            </div>
            {headerExtra ?? (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="Сенсоры"
                >
                  <Thermometer className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="Настройки"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">{children}</main>

      {!hideBottomNav && (
        <nav
          className="shrink-0 border-t border-grow-leaf/15 bg-card/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          aria-label="Основная навигация"
        >
          <div className="flex items-end justify-between px-1 pt-1">
            {TAB_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              const isCapture = id === 'capture';
              if (isCapture) {
                return (
                  <button
                    key={id}
                    type="button"
                    className="relative -mt-5 flex min-w-[4rem] flex-col items-center gap-0.5"
                  >
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--elev-2)]"
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
                    'flex min-h-11 min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-semibold transition-colors',
                    active
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="mb-0.5 h-5 w-5" />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 px-4 pb-1 pt-0.5 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Beaker className="h-3 w-3" />
              Питание
            </span>
            <span>SOP</span>
            <span>Отчёты</span>
          </div>
        </nav>
      )}
    </div>
  );
}
