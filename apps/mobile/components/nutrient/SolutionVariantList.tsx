import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  computeDeviations,
  growlogMacroMatchPct,
  type ElementKey,
  type FertilizerSpec,
  type SolveSolution,
} from '@growlog/nutrient-calc';
import {
  nitrogenBreakdown,
  nitrogenRowVisible,
  type NitrogenFormKey,
} from '@growlog/web-lib/nutrient/nitrogen-breakdown';
import {
  applyManualDoseAmounts,
  doseLineKey,
  isManualDose,
  parseDoseDraft,
  type ManualDoseLine,
} from '@growlog/web-lib/nutrient/manual-dose';
import {
  hasUsableTargetPpm,
  targetPpmFromAchievedSolution,
} from '@growlog/web-lib/nutrient/save-custom-target-profile';
import { formatNutrientPpm, showNutrientElementRow } from '@growlog/web-lib/nutrient/format-nutrient-amount';
import { nutrientTableElementKeys } from '@growlog/web-lib/nutrient/solver-deviation-keys';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

const ELEMENT_LABEL: Record<string, string> = {
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

type VariantDose = ManualDoseLine;

function saltPhrase(count: number, one: string, few: string, many: string): string {
  const n10 = Math.abs(count) % 10;
  const n100 = Math.abs(count) % 100;
  const word =
    n10 === 1 && n100 !== 11
      ? one
      : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)
        ? few
        : many;
  return `${count} ${word}`;
}

function formatAmount(value: number): string {
  const digits = value >= 100 ? 1 : 3;
  return value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function formatDelta(value: number): string {
  const text = value.toFixed(1);
  return value > 0 ? `+${text}` : text;
}

const NITROGEN_KEYS = new Set(['N', 'N_NO3', 'N_NH4', 'N_UREA', 'N_UNKNOWN']);

const FORM_LABEL: Record<Exclude<NitrogenFormKey, 'N_UNKNOWN'>, string> = {
  N_NO3: 'NO₃',
  N_NH4: 'NH₄',
  N_UREA: 'NH₂',
};

type CompositionRow = {
  element: string;
  label: string;
  targetPpm: number;
  achievedPpm: number;
  deltaPct: number | null;
  withinTolerance: boolean;
  forms: Array<{
    key: NitrogenFormKey;
    targetPpm: number;
    achievedPpm: number;
    deltaPct: number | null;
    withinTolerance: boolean;
  }>;
};

function elementRows(solution: SolveSolution, target: Record<string, number>): CompositionRow[] {
  const achieved = solution.achievedPpm as Record<string, number>;
  const keys = nutrientTableElementKeys({ showMicro: true, showOptionalIons: false }).filter(
    (key) => !NITROGEN_KEYS.has(key),
  );
  const deviations = computeDeviations(keys, target, achieved);
  const byElement = new Map(deviations.map((row) => [row.element, row]));
  const rows: CompositionRow[] = [];
  const nitrogen = nitrogenBreakdown(target, achieved);
  if (nitrogenRowVisible(nitrogen)) {
    rows.push({
      element: 'N',
      label: 'N',
      targetPpm: nitrogen.targetPpm,
      achievedPpm: nitrogen.achievedPpm,
      deltaPct: nitrogen.deltaPct,
      withinTolerance: nitrogen.withinTolerance,
      forms: nitrogen.forms,
    });
  }
  for (const element of keys) {
    const targetPpm = target[element] ?? 0;
    const achievedPpm = achieved[element] ?? 0;
    if (!showNutrientElementRow(targetPpm, achievedPpm)) continue;
    const deviation = byElement.get(element as ElementKey);
    rows.push({
      element,
      label: ELEMENT_LABEL[element] ?? element,
      targetPpm,
      achievedPpm,
      deltaPct: deviation ? deviation.deltaPct : null,
      withinTolerance: deviation ? deviation.withinTolerance : true,
      forms: [],
    });
  }
  return rows;
}

function DoseSwipeRow({ onZero, children }: { onZero: () => void; children: ReactNode }) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const styles = useThemedStyles(makeStyles);

  const zero = () => {
    onZero();
    swipeRef.current?.close();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1}
      rightThreshold={48}
      overshootRight={false}
      containerStyle={styles.doseSwipeWrap}
      childrenContainerStyle={styles.doseRowSwipeChild}
      renderRightActions={() => (
        <Pressable
          style={styles.doseZeroAction}
          onPress={zero}
          accessibilityRole="button"
          accessibilityLabel="0"
        >
          <Text style={styles.doseZeroActionText}>0</Text>
        </Pressable>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.LEFT) zero();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
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
  manualLabel,
  drafts,
  manualKeys,
  onDraft,
}: {
  doses: VariantDose[];
  volumeL: number;
  unitMass: string;
  unitVolume: string;
  unitMassShort: string;
  unitVolumeShort: string;
  stockLine: string;
  tankLine: string;
  manualLabel: string;
  drafts: Record<string, string>;
  manualKeys: ReadonlySet<string>;
  onDraft: (doseKey: string, text: string | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.doseList}>
      {doses.map((dose) => {
        const lineKey = doseLineKey(dose.fertilizerId, dose.tank);
        const liquid = dose.unit === 'ml_per_L';
        const unit = liquid ? unitVolume : unitMass;
        const totalUnit = liquid ? unitVolumeShort : unitMassShort;
        const total = dose.amountTotal ?? (volumeL > 0 ? dose.amountPerL * volumeL : 0);
        const showStock =
          dose.stockAmountPerL != null &&
          dose.stockAmountPerL > 0 &&
          dose.tank != null &&
          dose.tank !== 'single';
        const shown = drafts[lineKey] ?? formatAmount(dose.amountPerL);
        const effectiveAmount = parseDoseDraft(shown) ?? dose.amountPerL;
        const isZero = effectiveAmount < 1e-4;
        return (
          <DoseSwipeRow key={lineKey} onZero={() => onDraft(lineKey, '0')}>
            <View style={styles.doseRow}>
              <View style={styles.doseHead}>
                <View style={styles.doseNameBlock}>
                  <Text
                    style={[styles.doseName, isZero && styles.doseNameZeroed]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {dose.fertilizerName}
                  </Text>
                  {manualKeys.has(lineKey) ? <Text style={styles.manualBadge}>{manualLabel}</Text> : null}
                </View>
                <View style={styles.doseAmountCol}>
                  <TextInput
                    style={[styles.doseInput, isZero && styles.doseInputZeroed]}
                    value={shown}
                    onChangeText={(text) => onDraft(lineKey, text)}
                    onBlur={() => {
                      const parsed = parseDoseDraft(shown);
                      onDraft(lineKey, parsed == null ? null : formatAmount(parsed));
                    }}
                    keyboardType="decimal-pad"
                    keyboardAppearance={colors.keyboardAppearance}
                    accessibilityLabel={dose.fertilizerName}
                  />
                  <Text style={[styles.doseUnit, isZero && styles.doseUnitZeroed]} numberOfLines={1}>
                    {unit}
                  </Text>
                </View>
              </View>
              {volumeL > 0 ? (
                <Text style={[styles.doseStock, isZero && styles.doseStockZeroed]}>
                  {tankLine.replace('{amount}', formatAmount(total)).replace('{unit}', totalUnit)}
                </Text>
              ) : null}
              {showStock ? (
                <Text style={[styles.doseStock, isZero && styles.doseStockZeroed]}>
                  {stockLine
                    .replace('{amount}', formatAmount(dose.stockAmountPerL ?? 0))
                    .replace('{unit}', unit)
                    .replace('{tank}', (dose.tank ?? '').toUpperCase())}
                </Text>
              ) : null}
            </View>
          </DoseSwipeRow>
        );
      })}
    </View>
  );
}

export function SolutionVariantList({
  variants,
  target,
  volumeL,
  fertilizers,
  strings,
  onSaveMix,
  onSaveTarget,
}: {
  variants: SolveSolution[];
  target: Record<string, number>;
  volumeL: number;
  fertilizers: FertilizerSpec[];
  onSaveMix: (name: string, solution: SolveSolution) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  strings: {
    composition: string;
    compositionMeta: string;
    saltOne: string;
    saltFew: string;
    saltMany: string;
    variantsOnlyOne: string;
    manualDose: string;
    variantBest: string;
    variantAlt: string;
    elementTarget: string;
    elementAchieved: string;
    elementDelta: string;
    elementNUnknown: string;
    doseUnitMass: string;
    doseUnitVolume: string;
    doseUnitMassShort: string;
    doseUnitVolumeShort: string;
    doseStockLine: string;
    doseTankLine: string;
    ecLine: string;
    wandSectionMix: string;
    wandSectionTarget: string;
    save: string;
    recipeName: string;
    saveMixDone: string;
    error: string;
    saveTargetProfileName: string;
    saveTargetProfileDone: string;
    saveTargetProfileNeedMix: string;
  };
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const signature = variants
    .map((solution) => solution.doses.map((dose) => `${dose.fertilizerId}:${dose.amountPerL}`).join(','))
    .join('|');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setOpen({});
    setDrafts({});
  }, [signature]);

  const specsById = useMemo(
    () => new Map(fertilizers.map((spec) => [spec.id, spec])),
    [fertilizers],
  );

  const setDoseDraft = (variantIndex: number, doseKey: string, text: string | null) => {
    const key = `${variantIndex}:${doseKey}`;
    setDrafts((current) => {
      const next = { ...current };
      if (text == null) delete next[key];
      else next[key] = text;
      return next;
    });
  };

  const cards = useMemo(
    () =>
      variants
        .map((solution, index) => {
          const original = solution.doses as VariantDose[];
          const edits: Record<string, number> = {};
          const variantDrafts: Record<string, string> = {};
          for (const dose of original) {
            const lineKey = doseLineKey(dose.fertilizerId, dose.tank);
            const text = drafts[`${index}:${lineKey}`];
            if (text == null) continue;
            variantDrafts[lineKey] = text;
            const value = parseDoseDraft(text);
            if (value != null) edits[lineKey] = value;
          }
          const edited = applyManualDoseAmounts(solution, edits, specsById, volumeL);
          const byKey = new Map(
            (edited.doses as VariantDose[]).map((dose) => [doseLineKey(dose.fertilizerId, dose.tank), dose]),
          );
          const doses = original.map((dose) => byKey.get(doseLineKey(dose.fertilizerId, dose.tank)) ?? dose);
          const manualKeys = new Set(
            doses
              .filter((dose) => {
                const source = original.find(
                  (row) => doseLineKey(row.fertilizerId, row.tank) === doseLineKey(dose.fertilizerId, dose.tank),
                );
                return source != null && isManualDose(source.amountPerL, dose.amountPerL);
              })
              .map((dose) => doseLineKey(dose.fertilizerId, dose.tank)),
          );
          return { solution: edited, index, doses, original, drafts: variantDrafts, manualKeys };
        })
        .filter((card) => card.original.length > 0),
    [variants, drafts, specsById, volumeL],
  );

  return (
    <View style={styles.list}>
      {cards.map((card) => {
        const expanded = open[card.index] ?? false;
        const title =
          card.index === 0
            ? strings.variantBest
            : strings.variantAlt.replace('{n}', String(card.index));
        const score = growlogMacroMatchPct(target, card.solution.achievedPpm as Record<string, number>);
        const ec = card.solution.ecEstimateMsCm;
        const activeCount = card.doses.filter((dose) => dose.amountPerL > 0).length;
        const meta = `${saltPhrase(activeCount || card.doses.length, strings.saltOne, strings.saltFew, strings.saltMany)} · ${
          strings.compositionMeta.includes('{score}')
            ? strings.compositionMeta.replace('{score}', score.toFixed(1))
            : `${score.toFixed(1)}%`
        }`;
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
            drafts={card.drafts}
            manualKeys={card.manualKeys}
            onDraft={(doseKey, text) => setDoseDraft(card.index, doseKey, text)}
            rows={rows}
            volumeL={volumeL}
            colors={colors}
            strings={strings}
            achievedPpm={card.solution.achievedPpm as Record<string, number>}
            onToggle={() => setOpen((current) => ({ ...current, [card.index]: !expanded }))}
            onSaveMix={(name) => onSaveMix(name, card.solution)}
            onSaveTarget={onSaveTarget}
          />
        );
      })}
      {cards.length === 1 ? <Text style={styles.onlyOne}>{strings.variantsOnlyOne}</Text> : null}
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
  drafts,
  manualKeys,
  onDraft,
  rows,
  volumeL,
  colors,
  strings,
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
  drafts: Record<string, string>;
  manualKeys: ReadonlySet<string>;
  onDraft: (doseKey: string, text: string | null) => void;
  rows: ReturnType<typeof elementRows>;
  volumeL: number;
  colors: MobileThemeColors;
  strings: ComponentProps<typeof SolutionVariantList>['strings'];
  achievedPpm: Record<string, number>;
  onToggle: () => void;
  onSaveMix: (name: string) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
}) {
  const styles = useThemedStyles(makeStyles);
  const [saveKind, setSaveKind] = useState<'target' | 'mix'>('mix');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nitrogenOpen, setNitrogenOpen] = useState(false);
  const targetPpm = targetPpmFromAchievedSolution(achievedPpm);
  const targetReady = hasUsableTargetPpm(targetPpm);
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !saving && (saveKind === 'mix' || targetReady);

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
        {!expanded && manualKeys.size > 0 ? <Text style={styles.manualBadge}>{strings.manualDose}</Text> : null}
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
            manualLabel={strings.manualDose}
            drafts={drafts}
            manualKeys={manualKeys}
            onDraft={onDraft}
          />
          {rows.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.elementName} />
                <Text style={styles.elementHead}>{strings.elementTarget}</Text>
                <Text style={styles.elementHead}>{strings.elementAchieved}</Text>
                <Text style={styles.elementHead}>{strings.elementDelta}</Text>
              </View>
              {rows.map((row) => {
                const expandable = row.forms.length > 0;
                const open = row.element === 'N' && nitrogenOpen;
                return (
                  <View key={row.element}>
                    <View style={styles.tableRow}>
                      {expandable ? (
                        <Pressable
                          style={styles.elementNamePress}
                          accessibilityRole="button"
                          accessibilityLabel={row.label}
                          accessibilityState={{ expanded: open }}
                          onPress={() => setNitrogenOpen((current) => !current)}
                        >
                          <Text style={styles.elementDisclosure}>{open ? '▾' : '▸'}</Text>
                          <Text style={styles.elementName}>{row.label}</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.elementName}>{row.label}</Text>
                      )}
                      <Text style={styles.elementNum}>{formatNutrientPpm(row.targetPpm)}</Text>
                      <Text style={styles.elementNum}>{formatNutrientPpm(row.achievedPpm)}</Text>
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
                    {open
                      ? row.forms.map((form) => (
                          <View key={form.key} style={styles.tableRow}>
                            <Text style={[styles.elementName, styles.elementForm]}>
                              {form.key === 'N_UNKNOWN' ? strings.elementNUnknown : FORM_LABEL[form.key]}
                            </Text>
                            <Text style={styles.elementNum}>
                              {form.targetPpm > 0 ? formatNutrientPpm(form.targetPpm) : '—'}
                            </Text>
                            <Text style={styles.elementNum}>{formatNutrientPpm(form.achievedPpm)}</Text>
                            <Text
                              style={[
                                styles.elementNum,
                                form.deltaPct == null
                                  ? styles.elementMuted
                                  : { color: form.withinTolerance ? colors.okText : colors.dangerText },
                              ]}
                            >
                              {form.deltaPct == null ? '—' : formatDelta(form.deltaPct)}
                            </Text>
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={styles.section}>
            <View style={styles.kindSwitch} accessibilityRole="radiogroup">
              <Pressable
                style={[styles.kindOption, saveKind === 'target' && styles.kindOptionOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: saveKind === 'target' }}
                onPress={() => {
                  setSaveKind('target');
                  setStatus(null);
                }}
              >
                <Text style={[styles.kindOptionText, saveKind === 'target' && styles.kindOptionTextOn]}>
                  {strings.wandSectionTarget}
                </Text>
              </Pressable>
              <View style={styles.kindDivider} />
              <Pressable
                style={[styles.kindOption, saveKind === 'mix' && styles.kindOptionOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: saveKind === 'mix' }}
                onPress={() => {
                  setSaveKind('mix');
                  setStatus(null);
                }}
              >
                <Text style={[styles.kindOptionText, saveKind === 'mix' && styles.kindOptionTextOn]}>
                  {strings.wandSectionMix}
                </Text>
              </Pressable>
            </View>
            {saveKind === 'target' && !targetReady ? (
              <Text style={styles.meta}>{strings.saveTargetProfileNeedMix}</Text>
            ) : null}
            <TextInput
              style={styles.field}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setStatus(null);
              }}
              placeholder={saveKind === 'mix' ? strings.recipeName : strings.saveTargetProfileName}
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
            />
            <Pressable
              style={[styles.btn, !canSave && styles.btnDisabled]}
              disabled={!canSave}
              onPress={() => {
                if (!canSave) return;
                setSaving(true);
                setStatus(null);
                const pending =
                  saveKind === 'mix'
                    ? onSaveMix(trimmed).then((id) => setStatus(id ? strings.saveMixDone : strings.error))
                    : onSaveTarget(trimmed, targetPpm).then((id) =>
                        setStatus(id ? strings.saveTargetProfileDone : strings.error),
                      );
                void pending.catch(() => setStatus(strings.error)).finally(() => setSaving(false));
              }}
            >
              <Text style={styles.btnText}>{strings.save}</Text>
            </Pressable>
            {status ? <Text style={styles.meta}>{status}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    list: { gap: 10 },
    onlyOne: { fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 2 },
    variant: {
      backgroundColor: c.screen,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    header: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    meta: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    metaWarn: { color: c.dangerText },
    body: { gap: 8, paddingTop: 6 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: c.text },
    doseList: { gap: 10 },
    doseSwipeWrap: { overflow: 'hidden', borderRadius: 8 },
    doseRowSwipeChild: { backgroundColor: c.screen },
    doseZeroAction: {
      width: 56,
      backgroundColor: c.dangerText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doseRow: { gap: 2 },
    doseZeroActionText: { color: c.primaryText, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
    doseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    doseNameBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    doseName: { flexShrink: 1, fontSize: 15, lineHeight: 20, color: c.text },
    doseAmountCol: {
      width: 124,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      flexShrink: 0,
    },
    doseNameZeroed: { color: c.textMuted },
    doseInput: {
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      textAlign: 'right',
      fontSize: 15,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    doseInputZeroed: {
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.textMuted,
      fontWeight: '500',
    },
    doseUnit: { width: 44, fontSize: 13, lineHeight: 18, color: c.textMuted },
    doseUnitZeroed: { opacity: 0.75 },
    doseStockZeroed: { opacity: 0.75 },
    manualBadge: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: c.primary,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
    },
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
    elementNamePress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
    elementDisclosure: { width: 12, fontSize: 12, color: c.textMuted },
    elementName: { flex: 1, fontSize: 13, color: c.text },
    elementForm: { paddingLeft: 16, color: c.textMuted },
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
    kindSwitch: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      overflow: 'hidden',
      backgroundColor: c.inputBg,
    },
    kindOption: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    kindOptionOn: { backgroundColor: c.primary },
    kindDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.inputBorder },
    kindOptionText: { fontSize: 15, fontWeight: '600', color: c.text },
    kindOptionTextOn: { color: c.primaryText },
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
