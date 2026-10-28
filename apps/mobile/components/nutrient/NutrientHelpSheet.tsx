import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { examplesById } from '@growlog/web-lib/nutrient/help/compute-examples';
import { getNutrientHelpContent } from '@growlog/web-lib/nutrient/help/loader';
import type {
  NutrientHelpBlock,
  NutrientHelpInnerBlock,
  NutrientHelpWorkedExample,
} from '@growlog/web-lib/nutrient/help/types';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function plainFormula(latex: string): string {
  if (latex.includes('\\Delta') || latex.includes('достигнуто')) {
    return 'Δ% = (achieved − target) / target × 100';
  }
  if (latex.includes('ppm')) return 'ppm ≈ dose × (element % / 100) × 1000';
  if (latex.includes('\\max')) return 'percent = average of max(0, 100 − |Δ%|)';
  return 'E = Σ (w × k × ((A − T) / T)²) / Σ w';
}

export function NutrientHelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { locale, strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const content = getNutrientHelpContent(locale) ?? getNutrientHelpContent('en');
  const examples = useMemo(() => (visible ? examplesById(locale) : {}), [visible, locale]);
  const [openCurious, setOpenCurious] = useState<Record<string, boolean>>({});

  if (!content) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{content.pageTitle}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.close}>{strings.nutrient.helpClose}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.intro}>{content.pageIntro}</Text>
          {content.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.summary}>{section.summary}</Text>
              {section.blocks.map((block, index) => (
                <HelpBlock
                  key={`${section.id}-${index}`}
                  block={block}
                  examples={examples}
                  styles={styles}
                  curiousLabel={strings.nutrient.helpCurious}
                  curiousOpen={openCurious[section.id] === true}
                  onToggleCurious={() =>
                    setOpenCurious((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                  }
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function HelpBlock({
  block,
  examples,
  styles,
  curiousLabel,
  curiousOpen,
  onToggleCurious,
}: {
  block: NutrientHelpBlock;
  examples: Record<string, NutrientHelpWorkedExample>;
  styles: ReturnType<typeof makeStyles>;
  curiousLabel: string;
  curiousOpen: boolean;
  onToggleCurious: () => void;
}) {
  if (block.type === 'curious') {
    return (
      <View>
        <Pressable onPress={onToggleCurious} accessibilityRole="button">
          <Text style={styles.curious}>{curiousLabel}</Text>
        </Pressable>
        {curiousOpen
          ? block.blocks.map((inner, index) => <InnerBlock key={index} block={inner} styles={styles} />)
          : null}
      </View>
    );
  }
  if (block.type === 'example') {
    const example = examples[block.exampleId];
    if (!example) return null;
    return (
      <View style={styles.example}>
        <Text style={styles.exampleTitle}>{example.title}</Text>
        {example.lines.map((line, index) => (
          <Text key={index} style={styles.exampleLine}>
            {line}
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'link') {
    return <Text style={styles.summary}>{block.text}</Text>;
  }
  return <InnerBlock block={block} styles={styles} />;
}

function InnerBlock({
  block,
  styles,
}: {
  block: NutrientHelpInnerBlock;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (block.type === 'heading') {
    return <Text style={styles.heading}>{block.text}</Text>;
  }
  if (block.type === 'paragraph') {
    return <Text style={styles.paragraph}>{block.text}</Text>;
  }
  if (block.type === 'math') {
    return <Text style={styles.formula}>{plainFormula(block.latex)}</Text>;
  }
  return (
    <View style={styles.list}>
      {block.items.map((item, index) => (
        <Text key={index} style={styles.paragraph}>
          {block.ordered ? `${index + 1}. ${item}` : `• ${item}`}
        </Text>
      ))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    sheet: { flex: 1, backgroundColor: c.screen },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: { flex: 1, color: c.text, fontSize: 18, fontWeight: '600' },
    close: { color: c.primary, fontSize: 16 },
    body: { padding: 16, paddingBottom: 48, gap: 8 },
    intro: { color: c.text, fontSize: 16, lineHeight: 22, marginBottom: 8 },
    section: { gap: 8, marginTop: 16 },
    sectionTitle: { color: c.text, fontSize: 18, fontWeight: '600' },
    summary: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
    heading: { color: c.text, fontSize: 16, fontWeight: '600', marginTop: 8 },
    paragraph: { color: c.text, fontSize: 15, lineHeight: 22 },
    list: { gap: 8 },
    formula: {
      color: c.text,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: c.surfaceMuted,
      padding: 10,
      borderRadius: 8,
    },
    curious: { color: c.primary, fontSize: 15, marginTop: 4 },
    example: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 8,
      padding: 10,
      gap: 4,
    },
    exampleTitle: { color: c.text, fontSize: 14, fontWeight: '600' },
    exampleLine: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  });
}
