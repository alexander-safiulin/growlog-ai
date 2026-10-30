import {
  CycleFormCard,
  CycleFormChip,
  CycleFormChipRow,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormMultilineInput,
  CycleFormMuted,
  CycleFormOkMessage,
  CycleFormPrimaryButton,
  CycleFormScreen,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { enqueueLogEntry } from '@/lib/offline-queue';
import { createLogEntry, type EventType } from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

const QUICK_TYPES = [
  'note',
  'observation',
  'action_taken',
  'watering',
  'feeding',
  'issue_detected',
] as const satisfies readonly EventType[];

export default function TextCaptureScreen() {
  const { strings } = useMobileLocale();
  const c = strings.captureScreen;
  const { supabase, farmId, cycle, primaryScope, userId, refetchAll } = useFarmContext();
  const styles = useThemedStyles(makeStyles);
  const [eventType, setEventType] = useState<EventType>('note');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId || !cycle || !primaryScope || !body.trim()) return;
    setError(null);
    setMsg(null);
    setPending(true);
    const payload = {
      farmId,
      cycleId: cycle.id,
      scopeId: primaryScope.id,
      eventType,
      body: body.trim(),
      occurredAt: new Date().toISOString(),
      sourceType: 'user_form' as const,
      createdBy: userId,
    };
    try {
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (offline) {
        await enqueueLogEntry(payload);
        setMsg(c.savedOffline);
        setBody('');
        setTimeout(() => {
          router.back();
          router.back();
        }, 800);
        return;
      }
      await createLogEntry(supabase, payload);
      await refetchAll();
      router.back();
      router.back();
    } catch (err: unknown) {
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;
      if (offline) {
        await enqueueLogEntry(payload);
        setMsg(c.savedOffline);
        setBody('');
        setTimeout(() => {
          router.back();
          router.back();
        }, 800);
        return;
      }
      setError(err instanceof Error ? err.message : c.saveFailed);
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <View style={styles.center}>
        <CycleFormMuted>{c.needOnboarding}</CycleFormMuted>
      </View>
    );
  }

  const canSubmit = body.trim().length > 0;

  return (
    <CycleFormScreen>
      <CycleFormCard>
        <CycleFormLabel>{c.eventType}</CycleFormLabel>
        <CycleFormChipRow>
          {QUICK_TYPES.map((t) => (
            <CycleFormChip
              key={t}
              label={c.eventTypes[t]}
              selected={eventType === t}
              onPress={() => setEventType(t)}
              disabled={pending}
            />
          ))}
        </CycleFormChipRow>
      </CycleFormCard>

      <CycleFormCard>
        <CycleFormLabel>{c.whatHappened}</CycleFormLabel>
        <CycleFormMultilineInput
          numberOfLines={5}
          value={body}
          onChangeText={setBody}
          placeholder={c.bodyPlaceholder}
          editable={!pending}
        />
      </CycleFormCard>

      <CycleFormErrors error={error} />
      {msg ? <CycleFormOkMessage>{msg}</CycleFormOkMessage> : null}
      <CycleFormPrimaryButton
        label={pending ? strings.commonMobile.saving : c.saveJournal}
        onPress={submit}
        pending={pending}
        disabled={pending || !canSubmit}
      />
    </CycleFormScreen>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
  });
}
