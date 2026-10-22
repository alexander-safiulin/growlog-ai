'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { canAssignLeaf, type ParsedClimatePoint, type VpdBandStatus } from '@growlog/domain';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Droplets, Leaf, Thermometer } from 'lucide-react';
import { useVpdClimate } from './useVpdClimate';

type PickerMode = 'air' | 'leaf' | 'rh' | null;

function bandClass(status: VpdBandStatus): string {
  if (status === 'below') return 'text-sky-600 dark:text-sky-400';
  if (status === 'above') return 'text-amber-600 dark:text-amber-400';
  if (status === 'in_range') return 'text-emerald-600 dark:text-emerald-400';
  return 'text-foreground';
}

type VpdWidgetProps = {
  cycleStage?: string | null;
};

export function VpdWidget({ cycleStage }: VpdWidgetProps) {
  const { t } = useTranslation();
  const climate = useVpdClimate(cycleStage);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [editingField, setEditingField] = useState<'air' | 'leaf' | 'rh' | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const errorCode = (climate.devicesQuery.error as Error & { errorCode?: string } | null)
    ?.errorCode;

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const startLongPress = (mode: PickerMode) => {
    clearLongPress();
    longPressTriggeredRef.current = false;
    longPressRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setPickerMode(mode);
      setEditingField(null);
    }, 500);
  };

  const openPicker = (mode: PickerMode) => {
    setPickerMode(mode);
    setEditingField(null);
  };

  const pointToRef = (p: ParsedClimatePoint) => ({
    deviceId: p.deviceId,
    deviceName: p.deviceName,
    code: p.code,
  });

  const renderPickerList = () => {
    if (pickerMode === 'rh') {
      return (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {climate.rhPoints.map((p) => (
            <li key={`${p.deviceId}:${p.code}`}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 font-normal"
                onClick={() => {
                  climate.assignRh(pointToRef(p));
                  setPickerMode(null);
                }}
              >
                <span className="font-medium">{p.deviceName}</span>
                <span className="ml-2 text-muted-foreground">
                  {p.valueRhPct != null ? `${p.valueRhPct}%` : ''} · {p.code}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      );
    }
    if (pickerMode === 'air' || pickerMode === 'leaf') {
      return (
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {pickerMode === 'leaf' ? (
            <li>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5"
                onClick={() => {
                  climate.assignLeaf(null);
                  setPickerMode(null);
                }}
              >
                {t('vpd.clearLeaf')}
              </Button>
            </li>
          ) : null}
          {climate.tempPoints
            .filter((p) => pickerMode !== 'leaf' || canAssignLeaf(pointToRef(p), climate.assignment))
            .map((p) => (
            <li key={`${p.deviceId}:${p.code}`}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 font-normal"
                onClick={() => {
                  if (pickerMode === 'air') climate.assignAir(pointToRef(p));
                  else climate.assignLeaf(pointToRef(p));
                  setPickerMode(null);
                }}
              >
                <span className="font-medium">{p.deviceName}</span>
                <span className="ml-2 text-muted-foreground">
                  {p.valueCelsius != null ? `${p.valueCelsius}°C` : ''} · {p.code}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  const pickerTitle =
    pickerMode === 'air'
      ? t('vpd.pickAirSource')
      : pickerMode === 'leaf'
        ? t('vpd.pickLeafSource')
        : pickerMode === 'rh'
          ? t('vpd.pickRhSource')
          : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{t('vpd.title')}</CardTitle>
            <CardDescription>{t('vpd.desc')}</CardDescription>
          </div>
          {climate.isPreview ? (
            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {t('vpd.preview')}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {climate.devicesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('vpd.loading')}</p>
        ) : null}
        {climate.devicesQuery.isError && errorCode === 'tuya_unconfigured' ? (
          <p className="text-sm text-muted-foreground">{t('vpd.unconfigured')}</p>
        ) : null}
        {climate.devicesQuery.isError && errorCode !== 'tuya_unconfigured' ? (
          <p className="text-sm text-destructive">{t('vpd.error')}</p>
        ) : null}
        {!climate.devicesQuery.isLoading &&
        !climate.devicesQuery.isError &&
        climate.points.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('vpd.empty')}</p>
        ) : null}

        {climate.points.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('vpd.vpdLabel')}</p>
                <p
                  className={cn(
                    'text-3xl font-semibold tabular-nums tracking-tight',
                    bandClass(climate.bandStatus)
                  )}
                >
                  {climate.vpdDisplay ?? t('vpd.noValue')}
                  {climate.vpdDisplay ? (
                    <span className="ml-1 text-lg font-normal text-muted-foreground">
                      {t('vpd.kpa')}
                    </span>
                  ) : null}
                </p>
                {climate.band && cycleStage ? (
                  <p className="text-xs text-muted-foreground">
                    {t('vpd.targetBand', { stage: cycleStage })} · {climate.band.label}{' '}
                    {t('vpd.kpa')}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t('vpd.longPressHint')}</p>

            <Popover open={pickerMode != null} onOpenChange={(open) => !open && setPickerMode(null)}>
              <PopoverAnchor asChild>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCell
                  label={t('vpd.airTemp')}
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  unit="°C"
                  value={climate.displayAir}
                  deviceLabel={climate.live.airLabel}
                  editing={editingField === 'air'}
                  onStartEdit={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    setEditingField('air');
                  }}
                  onPointerDown={() => startLongPress('air')}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openPicker('air');
                  }}
                  onFocus={() => climate.onPreviewFocus('airTempC')}
                  onCommit={(raw) => {
                    climate.onPreviewCommit('airTempC', raw);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
                {climate.assignment.leafTemp ? (
                  <MetricCell
                    label={t('vpd.leafTemp')}
                    icon={<Leaf className="h-3.5 w-3.5" />}
                    unit="°C"
                    value={climate.displayLeaf}
                    deviceLabel={climate.live.leafLabel}
                    editing={editingField === 'leaf'}
                    onStartEdit={() => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      setEditingField('leaf');
                    }}
                    onPointerDown={() => startLongPress('leaf')}
                    onPointerUp={clearLongPress}
                    onPointerLeave={clearLongPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openPicker('leaf');
                    }}
                    onFocus={() => climate.onPreviewFocus('leafTempC')}
                    onCommit={(raw) => {
                      climate.onPreviewCommit('leafTempC', raw);
                      setEditingField(null);
                    }}
                    onCancel={() => setEditingField(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                    onPointerDown={() => startLongPress('leaf')}
                    onPointerUp={clearLongPress}
                    onPointerLeave={clearLongPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openPicker('leaf');
                    }}
                  >
                    {t('vpd.leafTemp')} — {t('vpd.longPressHint').toLowerCase()}
                  </button>
                )}
                <MetricCell
                  label={t('vpd.humidity')}
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  unit="%"
                  value={climate.displayRh}
                  deviceLabel={climate.live.rhLabel}
                  editing={editingField === 'rh'}
                  onStartEdit={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    setEditingField('rh');
                  }}
                  onPointerDown={() => startLongPress('rh')}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openPicker('rh');
                  }}
                  onFocus={() => climate.onPreviewFocus('rhPct')}
                  onCommit={(raw) => {
                    climate.onPreviewCommit('rhPct', raw);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
              </div>
              </PopoverAnchor>
              <PopoverContent align="start" className="w-80">
                <p className="mb-2 text-sm font-medium">{pickerTitle}</p>
                {renderPickerList()}
              </PopoverContent>
            </Popover>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

type MetricCellProps = {
  label: string;
  icon: ReactNode;
  unit: string;
  value: number | null;
  deviceLabel: string | null;
  editing: boolean;
  onStartEdit: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onFocus: () => void;
  onCommit: (raw: string) => void;
  onCancel: () => void;
};

function MetricCell({
  label,
  icon,
  unit,
  value,
  deviceLabel,
  editing,
  onStartEdit,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onContextMenu,
  onFocus,
  onCommit,
  onCancel,
}: MetricCellProps) {
  const { t } = useTranslation();
  const display =
    value != null ? `${value}${unit === '°C' ? '°C' : unit === '%' ? '%' : unit}` : t('vpd.noValue');

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          {label}
        </p>
        <Input
          type="text"
          inputMode="decimal"
          className="h-8 tabular-nums"
          defaultValue={value != null ? String(value) : ''}
          autoFocus
          onFocus={onFocus}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommit((e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') onCancel();
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
      onClick={onStartEdit}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    >
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{display}</p>
      {deviceLabel ? <p className="truncate text-xs text-muted-foreground">{deviceLabel}</p> : null}
    </button>
  );
}
