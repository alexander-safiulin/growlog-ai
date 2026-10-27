import { SaveCustomTargetProfileBlock } from '@/components/nutrient/SaveCustomTargetProfileBlock';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  computeDeviations,
  growlogMacroMatchPct,
  type ElementKey,
  type SolveSolution,
} from '@growlog/nutrient-calc';
import { nutrientTableElementKeys } from '@growlog/web-lib/nutrient/solver-deviation-keys';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const ELEMENT_LABEL: Record<string, string> = {
  N_NO3: 'NO₃-N',
  N_NH4: 'NH₄-N',
  N_UREA: 'Urea-N',
  P: 'P',
  K: 'K',
  Ca: 'Ca',
  Mg: 'Mg',
  S: 'S',
  Fe: 'Fe',
  Mn: 'Mn',
  Zn: 'Zn',
  Cu: 'Cu',
  B: 'B',
  Mo: 'Mo',
  Co: 'Co',
};

type VariantDose = SolveSolution['doses'][number] & { stockAmountPerL?: number };

function formatAmount(value: number): string {
  const digits = value >= 100 ? 1 : 3;
  return value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function formatPpm(value: number): string {
  return value.toFixed(1);
}

function formatDelta(value: number): string {
  const text = value.toFixed(1);
  return value > 0 ? `+${text}` : text;
}

function elementRows(solution: SolveSolution, target: Record<string, number>) {
  const keys = nutrientTableElementKeys({ showMicro: true, showOptionalIons: false });
  const achieved = solution.achievedPpm as Record<string, number>;
  const deviations = computeDeviations(keys, target, achieved);
  const byElement = new Map(deviations.map((row) => [row.element, row]));
  return keys.flatMap((element) => {
    const targetPpm = target[element] ?? 0;
    const achievedPpm = achieved[element] ?? 0;
    if (targetPpm <= 0 && achievedPpm < 0.05) return [];
    const deviation = byElement.get(element as ElementKey);
    return [
      {
        element,
        label: ELEMENT_LABEL[element] ?? element,
        targetPpm,
        achievedPpm,
        deltaPct: deviation ? deviation.deltaPct : null,
        withinTolerance: deviation ? deviation.withinTolerance : true,
      },
    ];
  });
}

function DoseList({
  doses,
  volumeL,
  unitMass,
  unitVolume,
  unitMassShort,
  unitVolumeShort,
  stockLine,
  tankLine,
}: {
  doses: VariantDose[];
  volumeL: number;
  unitMass: string;
  unitVolume: string;
  unitMassShort: string;
  unitVolumeShort: string;
  stockLine: string;
  tankLine: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.doseList}>
      {doses.map((dose) => {
        const liquid = dose.unit === 'ml_per_L';
        const unit = liquid ? unitVolume : unitMass;
        const totalUnit = liquid ? unitVolumeShort : unitMassShort;
        const total = dose.amountTotal ?? (volumeL > 0 ? dose.amountPerL * volumeL : 0);
        const showStock =
          dose.stockAmountPerL != null &&
          dose.stockAmountPerL > 0 &&
          dose.tank != null &&
          dose.tank !== 'single';
        return (
          <View key={`${dose.fertilizerId}-${dose.tank ?? 'single'}`} style={styles.doseRow}>
            <View style={styles.doseHead}>
              <Text style={styles.doseName}>{dose.fertilizerName}</Text>
              <Text style={styles.doseAmount}>
                {formatAmount(dose.amountPerL)} {unit}
              </Text>
            </View>
            {volumeL > 0 ? (
              <Text style={styles.doseStock}>
                {tankLine.replace('{amount}', formatAmount(total)).replace('{unit}', totalUnit)}
              </Text>
            ) : null}
            {showStock ? (
              <Text style={styles.doseStock}>
                {stockLine
                  .replace('{amount}', formatAmount(dose.stockAmountPerL ?? 0))
                  .replace('{unit}', unit)
                  .replace('{tank}', (dose.tank ?? '').toUpperCase())}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function SolutionVariantList({
  variants,
  target,
  volumeL,
  strings,
  saveMixLabel,
  onSaveMix,
  onSaveTarget,
}: {
  variants: SolveSolution[];
  target: Record<string, number>;
  volumeL: number;
  saveMixLabel: string;
  onSaveMix: (name: string, solution: SolveSolution) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  strings: {
    composition: string;
    compositionMeta: string;
    variantBest: string;
    variantAlt: string;
    elementTarget: string;
    elementAchieved: string;
    elementDelta: string;
    doseUnitMass: string;
    doseUnitVolume: string;
    doseUnitMassShort: string;
    doseUnitVolumeShort: string;
    doseStockLine: string;
    doseTankLine: string;
    ecLine: string;
    wandSectionMix: string;
    wandSectionTarget: string;
    recipeName: string;
    saveMixDone: string;
    error: string;
    saveTargetProfileName: string;
    saveTargetProfile: string;
    saveTargetProfileDone: string;
    saveTargetProfileNeedMix: string;
  };
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const signature = variants
    .map((solution) => solution.doses.map((dose) => `${dose.fertilizerId}:${dose.amountPerL}`).join(','))
    .join('|');
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    setOpen({ 0: true });
  }, [signature]);

  const cards = useMemo(
    () =>
      variants
        .map((solution, index) => ({
          solution,
          index,
          doses: solution.doses.filter((dose) => dose.amountPerL > 0) as VariantDose[],
        }))
        .filter((card) => card.doses.length > 0),
    [variants],
  );

  return (
    <View style={styles.list}>
      {cards.map((card) => {
        const expanded = open[card.index] ?? card.index === cards[0]?.index;
        const title =
          card.index === 0
            ? strings.variantBest
            : strings.variantAlt.replace('{n}', String(card.index));
        const score = growlogMacroMatchPct(target, card.solution.achievedPpm as Record<string, number>);
        const ec = card.solution.ecEstimateMsCm;
        const meta = strings.compositionMeta
          .replace('{count}', String(card.doses.length))
          .replace('{score}', score.toFixed(1));
        const ecText =
          typeof ec === 'number' && Number.isFinite(ec) ? strings.ecLine.replace('{value}', ec.toFixed(2)) : null;
        const rows = expanded ? elementRows(card.solution, target) : [];
        return (
          <VariantCard
            key={card.index}
            expanded={expanded}
            title={title}
            meta={meta}
            ecText={ecText}
            weak={score < 50}
            doses={card.doses}
            rows={rows}
            volumeL={volumeL}
            colors={colors}
            strings={strings}
            saveMixLabel={saveMixLabel}
            achievedPpm={card.solution.achievedPpm as Record<string, number>}
            onToggle={() => setOpen((current) => ({ ...current, [card.index]: !expanded }))}
            onSaveMix={(name) => onSaveMix(name, card.solution)}
            onSaveTarget={onSaveTarget}
          />
        );
      })}
    </View>
  );
}

function VariantCard({
  expanded,
  title,
  meta,
  ecText,
  weak,
  doses,
  rows,
  volumeL,
  colors,
  strings,
  saveMixLabel,
  achievedPpm,
  onToggle,
  onSaveMix,
  onSaveTarget,
}: {
  expanded: boolean;
  title: string;
  meta: string;
  ecText: string | null;
  weak: boolean;
  doses: VariantDose[];
  rows: ReturnType<typeof elementRows>;
  volumeL: number;
  colors: MobileThemeColors;
  strings: ComponentProps<typeof SolutionVariantList>['strings'];
  saveMixLabel: string;
  achievedPpm: Record<string, number>;
  onToggle: () => void;
  onSaveMix: (name: string) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
}) {
  const styles = useThemedStyles(makeStyles);
  const [mixName, setMixName] = useState('');
  const [mixStatus, setMixStatus] = useState<string | null>(null);
  const [mixSaving, setMixSaving] = useState(false);

  return (
    <View style={styles.variant}>
      <Pressable
        style={styles.header}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>
          {expanded ? '▾' : '▸'} {title}
        </Text>
      </Pressable>
      <Text style={[styles.meta, weak && styles.metaWarn]}>{meta}</Text>
      {ecText ? <Text style={styles.meta}>{ecText}</Text> : null}
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>{strings.composition}</Text>
          <DoseList
            doses={doses}
            volumeL={volumeL}
            unitMass={strings.doseUnitMass}
            unitVolume={strings.doseUnitVolume}
            unitMassShort={strings.doseUnitMassShort}
            unitVolumeShort={strings.doseUnitVolumeShort}
            stockLine={strings.doseStockLine}
            tankLine={strings.doseTankLine}
          />
          {rows.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.elementName} />
                <Text style={styles.elementHead}>{strings.elementTarget}</Text>
                <Text style={styles.elementHead}>{strings.elementAchieved}</Text>
                <Text style={styles.elementHead}>{strings.elementDelta}</Text>
              </View>
              {rows.map((row) => (
                <View key={row.element} style={styles.tableRow}>
                  <Text style={styles.elementName}>{row.label}</Text>
                  <Text style={styles.elementNum}>{formatPpm(row.targetPpm)}</Text>
                  <Text style={styles.elementNum}>{formatPpm(row.achievedPpm)}</Text>
                  <Text
                    style={[
                      styles.elementNum,
                      row.deltaPct == null
                        ? styles.elementMuted
                        : { color: row.withinTolerance ? colors.okText : colors.dangerText },
                    ]}
                  >
                    {row.deltaPct == null ? '—' : formatDelta(row.deltaPct)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{strings.wandSectionMix}</Text>
            <TextInput
              style={styles.field}
              value={mixName}
              onChangeText={(value) => {
                setMixName(value);
                setMixStatus(null);
              }}
              placeholder={strings.recipeName}
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
            />
            <Pressable
              style={[styles.btn, (!mixName.trim() || mixSaving) && styles.btnDisabled]}
              disabled={!mixName.trim() || mixSaving}
              onPress={() => {
                if (!mixName.trim() || mixSaving) return;
                setMixSaving(true);
                setMixStatus(null);
                void onSaveMix(mixName.trim())
                  .then((id) => setMixStatus(id ? strings.saveMixDone : strings.error))
                  .catch(() => setMixStatus(strings.error))
                  .finally(() => setMixSaving(false));
              }}
            >
              <Text style={styles.btnText}>{saveMixLabel}</Text>
            </Pressable>
            {mixStatus ? <Text style={styles.meta}>{mixStatus}</Text> : null}
          </View>
          <View style={styles.section}>
            <SaveCustomTargetProfileBlock
              achievedPpm={achievedPpm}
              colors={colors}
              onSave={onSaveTarget}
              sectionTitle={strings.wandSectionTarget}
              buttonVariant="outline"
              fullWidth
              strings={{
                namePlaceholder: strings.saveTargetProfileName,
                action: strings.saveTargetProfile,
                done: strings.saveTargetProfileDone,
                needMix: strings.saveTargetProfileNeedMix,
                error: strings.error,
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    list: { gap: 10 },
    variant: {
      backgroundColor: c.screen,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    header: { minHeight: 32, justifyContent: 'center' },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    meta: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    metaWarn: { color: c.dangerText },
    body: { gap: 8, paddingTop: 6 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: c.text },
    doseList: { gap: 10 },
    doseRow: { gap: 2 },
    doseHead: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
    doseName: { flex: 1, fontSize: 15, lineHeight: 20, color: c.text },
    doseAmount: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    doseStock: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    table: { gap: 4, marginTop: 4 },
    tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
    elementName: { flex: 1, fontSize: 13, color: c.text },
    elementHead: {
      width: 58,
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      textAlign: 'right',
    },
    elementNum: {
      width: 58,
      fontSize: 13,
      color: c.text,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    elementMuted: { color: c.textMuted },
    section: {
      gap: 8,
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    field: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },
    btn: { backgroundColor: c.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.primaryText, fontWeight: '600' },
  });
}
