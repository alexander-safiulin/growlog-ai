'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { VpdSensorPicker } from '@/components/sensors/VpdSensorPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  formatClimateValueRu,
  vpdStageLabelRu,
  type ClimateSourceRow,
  type VpdBandStatus,
} from '@growlog/domain';
import { useRef, useState, type MouseEvent, type ReactNode, type PointerEvent } from 'react';
import { AlertTriangle, Droplets, Leaf, SlidersHorizontal, Thermometer } from 'lucide-react';
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
  cycleId?: string | null;
  zoneId?: string | null;
};

export function VpdWidget({ cycleStage, cycleId, zoneId }: VpdWidgetProps) {
  const { t } = useTranslation();
  const climate = useVpdClimate(cycleStage, { cycleId, zoneId });
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [editingField, setEditingField] = useState<'air' | 'leaf' | 'rh' | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pickerAnchorMode, setPickerAnchorMode] = useState<PickerMode>(null);

  const errorCode = (climate.devicesQuery.error as Error & { errorCode?: string } | null)
    ?.errorCode;

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    pointerStartRef.current = null;
  };

  const openPicker = (mode: PickerMode) => {
    setPickerAnchorMode(mode);
    setPickerMode(mode);
    setEditingField(null);
  };

  const startLongPress = (mode: PickerMode, event: PointerEvent<HTMLElement>) => {
    clearLongPress();
    longPressTriggeredRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openPicker(mode);
    }, 500);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    if (!start || !longPressRef.current) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx > 8 || dy > 8) clearLongPress();
  };

  const pickerTitle =
    pickerMode === 'air'
      ? t('vpd.pickAirSource')
      : pickerMode === 'leaf'
        ? t('vpd.pickLeafSource')
        : pickerMode === 'rh'
          ? t('vpd.pickRhSource')
          : '';

  const stageLabel = vpdStageLabelRu(cycleStage);
  const hasSensors = climate.sourceRows.length > 0;
  const showValues = hasSensors && !climate.devicesQuery.isLoading && !climate.devicesQuery.isError;

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

        {showValues ? (
          <>
            {climate.climateWarning ? (
              <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {climate.zoneWarning ? t('vpd.zoneMismatchWarning') : t('vpd.staleWarning')}
              </p>
            ) : null}

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
                    {t('vpd.targetBand', { stage: stageLabel })} · {climate.band.label}{' '}
                    {t('vpd.kpa')}
                  </p>
                ) : null}
                {climate.autoSelected ? (
                  <p className="text-xs text-muted-foreground">{t('vpd.autoSelected')}</p>
                ) : null}
              </div>
            </div>

            <Popover
              open={pickerMode != null}
              onOpenChange={(open) => {
                if (!open) {
                  setPickerMode(null);
                  setPickerAnchorMode(null);
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCell
                  anchorPicker={pickerAnchorMode === 'air'}
                  label={t('vpd.airTemp')}
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  displayValue={formatClimateValueRu('temp', climate.displayAir)}
                  deviceLabel={climate.live.airLabel}
                  stale={!climate.airRow?.usable}
                  editing={editingField === 'air'}
                  changeLabel={t('vpd.changeSensor')}
                  onOpenPicker={() => openPicker('air')}
                  onStartEdit={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    setEditingField('air');
                  }}
                  onPointerDown={(e) => startLongPress('air', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onFocus={() => climate.onPreviewFocus()}
                  onCommit={(raw) => {
                    climate.onPreviewCommit('airTempC', raw);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
                <MetricCell
                  anchorPicker={pickerAnchorMode === 'leaf'}
                  label={t('vpd.leafTemp')}
                  icon={<Leaf className="h-3.5 w-3.5" />}
                  displayValue={formatClimateValueRu('temp', climate.displayLeaf)}
                  deviceLabel={
                    climate.leafMode === 'estimated'
                      ? t('vpd.leafEstimatedShort')
                      : climate.live.leafLabel
                  }
                  stale={climate.leafMode === 'sensor' && !climate.assignment.leafTemp}
                  editing={editingField === 'leaf'}
                  changeLabel={t('vpd.changeSensor')}
                  onOpenPicker={() => openPicker('leaf')}
                  onStartEdit={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    setEditingField('leaf');
                  }}
                  onPointerDown={(e) => startLongPress('leaf', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onFocus={() => climate.onPreviewFocus()}
                  onCommit={(raw) => {
                    climate.onPreviewCommit('leafTempC', raw);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
                <MetricCell
                  anchorPicker={pickerAnchorMode === 'rh'}
                  label={t('vpd.humidity')}
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  displayValue={formatClimateValueRu('rh', climate.displayRh)}
                  deviceLabel={climate.live.rhLabel}
                  stale={!climate.rhRow?.usable}
                  editing={editingField === 'rh'}
                  changeLabel={t('vpd.changeSensor')}
                  onOpenPicker={() => openPicker('rh')}
                  onStartEdit={() => {
                    if (longPressTriggeredRef.current) {
                      longPressTriggeredRef.current = false;
                      return;
                    }
                    setEditingField('rh');
                  }}
                  onPointerDown={(e) => startLongPress('rh', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onFocus={() => climate.onPreviewFocus()}
                  onCommit={(raw) => {
                    climate.onPreviewCommit('rhPct', raw);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
              </div>
              <PopoverContent align="start" className="w-[min(100vw-2rem,22rem)]">
                <p className="mb-2 text-sm font-medium">{pickerTitle}</p>
                {pickerMode ? (
                  <VpdSensorPicker
                    kind={pickerMode}
                    rows={climate.sourceRows}
                    assignment={climate.assignment}
                    leafMode={climate.leafMode}
                    cycleZoneId={climate.cycleZoneId}
                    onPickAir={(row: ClimateSourceRow) => {
                      climate.assignAir(row.ref);
                      setPickerMode(null);
                    }}
                    onPickRh={(row: ClimateSourceRow) => {
                      climate.assignRh(row.ref);
                      setPickerMode(null);
                    }}
                    onPickLeaf={(row: ClimateSourceRow) => {
                      climate.assignLeaf(row.ref);
                      setPickerMode(null);
                    }}
                    onPickLeafEstimated={() => {
                      climate.assignLeafEstimated();
                      setPickerMode(null);
                    }}
                    onClearLeaf={() => {
                      climate.assignLeaf(null);
                      setPickerMode(null);
                    }}
                  />
                ) : null}
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
  displayValue: string;
  deviceLabel: string | null;
  stale: boolean;
  editing: boolean;
  anchorPicker: boolean;
  changeLabel: string;
  onOpenPicker: () => void;
  onStartEdit: () => void;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onCommit: (raw: string) => void;
  onCancel: () => void;
};

function MetricCell({
  label,
  icon,
  displayValue,
  deviceLabel,
  stale,
  editing,
  anchorPicker,
  changeLabel,
  onOpenPicker,
  onStartEdit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onFocus,
  onCommit,
  onCancel,
}: MetricCellProps) {
  const { t } = useTranslation();
  const display = displayValue !== '—' ? displayValue : t('vpd.noValue');

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
          defaultValue={displayValue !== '—' ? displayValue.replace(/\s/g, '').replace('°C', '').replace('%', '') : ''}
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

  const cell = (
    <div
      data-vpd-cell
      className={cn(
        'relative rounded-lg border border-border px-3 py-2 transition-colors',
        stale && 'opacity-70'
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left hover:opacity-90"
          onClick={onStartEdit}
        >
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {icon}
            {label}
          </p>
          <p className="text-xl font-semibold tabular-nums">{display}</p>
          {deviceLabel ? (
            <p className="truncate text-xs text-muted-foreground">{deviceLabel}</p>
          ) : null}
        </button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-w-11 shrink-0 flex-col gap-0 px-1.5"
          aria-label={`${changeLabel}: ${label}`}
          title={changeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onOpenPicker();
          }}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="text-[10px] leading-none text-muted-foreground">{changeLabel}</span>
        </Button>
      </div>
    </div>
  );

  if (anchorPicker) {
    return <PopoverAnchor asChild>{cell}</PopoverAnchor>;
  }
  return cell;
}
