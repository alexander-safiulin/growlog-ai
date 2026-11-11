import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  dateFromIsoCalendarDay,
  formatGrowerCalendarDateForInput,
  growerCalendarDateInputPlaceholder,
  isoFromLocalCalendarDate,
  isFutureFarmCalendarDate,
  normalizeGrowerCalendarDateDraft,
  parseGrowerCalendarDateInput,
  resolveGrowerSetupStartDate,
} from '@growlog/domain';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

export type GrowerCalendarDateFieldProps = {
  isoValue: string;
  onIsoChange: (iso: string) => void;
  maxIso: string;
  locale: string;
  editable?: boolean;
  appearance?: 'onboarding' | 'cycle';
  style?: StyleProp<ViewStyle>;
};

export function GrowerCalendarDateField({
  isoValue,
  onIsoChange,
  maxIso,
  locale,
  editable = true,
  appearance = 'onboarding',
  style,
}: GrowerCalendarDateFieldProps) {
  const { colors, colorScheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState(() => formatGrowerCalendarDateForInput(isoValue));
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatGrowerCalendarDateForInput(isoValue));
    }
  }, [isoValue, focused]);

  const pickerValue = useMemo(() => {
    const fromDraft = parseGrowerCalendarDateInput(draft);
    const iso = fromDraft && !isFutureFarmCalendarDate(fromDraft, maxIso) ? fromDraft : isoValue;
    return dateFromIsoCalendarDay(iso);
  }, [draft, isoValue, maxIso]);

  const maxDate = useMemo(() => dateFromIsoCalendarDay(maxIso), [maxIso]);

  const pickerLocale = locale.startsWith('ru') ? 'ru-RU' : locale;

  function commitDraft(next: string) {
    const normalized = normalizeGrowerCalendarDateDraft(next);
    setDraft(normalized);
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) {
      const iso = resolveGrowerSetupStartDate(normalized, maxIso);
      if (iso) onIsoChange(iso);
    }
  }

  function handleBlur() {
    setFocused(false);
    const resolved = resolveGrowerSetupStartDate(draft, maxIso);
    if (resolved) {
      onIsoChange(resolved);
      setDraft(formatGrowerCalendarDateForInput(resolved));
      return;
    }
    setDraft(formatGrowerCalendarDateForInput(isoValue));
  }

  function handlePickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setPickerOpen(false);
      if (event.type === 'dismissed' || !date) return;
    }
    if (!date) return;
    const iso = isoFromLocalCalendarDate(date);
    if (isFutureFarmCalendarDate(iso, maxIso)) return;
    onIsoChange(iso);
    setDraft(formatGrowerCalendarDateForInput(iso));
  }

  const inputStyles = appearance === 'cycle' ? styles.fieldInput : styles.input;

  return (
    <View style={[appearance === 'onboarding' ? styles.block : undefined, style]}>
      <View style={[styles.row, appearance === 'onboarding' ? styles.rowOnboarding : null]}>
        <TextInput
          style={[inputStyles, styles.inputFlex]}
          value={draft}
          onChangeText={commitDraft}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={growerCalendarDateInputPlaceholder(locale)}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          maxLength={10}
          accessibilityLabel={growerCalendarDateInputPlaceholder(locale)}
        />
        <Pressable
          style={[styles.calendarBtn, !editable && styles.calendarBtnDisabled]}
          onPress={() => editable && setPickerOpen((open) => !open)}
          disabled={!editable}
          accessibilityRole="button"
          accessibilityLabel={locale.startsWith('ru') ? 'Открыть календарь' : 'Open calendar'}
        >
          <SymbolView name="calendar" tintColor={colors.primary} size={22} weight="medium" />
        </Pressable>
      </View>

      {pickerOpen && Platform.OS === 'ios' ? (
        <View style={styles.pickerCard}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="inline"
            locale={pickerLocale}
            maximumDate={maxDate}
            onChange={handlePickerChange}
            themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
          />
          <Pressable style={styles.pickerDone} onPress={() => setPickerOpen(false)} accessibilityRole="button">
            <SymbolView name="checkmark.circle.fill" tintColor={colors.primary} size={28} />
          </Pressable>
        </View>
      ) : null}

      {pickerOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          maximumDate={maxDate}
          onChange={handlePickerChange}
        />
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    block: { marginBottom: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowOnboarding: { marginBottom: 16 },
    inputFlex: { flex: 1, marginBottom: 0 },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      color: c.text,
    },
    fieldInput: {
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    calendarBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarBtnDisabled: { opacity: 0.5 },
    pickerCard: {
      marginTop: 4,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      overflow: 'hidden',
    },
    pickerDone: {
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
  });
}
