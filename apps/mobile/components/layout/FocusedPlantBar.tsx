import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { plantLabelNumber } from '@growlog/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function FocusedPlantBar() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { focusedPlant, clearFocusedPlant } = useFarmContext();
  const styles = useThemedStyles(makeStyles);

  if (!focusedPlant) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{copy.scanPlantFocused}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {focusedPlant.cultivar_name ?? copy.formStrain} · № {plantLabelNumber(focusedPlant)}
      </Text>
      <Pressable onPress={clearFocusedPlant} hitSlop={8} accessibilityRole="button">
        <Text style={styles.clear}>{copy.scanPlantClear}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.rowActiveBorder,
      backgroundColor: c.rowActiveBg,
    },
    label: { fontSize: 12, fontWeight: '700', color: c.sectionLabel },
    value: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    clear: { fontSize: 13, fontWeight: '600', color: c.primary },
  });
}
