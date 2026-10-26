import { useTheme } from '@/context/ThemeContext';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { armVpdSensorPicker, consumeVpdSensorPicker, peekVpdSensorPicker } from '@/lib/vpd-picker-intent';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  filterPickerRows,
  formatClimateValueRu,
  formatRelativeTimeRu,
  formatStaleLabelRu,
  groupClimatePickerRows,
  isCurrentPickerChoice,
  parseClimatePreviewInput,
  VPD_PICKER_SEARCH_MIN,
  type VpdBandStatus,
} from '@growlog/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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

function climateDraft(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(Math.round(value * 10) / 10);
}

function bandColor(status: VpdBandStatus, c: MobileThemeColors): string {
  if (status === 'below') return c.vpdBelow;
  if (status === 'above') return c.vpdAbove;
  if (status === 'in_range') return c.vpdInRange;
  return c.text;
}

type VpdWidgetProps = {
  cycleStage?: string | null;
  cycleId?: string | null;
  zoneId?: string | null;
};

export function VpdWidget({ cycleStage, cycleId, zoneId }: VpdWidgetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => vpdStyles(colors), [colors]);
  const { strings } = useMobileLocale();
  const { userId } = useFarmContext();
  const copy = strings.vpd;
  const climate = useVpdClimate(cycleStage, { cycleId, zoneId });
  const [flash, setFlash] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [editingField, setEditingField] = useState<'air' | 'leaf' | 'rh' | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const longPressHandledRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const manual = climate.mode === 'manual';

  useEffect(() => {
    if (climate.revertPulse === 0) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(timer);
  }, [climate.revertPulse]);

  useEffect(() => {
    if (!userId || !climate.devicesQueryEnabled || !climate.devicesQuery.isFetched) return;
    const mode = peekVpdSensorPicker();
    if (!mode) return;
    consumeVpdSensorPicker();
    setPickerQuery('');
    setPickerMode(mode);
    setEditingField(null);
  }, [userId, climate.devicesQueryEnabled, climate.devicesQuery.isFetched]);

  const requestSensors = (mode: 'air' | 'leaf' | 'rh') => {
    if (!userId) {
      armVpdSensorPicker(mode);
      router.push('/(auth)/login?reason=sensors&next=vpd');
      return;
    }
    setPickerQuery('');
    setPickerMode(mode);
    setEditingField(null);
  };

  const requestPrimarySensor = () => {
    if (!climate.assignment.airTemp) requestSensors('air');
    else if (!climate.assignment.rh) requestSensors('rh');
    else requestSensors('air');
  };

  const sensorGestures = (mode: 'air' | 'leaf' | 'rh') => ({
    onOpenPicker: () => requestSensors(mode),
    onTouchStart: (x: number, y: number) => {
      touchStartRef.current = { x, y };
      longPressTimerRef.current = setTimeout(() => {
        longPressHandledRef.current = true;
        requestSensors(mode);
      }, 500);
    },
    onTouchMove: (x: number, y: number) => {
      const start = touchStartRef.current;
      if (!start || !longPressTimerRef.current) return;
      if (Math.abs(x - start.x) > 8 || Math.abs(y - start.y) > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    },
    onTouchEnd: () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    },
  });

  const commitField = (field: 'airTempC' | 'leafTempC' | 'rhPct', raw: string) => {
    if (parseClimatePreviewInput(field, raw) === 'invalid') return;
    climate.onValueCommit(field, raw);
    setEditingField(null);
  };

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

  const editingClimate = editingField != null;
  const showSensorDesc = !manual && (descOpen || editingClimate);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{copy.title}</Text>
            {manual ? null : (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={copy.title}
                accessibilityState={{ expanded: showSensorDesc }}
                onPress={() => {
                  // Editing already shows the note. A tap must not pin it open after blur.
                  if (editingClimate) {
                    setDescOpen(false);
                    return;
                  }
                  setDescOpen((open) => !open);
                }}
                style={({ pressed }) => [styles.disclosureBtn, pressed && styles.disclosurePressed]}
              >
                <Text style={styles.disclosureMark}>{showSensorDesc ? '▾' : '▸'}</Text>
              </Pressable>
            )}
          </View>
          {showSensorDesc ? <Text style={styles.desc}>{copy.desc}</Text> : null}
        </View>
        {climate.isPreview ? (
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{copy.preview}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.vpdValueWrap, flash && styles.flash]}>
        <Text style={[styles.vpdValue, { color: bandColor(climate.bandStatus, colors) }]}>
          {climate.vpdDisplay ?? copy.noValue}
          {climate.vpdDisplay ? ` ${copy.kpa}` : ''}
        </Text>
      </View>
      {climate.band ? (
        <VpdRangeBar
          styles={styles}
          colors={colors}
          vpdKpa={climate.vpdKpa}
          minKpa={climate.band.minKpa}
          maxKpa={climate.band.maxKpa}
          color={bandColor(climate.bandStatus, colors)}
        />
      ) : null}
      {climate.band || manual ? (
        <Text style={styles.muted}>
          {[
            climate.band ? copy.targetBand.replace('{range}', climate.band.label) : null,
            manual ? (climate.manualCustomized ? copy.manualSaved : copy.manualSuggested) : null,
          ]
            .filter(Boolean)
            .join(' · ')
            .replace(/^./, (c) => c.toUpperCase())}
        </Text>
      ) : null}
      {climate.sensorLinkSaved && climate.devicesQuery.isLoading ? (
        <Text style={styles.muted}>{copy.loading}</Text>
      ) : null}
      {!manual && climate.autoSelected ? <Text style={styles.muted}>{copy.autoSelected}</Text> : null}
      {!manual && climate.climateWarning ? (
        <Text style={styles.warn}>{climate.zoneWarning ? copy.zoneMismatchWarning : copy.staleWarning}</Text>
      ) : null}
      {climate.sensorLinkSaved && climate.devicesQuery.isError && manual ? (
        <Text style={styles.error}>{errorCode === 'tuya_unconfigured' ? copy.unconfigured : copy.error}</Text>
      ) : null}
      {!manual ? <Text style={[styles.muted, styles.hint]}>{copy.longPressHint}</Text> : null}

      <View style={styles.metricsRow}>
        <MetricCell
          styles={styles}
          label={copy.airTemp}
          displayValue={formatClimateValueRu('temp', climate.displayAir)}
          draft={climateDraft(climate.displayAir)}
          deviceLabel={manual ? null : climate.live.airLabel}
          stale={!manual && !climate.airRow?.usable}
          flash={flash}
          showSensorButton={!manual}
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
          {...sensorGestures('air')}
          onFocus={() => climate.onPreviewFocus()}
          onCommit={(raw) => commitField('airTempC', raw)}
        />
        <MetricCell
          styles={styles}
          label={copy.leafTemp}
          displayValue={formatClimateValueRu('temp', climate.displayLeaf)}
          draft={climateDraft(climate.displayLeaf)}
          deviceLabel={
            manual
              ? climate.manualLeafEstimated
                ? copy.leafEstimatedShort
                : null
              : climate.leafMode === 'estimated'
                ? copy.leafEstimatedShort
                : climate.live.leafLabel
          }
          stale={!manual && climate.leafMode === 'sensor' && !(climate.leafRow?.usable ?? false)}
          flash={flash}
          showSensorButton={!manual}
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
          {...sensorGestures('leaf')}
          onFocus={() => climate.onPreviewFocus()}
          onCommit={(raw) => commitField('leafTempC', raw)}
        />
        <MetricCell
          styles={styles}
          label={copy.humidity}
          displayValue={formatClimateValueRu('rh', climate.displayRh)}
          draft={climateDraft(climate.displayRh)}
          deviceLabel={manual ? null : climate.live.rhLabel}
          stale={!manual && !climate.rhRow?.usable}
          flash={flash}
          showSensorButton={!manual}
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
          {...sensorGestures('rh')}
          onFocus={() => climate.onPreviewFocus()}
          onCommit={(raw) => commitField('rhPct', raw)}
        />
      </View>

      {manual ? (
        <View style={styles.footer}>
          <Text style={[styles.desc, styles.footerText]}>{copy.manualDesc}</Text>
          <Pressable
            style={({ pressed }) => [styles.sensorLinkBtn, pressed && styles.sensorLinkBtnPressed]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={copy.useSensor}
            onPress={requestPrimarySensor}
          >
            <SymbolView
              name={{ ios: 'thermometer', android: 'thermostat', web: 'thermostat' }}
              size={17}
              tintColor={colors.textMuted}
            />
            <SymbolView
              name={{ ios: 'humidity', android: 'water_drop', web: 'water_drop' }}
              size={17}
              tintColor={colors.textMuted}
            />
          </Pressable>
        </View>
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
              {climate.devicesQuery.isError ? (
                <Text style={errorCode === 'tuya_unconfigured' ? styles.muted : styles.error}>
                  {errorCode === 'tuya_unconfigured' ? copy.unconfigured : copy.error}
                </Text>
              ) : null}
              {pickerMode !== 'leaf' &&
              !climate.devicesQuery.isError &&
              pickerGroups.every((group) => group.rows.length === 0) ? (
                <Text style={styles.muted}>{copy.empty}</Text>
              ) : null}
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

type VpdStyles = ReturnType<typeof vpdStyles>;

type MetricCellProps = {
  styles: VpdStyles;
  label: string;
  displayValue: string;
  draft: string;
  deviceLabel: string | null;
  stale?: boolean;
  flash?: boolean;
  showSensorButton?: boolean;
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
  styles,
  label,
  displayValue,
  draft,
  deviceLabel,
  stale,
  flash,
  showSensorButton,
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
  const { colors } = useTheme();
  const display = displayValue !== '—' ? displayValue : noValue;

  if (editing) {
    return (
      <View style={styles.metricCell}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={showSensorButton ? styles.metricInputClearance : undefined}>
          <ClimateNumberInput styles={styles} initial={draft} onFocus={onFocus} onCommit={onCommit} />
        </View>
        {showSensorButton ? (
          <Pressable
            style={styles.changeSensorBtn}
            hitSlop={{ top: 16, left: 8, right: 6, bottom: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${changeLabel}: ${label}`}
            onPress={onOpenPicker}
          >
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              size={12}
              tintColor={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.metricCell, stale && styles.metricCellStale, flash && styles.flash]}>
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
          <Text style={styles.mutedSmall} numberOfLines={2}>
            {deviceLabel}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const RANGE_MAX_KPA = 2;

function rangePercent(kpa: number): `${number}%` {
  const ratio = Math.min(1, Math.max(0, kpa / RANGE_MAX_KPA));
  return `${ratio * 100}%`;
}

function VpdRangeBar({
  styles,
  colors,
  vpdKpa,
  minKpa,
  maxKpa,
  color,
}: {
  styles: VpdStyles;
  colors: MobileThemeColors;
  vpdKpa: number | null;
  minKpa: number;
  maxKpa: number;
  color: string;
}) {
  return (
    <View style={styles.rangeTrack}>
      <View
        style={[
          styles.rangeBand,
          { left: rangePercent(minKpa), width: rangePercent(maxKpa - minKpa) },
        ]}
      />
      {vpdKpa != null ? (
        <View
          style={[
            styles.rangeMarker,
            { left: rangePercent(vpdKpa), backgroundColor: color, borderColor: colors.card },
          ]}
        />
      ) : null}
    </View>
  );
}

function ClimateNumberInput({
  styles,
  initial,
  onFocus,
  onCommit,
}: {
  styles: VpdStyles;
  initial: string;
  onFocus: () => void;
  onCommit: (raw: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <TextInput
      style={styles.metricInput}
      keyboardType="decimal-pad"
      value={text}
      autoFocus
      onFocus={onFocus}
      onChangeText={setText}
      onBlur={() => onCommit(text)}
      onSubmitEditing={() => onCommit(text)}
    />
  );
}

function vpdStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    headerText: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    title: { fontSize: 16, fontWeight: '600', color: c.text, flexShrink: 1 },
    disclosureBtn: { paddingHorizontal: 2, paddingVertical: 2 },
    disclosurePressed: { opacity: 0.45 },
    disclosureMark: { fontSize: 11, lineHeight: 14, color: c.textMuted },
    desc: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
    footerText: { flex: 1, marginTop: 0 },
    sensorLinkBtn: {
      height: 36,
      paddingHorizontal: 8,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    sensorLinkBtnPressed: { backgroundColor: c.surfaceMuted },
    rangeTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.surfaceMuted,
      marginTop: 10,
      marginBottom: 2,
    },
    rangeBand: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: c.rangeBand },
    rangeMarker: {
      position: 'absolute',
      top: -4,
      width: 14,
      height: 14,
      marginLeft: -7,
      borderRadius: 7,
      borderWidth: 2,
    },
    previewBadge: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    previewBadgeText: { fontSize: 11, fontWeight: '600', color: c.text },
    muted: { fontSize: 13, color: c.textMuted, marginTop: 6 },
    mutedSmall: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    error: { fontSize: 13, color: c.dangerText, marginTop: 6 },
    warn: { fontSize: 13, color: '#b45309', marginTop: 6 },
    vpdValueWrap: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      paddingHorizontal: 4,
      marginHorizontal: -4,
      marginTop: 8,
    },
    vpdValue: { fontSize: 40, fontWeight: '700' },
    flash: { backgroundColor: c.flashBg },
    hint: { marginBottom: 8 },
    metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    metricCell: {
      flex: 1,
      minWidth: 100,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 8,
      backgroundColor: c.inputBg,
    },
    metricCellStale: { opacity: 0.7 },
    metricTap: { flex: 1 },
    changeSensorBtn: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    metricInputClearance: { marginRight: 30 },
    searchInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 8,
      backgroundColor: c.inputBg,
      color: c.text,
    },
    metricLabel: { fontSize: 11, color: c.textMuted },
    metricValue: { fontSize: 20, fontWeight: '600', marginTop: 2, color: c.text },
    metricInput: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.text,
    },
    leafPlaceholder: {
      flex: 1,
      minWidth: 100,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 10,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: c.text },
    modalList: { maxHeight: 320 },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
    modalItemMuted: { opacity: 0.55 },
    modalGroupTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: 8,
      marginBottom: 4,
    },
    modalItemTitle: { fontWeight: '500', color: c.text },
    modalClose: { textAlign: 'center', color: c.primary, fontWeight: '600', marginTop: 12 },
  });
}
