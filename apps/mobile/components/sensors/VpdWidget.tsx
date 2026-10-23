import { useMobileLocale } from '@/context/LocaleContext';
import {
  filterPickerRows,
  formatClimateValueRu,
  formatRelativeTimeRu,
  formatStaleLabelRu,
  groupClimatePickerRows,
  isCurrentPickerChoice,
  parseClimatePreviewInput,
  vpdStageLabelRu,
  VPD_PICKER_SEARCH_MIN,
  type VpdBandStatus,
} from '@growlog/domain';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useVpdClimate } from './useVpdClimate';

type PickerMode = 'air' | 'leaf' | 'rh' | null;

function bandColor(status: VpdBandStatus): string {
  if (status === 'below') return '#0284c7';
  if (status === 'above') return '#d97706';
  if (status === 'in_range') return '#059669';
  return '#1a1a1a';
}

type VpdWidgetProps = {
  cycleStage?: string | null;
  cycleId?: string | null;
  zoneId?: string | null;
};

export function VpdWidget({ cycleStage, cycleId, zoneId }: VpdWidgetProps) {
  const { strings } = useMobileLocale();
  const copy = strings.vpd;
  const climate = useVpdClimate(cycleStage, { cycleId, zoneId });
  const stageLabel = vpdStageLabelRu(cycleStage);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [editingField, setEditingField] = useState<'air' | 'leaf' | 'rh' | null>(null);
  const longPressHandledRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const pickerRowsForSearch = useMemo(() => {
    if (!pickerMode) return [];
    const kind = pickerMode === 'rh' ? 'rh' : 'temp';
    return climate.sourceRows.filter((r) => r.kind === kind);
  }, [pickerMode, climate.sourceRows]);
  const showPickerSearch = pickerRowsForSearch.length >= VPD_PICKER_SEARCH_MIN;

  const errorCode = (climate.devicesQuery.error as Error & { code?: string } | null)?.code;

  const pickerGroups = useMemo(() => {
    if (!pickerMode) return [];
    const kind = pickerMode === 'rh' ? 'rh' : 'temp';
    const filtered = showPickerSearch
      ? filterPickerRows(pickerRowsForSearch, pickerQuery)
      : pickerRowsForSearch;
    return groupClimatePickerRows({
      rows: filtered,
      kind,
      cycleZoneId: climate.cycleZoneId,
      leafOnly: pickerMode === 'leaf',
      airAssignment: climate.assignment.airTemp,
    });
  }, [pickerMode, climate.sourceRows, climate.cycleZoneId, pickerQuery, pickerRowsForSearch, showPickerSearch, climate.assignment.airTemp]);

  const pickerTitle =
    pickerMode === 'air'
      ? copy.pickAirSource
      : pickerMode === 'leaf'
        ? copy.pickLeafSource
        : pickerMode === 'rh'
          ? copy.pickRhSource
          : '';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.desc}>{copy.desc}</Text>
        </View>
        {climate.isPreview ? (
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{copy.preview}</Text>
          </View>
        ) : null}
      </View>

      {climate.devicesQuery.isLoading ? (
        <ActivityIndicator color="#2d6a4f" style={styles.spinner} />
      ) : null}
      {climate.devicesQuery.isError && errorCode === 'tuya_unconfigured' ? (
        <Text style={styles.muted}>{copy.unconfigured}</Text>
      ) : null}
      {climate.devicesQuery.isError && errorCode !== 'tuya_unconfigured' ? (
        <Text style={styles.error}>{copy.error}</Text>
      ) : null}
      {!climate.devicesQuery.isLoading &&
      !climate.devicesQuery.isError &&
      climate.points.length === 0 ? (
        <Text style={styles.muted}>{copy.empty}</Text>
      ) : null}

      {climate.points.length > 0 ? (
        <>
          <Text style={styles.vpdLabel}>{copy.vpdLabel}</Text>
          <Text style={[styles.vpdValue, { color: bandColor(climate.bandStatus) }]}>
            {climate.vpdDisplay ?? copy.noValue}
            {climate.vpdDisplay ? ` ${copy.kpa}` : ''}
          </Text>
          {climate.band && cycleStage ? (
            <Text style={styles.muted}>
              {copy.targetBand.replace('{stage}', stageLabel)} · {climate.band.label} {copy.kpa}
            </Text>
          ) : null}
          {climate.autoSelected ? (
            <Text style={styles.muted}>{copy.autoSelected}</Text>
          ) : null}
          {climate.climateWarning ? (
            <Text style={styles.warn}>
              {climate.zoneWarning ? copy.zoneMismatchWarning : copy.staleWarning}
            </Text>
          ) : null}
          <Text style={[styles.muted, styles.hint]}>{copy.longPressHint}</Text>

          <View style={styles.metricsRow}>
            <MetricCell
              label={copy.airTemp}
              displayValue={formatClimateValueRu('temp', climate.displayAir)}
              deviceLabel={climate.live.airLabel}
              stale={!climate.airRow?.usable}
              changeLabel={copy.changeSensor}
              editing={editingField === 'air'}
              noValue={copy.noValue}
              onPress={() => {
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                setEditingField('air');
              }}
              onOpenPicker={() => {
                setPickerQuery('');
                setPickerMode('air');
                setEditingField(null);
              }}
              onTouchStart={(x, y) => {
                touchStartRef.current = { x, y };
                longPressTimerRef.current = setTimeout(() => {
                  longPressHandledRef.current = true;
                  setPickerQuery('');
                  setPickerMode('air');
                  setEditingField(null);
                }, 500);
              }}
              onTouchMove={(x, y) => {
                const start = touchStartRef.current;
                if (!start || !longPressTimerRef.current) return;
                if (Math.abs(x - start.x) > 8 || Math.abs(y - start.y) > 8) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onTouchEnd={() => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onFocus={() => climate.onPreviewFocus()}
              onCommit={(raw) => {
                const parsed = parseClimatePreviewInput('airTempC', raw);
                if (parsed === 'invalid') return;
                climate.onPreviewCommit('airTempC', raw);
                setEditingField(null);
              }}
            />
            <MetricCell
              label={copy.leafTemp}
              displayValue={formatClimateValueRu('temp', climate.displayLeaf)}
              deviceLabel={
                climate.leafMode === 'estimated' ? copy.leafEstimatedShort : climate.live.leafLabel
              }
              stale={climate.leafMode === 'sensor' && !(climate.leafRow?.usable ?? false)}
              changeLabel={copy.changeSensor}
              editing={editingField === 'leaf'}
              noValue={copy.noValue}
              onPress={() => {
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                setEditingField('leaf');
              }}
              onOpenPicker={() => {
                setPickerQuery('');
                setPickerMode('leaf');
                setEditingField(null);
              }}
              onTouchStart={(x, y) => {
                touchStartRef.current = { x, y };
                longPressTimerRef.current = setTimeout(() => {
                  longPressHandledRef.current = true;
                  setPickerQuery('');
                  setPickerMode('leaf');
                  setEditingField(null);
                }, 500);
              }}
              onTouchMove={(x, y) => {
                const start = touchStartRef.current;
                if (!start || !longPressTimerRef.current) return;
                if (Math.abs(x - start.x) > 8 || Math.abs(y - start.y) > 8) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onTouchEnd={() => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onFocus={() => climate.onPreviewFocus()}
              onCommit={(raw) => {
                if (parseClimatePreviewInput('leafTempC', raw) === 'invalid') return;
                climate.onPreviewCommit('leafTempC', raw);
                setEditingField(null);
              }}
            />
            <MetricCell
              label={copy.humidity}
              displayValue={formatClimateValueRu('rh', climate.displayRh)}
              deviceLabel={climate.live.rhLabel}
              stale={!climate.rhRow?.usable}
              changeLabel={copy.changeSensor}
              editing={editingField === 'rh'}
              noValue={copy.noValue}
              onPress={() => {
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                setEditingField('rh');
              }}
              onOpenPicker={() => {
                setPickerQuery('');
                setPickerMode('rh');
                setEditingField(null);
              }}
              onTouchStart={(x, y) => {
                touchStartRef.current = { x, y };
                longPressTimerRef.current = setTimeout(() => {
                  longPressHandledRef.current = true;
                  setPickerQuery('');
                  setPickerMode('rh');
                  setEditingField(null);
                }, 500);
              }}
              onTouchMove={(x, y) => {
                const start = touchStartRef.current;
                if (!start || !longPressTimerRef.current) return;
                if (Math.abs(x - start.x) > 8 || Math.abs(y - start.y) > 8) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onTouchEnd={() => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              }}
              onFocus={() => climate.onPreviewFocus()}
              onCommit={(raw) => {
                if (parseClimatePreviewInput('rhPct', raw) === 'invalid') return;
                climate.onPreviewCommit('rhPct', raw);
                setEditingField(null);
              }}
            />
          </View>
        </>
      ) : null}

      <Modal visible={pickerMode != null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerMode(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            {showPickerSearch ? (
              <TextInput
                style={styles.searchInput}
                placeholder={copy.searchSensors}
                accessibilityLabel={copy.searchSensors}
                value={pickerQuery}
                onChangeText={setPickerQuery}
              />
            ) : null}
            <ScrollView style={styles.modalList}>
              {pickerMode === 'leaf' ? (
                <>
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      climate.assignLeafEstimated();
                      setPickerMode(null);
                    }}
                  >
                    <Text>{copy.leafEstimatedOption}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      climate.assignLeaf(null);
                      setPickerMode(null);
                    }}
                  >
                    <Text>{copy.clearLeaf}</Text>
                  </Pressable>
                </>
              ) : null}
              {pickerGroups.map((group) => (
                <View key={group.zoneId ?? 'none'}>
                  <Text style={styles.modalGroupTitle}>{group.title}</Text>
                  {group.rows.map((row) => {
                    const value =
                      row.kind === 'temp'
                        ? formatClimateValueRu('temp', row.valueCelsius)
                        : formatClimateValueRu('rh', row.valueRhPct);
                    const time = row.stale
                      ? formatStaleLabelRu(row.observedAt)
                      : formatRelativeTimeRu(row.observedAt, undefined, { online: row.online });
                    const selected =
                      pickerMode &&
                      isCurrentPickerChoice(
                        row,
                        climate.assignment,
                        climate.leafMode,
                        pickerMode
                      );
                    return (
                      <Pressable
                        key={`${row.deviceId}:${row.ref.code}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: Boolean(selected) }}
                        style={[styles.modalItem, (row.stale || !row.usable) && styles.modalItemMuted]}
                        onPress={() => {
                          if (pickerMode === 'air') climate.assignAir(row.ref);
                          else if (pickerMode === 'leaf') climate.assignLeaf(row.ref);
                          else if (pickerMode === 'rh') climate.assignRh(row.ref);
                          setPickerMode(null);
                        }}
                      >
                        <Text style={styles.modalItemTitle}>
                          {row.deviceName}
                          {selected ? ' ✓' : ''}
                        </Text>
                        <Text style={styles.mutedSmall}>{value} · {time}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPickerMode(null)}>
              <Text style={styles.modalClose}>{copy.close}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type MetricCellProps = {
  label: string;
  displayValue: string;
  deviceLabel: string | null;
  stale?: boolean;
  changeLabel: string;
  editing: boolean;
  noValue: string;
  onPress: () => void;
  onOpenPicker: () => void;
  onTouchStart: (x: number, y: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchEnd: () => void;
  onFocus: () => void;
  onCommit: (raw: string) => void;
};

function MetricCell({
  label,
  displayValue,
  deviceLabel,
  stale,
  changeLabel,
  editing,
  noValue,
  onPress,
  onOpenPicker,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onFocus,
  onCommit,
}: MetricCellProps) {
  const draftRef = useRef(displayValue !== '—' ? displayValue : '');
  const display = displayValue !== '—' ? displayValue : noValue;

  if (editing) {
    return (
      <View style={styles.metricCell}>
        <Text style={styles.metricLabel}>{label}</Text>
        <TextInput
          style={styles.metricInput}
          keyboardType="decimal-pad"
          defaultValue={draftRef.current}
          autoFocus
          onFocus={onFocus}
          onChangeText={(text) => {
            draftRef.current = text;
          }}
          onBlur={() => onCommit(draftRef.current)}
          onSubmitEditing={() => onCommit(draftRef.current)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.metricCell, stale && styles.metricCellStale]}>
      <Pressable
        style={styles.metricTap}
        onPress={onPress}
        onTouchStart={(e) => onTouchStart(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        onTouchMove={(e) => onTouchMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{display}</Text>
        {deviceLabel ? (
          <Text style={styles.mutedSmall} numberOfLines={1}>
            {deviceLabel}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        style={styles.changeSensorBtn}
        accessibilityRole="button"
        accessibilityLabel={`${changeLabel}: ${label}`}
        onPress={onOpenPicker}
      >
        <Text style={styles.changeSensorText}>{changeLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  desc: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  previewBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  previewBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  spinner: { marginVertical: 8 },
  muted: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  mutedSmall: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  error: { fontSize: 13, color: '#b91c1c', marginTop: 6 },
  warn: { fontSize: 13, color: '#b45309', marginTop: 6 },
  vpdLabel: { fontSize: 12, color: '#6b7280', marginTop: 12 },
  vpdValue: { fontSize: 32, fontWeight: '700' },
  hint: { marginBottom: 8 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCell: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
  },
  metricCellStale: { opacity: 0.7 },
  metricTap: { flex: 1 },
  changeSensorBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
  changeSensorText: { fontSize: 11, fontWeight: '600', color: '#2d6a4f' },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  metricLabel: { fontSize: 11, color: '#6b7280' },
  metricValue: { fontSize: 20, fontWeight: '600', marginTop: 2 },
  metricInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
  },
  leafPlaceholder: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  modalList: { maxHeight: 320 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemMuted: { opacity: 0.55 },
  modalGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  modalItemTitle: { fontWeight: '500' },
  modalClose: { textAlign: 'center', color: '#2d6a4f', fontWeight: '600', marginTop: 12 },
});
