import { useMobileLocale } from '@/context/LocaleContext';
import {
  formatClimateValueRu,
  formatRelativeTimeRu,
  formatStaleLabelRu,
  groupClimatePickerRows,
  isCurrentPickerChoice,
  vpdStageLabelRu,
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

  const errorCode = (climate.devicesQuery.error as Error & { code?: string } | null)?.code;

  const pickerGroups = useMemo(() => {
    if (!pickerMode) return [];
    const kind = pickerMode === 'rh' ? 'rh' : 'temp';
    return groupClimatePickerRows({
      rows: climate.sourceRows,
      kind,
      cycleZoneId: climate.cycleZoneId,
      leafOnly: pickerMode === 'leaf',
    });
  }, [pickerMode, climate.sourceRows, climate.cycleZoneId]);

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
          <Text style={[styles.muted, styles.hint]}>{copy.longPressHint}</Text>

          <View style={styles.metricsRow}>
            <MetricCell
              label={copy.airTemp}
              unit="°C"
              value={climate.displayAir}
              deviceLabel={climate.live.airLabel}
              editing={editingField === 'air'}
              noValue={copy.noValue}
              onPress={() => {
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                setEditingField('air');
              }}
              onLongPress={() => {
                longPressHandledRef.current = true;
                setPickerMode('air');
                setEditingField(null);
              }}
              onFocus={() => climate.onPreviewFocus('airTempC')}
              onCommit={(raw) => {
                climate.onPreviewCommit('airTempC', raw);
                setEditingField(null);
              }}
            />
            <MetricCell
                label={copy.leafTemp}
                unit="°C"
                value={climate.displayLeaf}
                deviceLabel={
                  climate.leafMode === 'estimated'
                    ? copy.leafEstimatedShort
                    : climate.live.leafLabel
                }
                editing={editingField === 'leaf'}
                noValue={copy.noValue}
                onPress={() => {
                  if (longPressHandledRef.current) {
                    longPressHandledRef.current = false;
                    return;
                  }
                  setEditingField('leaf');
                }}
                onLongPress={() => {
                  longPressHandledRef.current = true;
                  setPickerMode('leaf');
                  setEditingField(null);
                }}
                onFocus={() => climate.onPreviewFocus('leafTempC')}
                onCommit={(raw) => {
                  climate.onPreviewCommit('leafTempC', raw);
                  setEditingField(null);
                }}
              />
            <MetricCell
              label={copy.humidity}
              unit="%"
              value={climate.displayRh}
              deviceLabel={climate.live.rhLabel}
              editing={editingField === 'rh'}
              noValue={copy.noValue}
              onPress={() => {
                if (longPressHandledRef.current) {
                  longPressHandledRef.current = false;
                  return;
                }
                setEditingField('rh');
              }}
              onLongPress={() => {
                longPressHandledRef.current = true;
                setPickerMode('rh');
                setEditingField(null);
              }}
              onFocus={() => climate.onPreviewFocus('rhPct')}
              onCommit={(raw) => {
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
                      : formatRelativeTimeRu(row.observedAt);
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
                        key={`${row.deviceId}:${row.code}`}
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
  unit: string;
  value: number | null;
  deviceLabel: string | null;
  editing: boolean;
  noValue: string;
  onPress: () => void;
  onLongPress: () => void;
  onFocus: () => void;
  onCommit: (raw: string) => void;
};

function MetricCell({
  label,
  unit,
  value,
  deviceLabel,
  editing,
  noValue,
  onPress,
  onLongPress,
  onFocus,
  onCommit,
}: MetricCellProps) {
  const draftRef = useRef(value != null ? String(value) : '');
  const display = value != null ? `${value}${unit}` : noValue;

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
    <Pressable
      style={styles.metricCell}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{display}</Text>
      {deviceLabel ? (
        <Text style={styles.mutedSmall} numberOfLines={1}>
          {deviceLabel}
        </Text>
      ) : null}
    </Pressable>
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
    padding: 10,
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
