import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  computeDeviations,
  growlogMacroMatchPct,
  parseAssembleWarning,
  unspecifiedNitrogenMissesFormTarget,
  type ElementKey,
  type FertilizerSpec,
  type SolveSolution,
} from '@growlog/nutrient-calc';
import {
  mixFavoriteFingerprint,
  type GuestMixFavorite,
  type GuestMixFavoriteDraft,
} from '@growlog/domain';
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

function tankId(tank: string | undefined): 'single' | 'a' | 'b' {
  const value = (tank ?? 'single').toLowerCase();
  if (value === 'a' || value === 'b') return value;
  return 'single';
}

function mixFavoriteDraftFromCard(input: {
  label: string;
  matchPct: number;
  ecMsCm: number | null;
  volumeL: number;
  targetPpm: Record<string, number>;
  achievedPpm: Record<string, number>;
  doses: VariantDose[];
}): GuestMixFavoriteDraft {
  return {
    label: input.label,
    matchPct: input.matchPct,
    ecMsCm: input.ecMsCm,
    volumeL: input.volumeL,
    targetPpm: input.targetPpm,
    achievedPpm: input.achievedPpm,
    doses: input.doses
      .filter((dose) => dose.amountPerL > 0)
      .map((dose) => ({
        fertilizerId: dose.fertilizerId,
        name: dose.fertilizerName,
        amountPerL: dose.amountPerL,
        unit: dose.unit === 'ml_per_L' ? 'ml_per_L' : 'g_per_L',
        tank: tankId(dose.tank),
      })),
  };
}

function favoriteAsSolution(favorite: GuestMixFavorite): SolveSolution {
  return {
    doses: favorite.doses.map((dose) => ({
      fertilizerId: dose.fertilizerId,
      fertilizerName: dose.name,
      amountPerL: dose.amountPerL,
      unit: dose.unit,
      tank: dose.tank,
    })),
    achievedPpm: favorite.achievedPpm,
    deviations: [],
    matchScore: favorite.matchPct / 100,
    weightedError: 0,
    warnings: [],
    ...(favorite.ecMsCm != null ? { ecEstimateMsCm: favorite.ecMsCm } : {}),
  };
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

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

const NBSP = '\u00A0';

/** Keep one-letter macro symbols from starting a wrapped line after a comma or after «без/without». */
function tieMacroSymbols(text: string): string {
  return text
    .replace(/,\s*([NPK]|Ca|Mg|S)\s+/g, `,${NBSP}$1${NBSP}`)
    .replace(/\s(без|without|ohne|senza|sin|sans)\s+([NPK]|Ca|Mg|S)([.\s]|$)/gi, ` $1${NBSP}$2$3`)
    .replace(/\s(соль|salt|Salz|sale|sel|muối|เกลือ)\s+([NPK]|Ca|Mg|S)\s+/gi, ` $1${NBSP}$2${NBSP}`);
}

function listConjunction(locale: string, parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

function assembleNotes(
  warnings: string[],
  listLocale: string,
  target: Record<string, number>,
  strings: {
    assembleShort: string;
    assembleBlocked: string;
    assembleBlockedMulti: string;
    assembleMissing: string;
    assembleFloor: string;
    nitrogenFormGap: string;
  },
): string[] {
  const blockedByBlocker = new Map<string, Array<{ element: string; pct: string }>>();
  for (const code of warnings) {
    const parsed = parseAssembleWarning(code);
    if (parsed?.kind !== 'blocked') continue;
    const group = blockedByBlocker.get(parsed.blocker) ?? [];
    group.push({ element: parsed.element, pct: parsed.pct });
    blockedByBlocker.set(parsed.blocker, group);
  }
  const handledBlocker = new Set<string>();

  const notes: string[] = [];
  let assembleCount = 0;
  for (const code of warnings) {
    const parsed = parseAssembleWarning(code);
    if (!parsed) continue;
    if (parsed.kind === 'missing') {
      assembleCount += 1;
      notes.push(tieMacroSymbols(fill(strings.assembleMissing, { element: parsed.element })));
    } else if (parsed.kind === 'blocked') {
      if (handledBlocker.has(parsed.blocker)) continue;
      handledBlocker.add(parsed.blocker);
      assembleCount += 1;
      const group = blockedByBlocker.get(parsed.blocker) ?? [];
      if (group.length > 1) {
        const entries = listConjunction(
          listLocale,
          group.map((row) => `${row.element} (${row.pct}%)`),
        );
        const salts = listConjunction(
          listLocale,
          group.map((row) => row.element),
        );
        notes.push(
          tieMacroSymbols(
            fill(strings.assembleBlockedMulti, {
              entries,
              blocker: parsed.blocker,
              salts,
            }),
          ),
        );
      } else {
        notes.push(
          tieMacroSymbols(
            fill(strings.assembleBlocked, {
              element: parsed.element,
              pct: parsed.pct,
              blocker: parsed.blocker,
            }),
          ),
        );
      }
    } else {
      assembleCount += 1;
      notes.push(tieMacroSymbols(fill(strings.assembleShort, { element: parsed.element, pct: parsed.pct })));
    }
  }
  if (unspecifiedNitrogenMissesFormTarget(target, warnings)) {
    notes.push(strings.nitrogenFormGap);
  }
  if (assembleCount > 0) notes.push(strings.assembleFloor);
  return notes;
}

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
  listLocale,
  mixFavorites,
  onToggleMixFavorite,
  onSaveMix,
  onSaveTarget,
}: {
  variants: SolveSolution[];
  target: Record<string, number>;
  volumeL: number;
  fertilizers: FertilizerSpec[];
  listLocale: string;
  mixFavorites?: GuestMixFavorite[];
  onToggleMixFavorite?: (draft: GuestMixFavoriteDraft) => void;
  onSaveMix: (
    name: string,
    solution: SolveSolution,
    source?: { selectedIds: string[]; volumeL: number },
  ) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  strings: {
    composition: string;
    compositionMeta: string;
    saltOne: string;
    saltFew: string;
    saltMany: string;
    variantsOnlyOne: string;
    assembleShort: string;
    assembleBlocked: string;
    assembleBlockedMulti: string;
    assembleMissing: string;
    assembleFloor: string;
    nitrogenFormGap: string;
    mixFavoriteAdd: string;
    mixFavoriteRemove: string;
    mixFavoritesClear: string;
    mixFavoritesHint: string;
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
        const notes = assembleNotes(card.solution.warnings, listLocale, target, strings);
        const rows = expanded ? elementRows(card.solution, target) : [];
        const achievedPpm = card.solution.achievedPpm as Record<string, number>;
        const ecValue = typeof ec === 'number' && Number.isFinite(ec) ? ec : null;
        const draft = mixFavoriteDraftFromCard({
          label: title,
          matchPct: score,
          ecMsCm: ecValue,
          volumeL,
          targetPpm: target,
          achievedPpm,
          doses: card.doses,
        });
        const fingerprint = mixFavoriteFingerprint(draft.doses);
        const favorited =
          fingerprint.length > 0 &&
          (mixFavorites ?? []).some((row) => mixFavoriteFingerprint(row.doses) === fingerprint);
        return (
          <VariantCard
            key={card.index}
            expanded={expanded}
            title={title}
            meta={meta}
            ecText={ecText}
            notes={notes}
            favorited={favorited}
            canFavorite={draft.doses.length > 0}
            doses={card.doses}
            drafts={card.drafts}
            manualKeys={card.manualKeys}
            onDraft={(doseKey, text) => setDoseDraft(card.index, doseKey, text)}
            rows={rows}
            volumeL={volumeL}
            colors={colors}
            strings={strings}
            achievedPpm={achievedPpm}
            onToggle={() => setOpen((current) => ({ ...current, [card.index]: !expanded }))}
            onToggleFavorite={() => onToggleMixFavorite?.(draft)}
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
  notes,
  favorited,
  canFavorite,
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
  onToggleFavorite,
  onSaveMix,
  onSaveTarget,
}: {
  expanded: boolean;
  title: string;
  meta: string;
  ecText: string | null;
  notes: string[];
  favorited: boolean;
  canFavorite: boolean;
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
  onToggleFavorite: () => void;
  onSaveMix: (name: string) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.variant}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text style={styles.title}>
            {expanded ? '▾' : '▸'} {title}
          </Text>
          {!expanded && manualKeys.size > 0 ? <Text style={styles.manualBadge}>{strings.manualDose}</Text> : null}
        </Pressable>
        <Pressable
          style={styles.starBtn}
          disabled={!canFavorite}
          onPress={onToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={favorited ? strings.mixFavoriteRemove : strings.mixFavoriteAdd}
          accessibilityState={{ selected: favorited, disabled: !canFavorite }}
          hitSlop={8}
        >
          <Text style={[styles.starGlyph, favorited ? styles.starGlyphOn : styles.starGlyphOff]}>
            {favorited ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>{meta}</Text>
      {ecText ? <Text style={styles.meta}>{ecText}</Text> : null}
      {notes.length > 0 ? (
        <View style={styles.shortfallList}>
          {notes.map((note, index) => (
            <View key={`${index}-${note}`} style={styles.shortfallRow}>
              <Text style={styles.shortfallBullet} accessibilityElementsHidden importantForAccessibility="no">
                •
              </Text>
              <Text style={styles.shortfallText}>{note}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
            <ElementComparisonTable rows={rows} colors={colors} strings={strings} />
          ) : null}
          <SolutionSaveForm
            achievedPpm={achievedPpm}
            colors={colors}
            strings={strings}
            onSaveMix={onSaveMix}
            onSaveTarget={onSaveTarget}
          />
        </View>
      ) : null}
    </View>
  );
}

type VariantStrings = ComponentProps<typeof SolutionVariantList>['strings'];

function ElementComparisonTable({
  rows,
  colors,
  strings,
}: {
  rows: ReturnType<typeof elementRows>;
  colors: MobileThemeColors;
  strings: VariantStrings;
}) {
  const styles = useThemedStyles(makeStyles);
  const [nitrogenOpen, setNitrogenOpen] = useState(false);
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View style={styles.elementNameCell} />
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
              <View style={styles.elementNameCell}>
                {expandable ? (
                  <Pressable
                    style={styles.elementNamePress}
                    accessibilityRole="button"
                    accessibilityLabel={row.label}
                    accessibilityState={{ expanded: open }}
                    onPress={() => setNitrogenOpen((current) => !current)}
                  >
                    <Text style={styles.elementNameText}>{row.label}</Text>
                    <Text style={styles.elementDisclosure} accessibilityElementsHidden importantForAccessibility="no">
                      {open ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Text style={styles.elementNameText}>{row.label}</Text>
                    <View style={styles.elementDisclosureSlot} />
                  </>
                )}
              </View>
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
                    <Text style={[styles.elementNameText, styles.elementForm]}>
                      {form.key === 'N_UNKNOWN' ? strings.elementNUnknown : FORM_LABEL[form.key]}
                    </Text>
                    <Text style={styles.elementNum}>{form.targetPpm > 0 ? formatNutrientPpm(form.targetPpm) : '—'}</Text>
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
  );
}

function SolutionSaveForm({
  achievedPpm,
  colors,
  strings,
  onSaveMix,
  onSaveTarget,
}: {
  achievedPpm: Record<string, number>;
  colors: MobileThemeColors;
  strings: VariantStrings;
  onSaveMix: (name: string) => Promise<string | null>;
  onSaveTarget: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
}) {
  const styles = useThemedStyles(makeStyles);
  const [saveKind, setSaveKind] = useState<'target' | 'mix'>('mix');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const targetPpm = targetPpmFromAchievedSolution(achievedPpm);
  const targetReady = hasUsableTargetPpm(targetPpm);
  const trimmed = name.trim();
  const ready = trimmed.length > 0 && (saveKind === 'mix' || targetReady);
  const canSave = ready && !saving;

  return (
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
        style={[styles.btn, !ready && styles.btnDisabled, saving && styles.btnSaving]}
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
        <Text style={[styles.btnText, !ready && styles.btnTextDisabled]}>{strings.save}</Text>
      </Pressable>
      {status ? <Text style={styles.meta}>{status}</Text> : null}
    </View>
  );
}

export function MixFavoriteList({
  favorites,
  strings,
  onRemove,
  onClear,
  onSaveMix,
  onSaveTarget,
}: {
  favorites: GuestMixFavorite[];
  strings: VariantStrings;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSaveMix: ComponentProps<typeof SolutionVariantList>['onSaveMix'];
  onSaveTarget: ComponentProps<typeof SolutionVariantList>['onSaveTarget'];
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <View style={styles.list}>
      <Text style={styles.favoriteHint}>{strings.mixFavoritesHint}</Text>
      {favorites.map((favorite) => {
        const expanded = open[favorite.id] ?? false;
        const date = favorite.savedAt.slice(0, 10);
        const title = date.length === 10 ? `${favorite.label} · ${date}` : favorite.label;
        const ecText =
          favorite.ecMsCm != null && Number.isFinite(favorite.ecMsCm)
            ? strings.ecLine.replace('{value}', favorite.ecMsCm.toFixed(2))
            : null;
        const meta = `${saltPhrase(favorite.doses.length, strings.saltOne, strings.saltFew, strings.saltMany)} · ${
          strings.compositionMeta.includes('{score}')
            ? strings.compositionMeta.replace('{score}', favorite.matchPct.toFixed(1))
            : `${favorite.matchPct.toFixed(1)}%`
        }`;
        const solution = favoriteAsSolution(favorite);
        const rows = expanded ? elementRows(solution, favorite.targetPpm) : [];
        return (
          <View key={favorite.id} style={styles.variant}>
            <View style={styles.header}>
              <Pressable
                style={styles.headerMain}
                onPress={() => setOpen((current) => ({ ...current, [favorite.id]: !expanded }))}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <Text style={styles.title}>
                  {expanded ? '▾' : '▸'} {title}
                </Text>
              </Pressable>
              <Pressable
                style={styles.starBtn}
                onPress={() => onRemove(favorite.id)}
                accessibilityRole="button"
                accessibilityLabel={strings.mixFavoriteRemove}
                hitSlop={8}
              >
                <Text style={[styles.starGlyph, styles.starGlyphOn]}>★</Text>
              </Pressable>
            </View>
            <Text style={styles.meta}>{meta}</Text>
            {ecText ? <Text style={styles.meta}>{ecText}</Text> : null}
            {expanded ? (
              <View style={styles.body}>
                <Text style={styles.sectionLabel}>{strings.composition}</Text>
                <View style={styles.doseList}>
                  {favorite.doses.map((dose) => {
                    const mass = dose.unit !== 'ml_per_L';
                    const unit = mass ? strings.doseUnitMass : strings.doseUnitVolume;
                    const totalUnit = mass ? strings.doseUnitMassShort : strings.doseUnitVolumeShort;
                    const total = dose.amountPerL * favorite.volumeL;
                    return (
                      <View key={`${dose.fertilizerId}:${dose.tank}`} style={styles.doseRow}>
                        <View style={styles.doseHead}>
                          <Text style={styles.doseName}>{dose.name}</Text>
                          <Text style={styles.doseAmount}>
                            {formatAmount(dose.amountPerL)} {unit}
                          </Text>
                        </View>
                        {favorite.volumeL > 0 ? (
                          <Text style={styles.doseStock}>
                            {strings.doseTankLine
                              .replace('{amount}', formatAmount(total))
                              .replace('{unit}', totalUnit)}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                {rows.length > 0 ? <ElementComparisonTable rows={rows} colors={colors} strings={strings} /> : null}
                <SolutionSaveForm
                  achievedPpm={favorite.achievedPpm}
                  colors={colors}
                  strings={strings}
                  onSaveMix={(name) =>
                    onSaveMix(name, solution, {
                      selectedIds: favorite.doses.map((dose) => dose.fertilizerId),
                      volumeL: favorite.volumeL,
                    })
                  }
                  onSaveTarget={onSaveTarget}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      <Pressable style={styles.clearFavorites} onPress={onClear} accessibilityRole="button">
        <Text style={styles.clearFavoritesText}>{strings.mixFavoritesClear}</Text>
      </Pressable>
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
    headerMain: { flex: 1, minWidth: 0, minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: c.text },
    starBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    starGlyph: { fontSize: 22, lineHeight: 26 },
    starGlyphOn: { color: c.primary },
    starGlyphOff: { color: c.textMuted },
    favoriteHint: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    clearFavorites: { alignSelf: 'flex-start', paddingVertical: 6 },
    clearFavoritesText: { fontSize: 13, fontWeight: '600', color: c.dangerText },
    meta: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    shortfallList: { gap: 4, marginTop: 2 },
    shortfallRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    shortfallBullet: { fontSize: 13, lineHeight: 18, color: c.textMuted, width: 10, textAlign: 'center' },
    shortfallText: { flex: 1, fontSize: 13, lineHeight: 18, color: c.text },
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
    elementNameCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
    elementNamePress: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      minHeight: 32,
    },
    elementDisclosure: { width: 16, fontSize: 11, lineHeight: 14, color: c.textMuted, textAlign: 'right' },
    elementDisclosureSlot: { width: 16, flexShrink: 0 },
    elementNameText: { flex: 1, minWidth: 0, fontSize: 13, color: c.text },
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
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      backgroundColor: c.inputBg,
    },
    kindOption: {
      flex: 1,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    kindOptionOn: { backgroundColor: c.rowActiveBg },
    kindDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border },
    kindOptionText: { fontSize: 13, fontWeight: '500', color: c.textMuted },
    kindOptionTextOn: { color: c.primary, fontWeight: '600' },
    field: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
    },
    btn: {
      backgroundColor: c.primary,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    btnDisabled: { backgroundColor: c.inputBg, borderColor: c.inputBorder },
    btnSaving: { opacity: 0.7 },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    btnTextDisabled: { color: c.textMuted },
  });
}
