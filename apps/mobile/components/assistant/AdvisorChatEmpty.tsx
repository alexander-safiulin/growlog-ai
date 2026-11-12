import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onPickPrompt: (prompt: string) => void;
};

export function AdvisorChatEmpty({ onPickPrompt }: Props) {
  const { strings } = useMobileLocale();
  const a = strings.advisorScreen;
  const styles = useThemedStyles(makeStyles);
  const starters = [a.starterPrompt1, a.starterPrompt2, a.starterPrompt3];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{a.emptyTitle}</Text>
      <Text style={styles.lead}>{a.emptyLead}</Text>
      <View style={styles.chips}>
        {starters.map((label) => (
          <Pressable
            key={label}
            style={styles.chip}
            onPress={() => onPickPrompt(label)}
            accessibilityRole="button"
          >
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 20, paddingTop: 32, alignItems: 'center', gap: 10 },
    title: { fontSize: 17, fontWeight: '600', color: c.text, textAlign: 'center' },
    lead: { fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipText: { fontSize: 14, fontWeight: '500', color: c.text },
  });
}
