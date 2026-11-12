import type { JournalVoiceSaveResult } from '@/components/assistant/journal-voice-save';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  formatGrowerEventDateTime,
  growerStageLabel,
  normalizeGrowCycleStage,
  type GrowCycle,
  type Scope,
} from '@growlog/domain';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  result: JournalVoiceSaveResult | null;
  farmName: string | null;
  cycle: GrowCycle | null;
  scope: Scope | null;
  timeZone: string;
  onOk: () => void;
  onCancel: () => void;
  cancelPending?: boolean;
};

export function JournalVoiceSavedSheet({
  visible,
  result,
  farmName,
  cycle,
  scope,
  timeZone,
  onOk,
  onCancel,
  cancelPending = false,
}: Props) {
  const { strings, locale } = useMobileLocale();
  const copy = strings.advisorScreen.journalSaved;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  if (!result) return null;

  const occurredLabel = formatGrowerEventDateTime(result.occurredAt, locale, timeZone);
  const savedLabel = formatGrowerEventDateTime(result.createdAt, locale, timeZone);
  const stageLabel = cycle
    ? growerStageLabel(normalizeGrowCycleStage(cycle.stage), locale)
    : '—';

  const metaRows: Array<{ label: string; value: string }> = [
    { label: copy.occurredAt, value: occurredLabel },
    { label: copy.savedAt, value: savedLabel },
  ];
  if (farmName) metaRows.push({ label: copy.farm, value: farmName });
  if (cycle?.name) metaRows.push({ label: copy.cycle, value: cycle.name });
  if (stageLabel !== '—') metaRows.push({ label: copy.stage, value: stageLabel });
  if (scope?.display_name) metaRows.push({ label: copy.scope, value: scope.display_name });
  if (result.eventId) metaRows.push({ label: copy.entryId, value: result.eventId.slice(0, 8) });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => undefined}>
      <View style={styles.backdrop} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              tintColor={colors.primary}
              size={28}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} bounces={false}>
          <Text style={styles.quoteLabel}>{copy.quoteLabel}</Text>
          <View style={styles.quoteBox}>
            <Text style={styles.quote} accessibilityRole="text">
              «{result.body}»
            </Text>
          </View>

          <Text style={styles.metaHeading}>{copy.details}</Text>
          {metaRows.map((row) => (
            <View key={row.label} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{row.label}</Text>
              <Text style={styles.metaValue} selectable>
                {row.value}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={[styles.outlineBtn, cancelPending && styles.btnDisabled]}
            onPress={onCancel}
            disabled={cancelPending}
            accessibilityRole="button"
          >
            <Text style={styles.outlineBtnText}>{copy.cancel}</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, cancelPending && styles.btnDisabled]}
            onPress={onOk}
            disabled={cancelPending}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{copy.ok}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingTop: 16,
      paddingHorizontal: 20,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    headerIcon: { marginTop: 2 },
    headerText: { flex: 1, gap: 4 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 14, lineHeight: 20, color: c.textMuted },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingBottom: 8, gap: 8 },
    quoteLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    quoteBox: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    quote: { fontSize: 16, lineHeight: 24, color: c.text, fontStyle: 'italic' },
    metaHeading: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    metaLabel: { flex: 1, fontSize: 14, color: c.textMuted },
    metaValue: { flex: 1.2, fontSize: 14, fontWeight: '500', color: c.text, textAlign: 'right' },
    actions: { gap: 10, paddingTop: 12 },
    outlineBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    outlineBtnText: { color: c.text, fontSize: 16, fontWeight: '600' },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    btnDisabled: { opacity: 0.55 },
  });
}
