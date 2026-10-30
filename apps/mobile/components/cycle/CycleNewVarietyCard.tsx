import {
  CycleFormCard,
  CycleFormChip,
  CycleFormChipRow,
  CycleFormDivider,
  CycleFormFieldInput,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import { VarietyPlantLabelsSection } from '@/components/cycle/VarietyPlantLabelsSection';
import {
  JournalVoiceFieldSection,
  useJournalVoiceField,
} from '@/components/voice/JournalVoiceField';
import { useMobileLocale } from '@/context/LocaleContext';
import { resizePlantSlotIds } from '@/lib/plant-slot-ids';
import type { PhotoPickResult } from '@/lib/photo-upload';
import {
  growCycleVarietyRpcPayload,
  growerNumberFieldErrorRu,
  parseGrowerNumber,
  type GrowCycleVarietyInput,
} from '@growlog/domain';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';

export type CycleNewVarietyCardHandle = {
  buildInput(): GrowCycleVarietyInput | null;
  photoPick(): PhotoPickResult | null;
  fieldError(): string | null;
};

type Props = {
  index: number;
  canRemove: boolean;
  disabled?: boolean;
  voiceActive?: boolean;
  onRemove: () => void;
  onFieldError: (message: string | null) => void;
};

export const CycleNewVarietyCard = forwardRef<CycleNewVarietyCardHandle, Props>(
  function CycleNewVarietyCard(
    { index, canRemove, disabled, voiceActive = true, onRemove, onFieldError },
    ref,
  ) {
    const { strings } = useMobileLocale();
    const copy = strings.cycle;
    const [cultivarName, setCultivarName] = useState('');
    const [plantCount, setPlantCount] = useState('');
    const [startMaterial, setStartMaterial] = useState<'seed' | 'clone'>('seed');
    const [comment, setComment] = useState('');
    const [localFieldError, setLocalFieldError] = useState<string | null>(null);
    const [plantSlotIds, setPlantSlotIds] = useState<string[]>([]);

    useEffect(() => {
      const pc = plantCount.trim() ? parseGrowerNumber(plantCount, { integer: true }) : null;
      const n = pc?.ok ? pc.value : 0;
      setPlantSlotIds((prev) => resizePlantSlotIds(n, prev));
    }, [plantCount]);

    const onVoiceError = useCallback(
      (message: string | null) => {
        onFieldError(message);
      },
      [onFieldError],
    );

    const voiceField = useJournalVoiceField({
      active: voiceActive,
      onChangeText: (next) => {
        setComment(next);
        setLocalFieldError(null);
        onFieldError(null);
      },
      onError: onVoiceError,
      disabled,
    });

    useImperativeHandle(
      ref,
      () => ({
        buildInput(): GrowCycleVarietyInput | null {
          const trimmedName = cultivarName.trim();
          const pc = plantCount.trim() ? parseGrowerNumber(plantCount, { integer: true }) : null;
          const draft: GrowCycleVarietyInput = {
            cultivarName: trimmedName,
            plantCount: pc?.ok ? pc.value : null,
            startMaterial,
            comment: comment.trim() || null,
            plantIds: plantSlotIds.length ? [...plantSlotIds] : undefined,
          };
          const [row] = growCycleVarietyRpcPayload([draft]);
          if (!row && !voiceField.photoPick) return null;
          return draft;
        },
        photoPick(): PhotoPickResult | null {
          return voiceField.photoPick;
        },
        fieldError(): string | null {
          return localFieldError;
        },
      }),
      [comment, cultivarName, localFieldError, plantCount, plantSlotIds, startMaterial, voiceField],
    );

    function validatePlantCount(): string | null {
      if (!plantCount.trim()) return null;
      const pc = parseGrowerNumber(plantCount, { integer: true });
      if (!pc.ok) {
        return growerNumberFieldErrorRu(pc.error, copy.formVarietyPlantCount);
      }
      return null;
    }

    return (
      <CycleFormCard>
        <CycleFormLabel>
          {copy.formVarietiesTitle}
          {index > 0 ? ` ${index + 1}` : ''}
        </CycleFormLabel>
        {canRemove ? (
          <CycleFormTextButton label={copy.formVarietyRemove} onPress={onRemove} disabled={disabled} />
        ) : null}
        <CycleFormDivider />
        <CycleFormLabel>{copy.formStrain}</CycleFormLabel>
        <CycleFormFieldInput value={cultivarName} onChangeText={setCultivarName} editable={!disabled} />
        <CycleFormDivider />
        <CycleFormLabel>{copy.formVarietyPlantCount}</CycleFormLabel>
        <CycleFormFieldInput
          value={plantCount}
          onChangeText={(next) => {
            setPlantCount(next);
            setLocalFieldError(null);
          }}
          onBlur={() => setLocalFieldError(validatePlantCount())}
          keyboardType="numeric"
          editable={!disabled}
        />
        <CycleFormDivider />
        <CycleFormLabel>{copy.formStartMaterial}</CycleFormLabel>
        <CycleFormChipRow>
          {(['seed', 'clone'] as const).map((m) => (
            <CycleFormChip
              key={m}
              label={m === 'seed' ? copy.materialSeed : copy.materialClone}
              selected={startMaterial === m}
              onPress={() => setStartMaterial(m)}
              disabled={disabled}
            />
          ))}
        </CycleFormChipRow>
        <CycleFormDivider />
        <JournalVoiceFieldSection
          label={copy.formVarietyComment}
          placeholder={copy.procedurePlaceholder}
          value={comment}
          onChangeText={setComment}
          onError={onVoiceError}
          capture={voiceField}
          compact
          multilineLines={4}
        />
        <CycleFormErrors fieldError={localFieldError} />
        <VarietyPlantLabelsSection cultivarName={cultivarName} plantIds={plantSlotIds} />
      </CycleFormCard>
    );
  },
);
