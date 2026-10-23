'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatClimateValueRu,
  formatRelativeTimeRu,
  formatStaleLabelRu,
  groupClimatePickerRows,
  isCurrentPickerChoice,
  filterPickerRows,
  VPD_PICKER_SEARCH_MIN,
  type ClimateSourceRow,
  type VpdLeafMode,
  type VpdSourceAssignment,
} from '@growlog/domain';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';

export type VpdPickerKind = 'air' | 'leaf' | 'rh';

type VpdSensorPickerProps = {
  kind: VpdPickerKind;
  rows: ClimateSourceRow[];
  assignment: VpdSourceAssignment;
  leafMode: VpdLeafMode;
  cycleZoneId: string | null;
  onPickAir: (row: ClimateSourceRow) => void;
  onPickRh: (row: ClimateSourceRow) => void;
  onPickLeaf: (row: ClimateSourceRow) => void;
  onPickLeafEstimated: () => void;
  onClearLeaf: () => void;
};

export function VpdSensorPicker({
  kind,
  rows,
  assignment,
  leafMode,
  cycleZoneId,
  onPickAir,
  onPickRh,
  onPickLeaf,
  onPickLeafEstimated,
  onClearLeaf,
}: VpdSensorPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const metricKind = kind === 'rh' ? 'rh' : 'temp';
  const allRows = useMemo(
    () => rows.filter((r) => r.kind === metricKind),
    [rows, metricKind]
  );
  const showSearch = allRows.length >= VPD_PICKER_SEARCH_MIN;
  const filteredRows = useMemo(
    () => (showSearch ? filterPickerRows(allRows, query) : allRows),
    [allRows, query, showSearch]
  );

  const groups = useMemo(
    () =>
      groupClimatePickerRows({
        rows: filteredRows,
        kind: metricKind,
        cycleZoneId,
        leafOnly: kind === 'leaf',
        airAssignment: assignment.airTemp,
      }),
    [filteredRows, metricKind, cycleZoneId, kind, assignment.airTemp]
  );

  const leafEstimatedSelected = kind === 'leaf' && leafMode === 'estimated';

  return (
    <div className="space-y-3">
      {showSearch ? (
        <Input
          type="search"
          placeholder={t('vpd.searchSensors')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9"
          aria-label={t('vpd.searchSensors')}
        />
      ) : null}

      {kind === 'leaf' ? (
        <ul className="space-y-1 border-b border-border pb-2">
          <li>
            <PickerButton
              title={t('vpd.leafEstimatedOption')}
              subtitle={t('vpd.leafEstimatedHint')}
              selected={leafEstimatedSelected}
              muted={false}
              onClick={onPickLeafEstimated}
            />
          </li>
          <li>
            <PickerButton
              title={t('vpd.clearLeaf')}
              selected={leafMode === 'none'}
              muted={false}
              onClick={onClearLeaf}
            />
          </li>
        </ul>
      ) : null}

      {groups.map((group) => (
        <div key={group.zoneId ?? 'none'}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{group.title}</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {group.rows.map((row) => {
              const value =
                row.kind === 'temp'
                  ? formatClimateValueRu('temp', row.valueCelsius)
                  : formatClimateValueRu('rh', row.valueRhPct);
              const timeLabel = row.stale
                ? formatStaleLabelRu(row.observedAt)
                : formatRelativeTimeRu(row.observedAt, undefined, { online: row.online });
              const selected = isCurrentPickerChoice(row, assignment, leafMode, kind);
              return (
                <li key={`${row.deviceId}:${row.ref.code}`}>
                  <PickerButton
                    title={row.deviceName}
                    valueLine={`${value} · ${timeLabel}`}
                    selected={selected}
                    muted={row.stale || !row.usable}
                    onClick={() => {
                      if (kind === 'air') onPickAir(row);
                      else if (kind === 'rh') onPickRh(row);
                      else onPickLeaf(row);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {!groups.length ? (
        <p className="text-sm text-muted-foreground">{t('vpd.pickerEmpty')}</p>
      ) : null}
    </div>
  );
}

function PickerButton({
  title,
  subtitle,
  valueLine,
  selected,
  muted,
  onClick,
}: {
  title: string;
  subtitle?: string;
  valueLine?: string;
  selected: boolean;
  muted: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'h-auto min-h-11 w-full justify-between gap-2 px-2 py-2 font-normal',
        muted && 'opacity-60'
      )}
      onClick={onClick}
    >
      <span className="min-w-0 text-left">
        <span className="block truncate font-medium">{title}</span>
        {valueLine ? (
          <span className="block text-xs text-muted-foreground">{valueLine}</span>
        ) : null}
        {subtitle ? <span className="block text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> : null}
    </Button>
  );
}
