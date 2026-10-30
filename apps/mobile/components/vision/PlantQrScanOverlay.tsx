import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { useVisionCapture } from '@/context/VisionCaptureContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { plantLabelNumber } from '@growlog/domain';
import { useFarmContext } from '@/providers/FarmProvider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PlantQrScanOverlay() {
  const { eyeMode, setEyeMode } = useVisionCapture();
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { scanPlantQr, focusedPlant, clearFocusedPlant, isLocalWorkspace, userId } = useFarmContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const lockRef = useRef(false);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (!eyeMode || lockRef.current) return;
      lockRef.current = true;
      try {
        const result = await scanPlantQr(data);
        if (result === 'ok') setMessage(copy.scanPlantOk);
        else if (result === 'wrong_farm') setMessage(copy.scanPlantWrongFarm);
        else if (result === 'not_found') setMessage(copy.scanPlantNotFound);
        else setMessage(copy.scanPlantInvalid);
      } finally {
        setTimeout(() => {
          lockRef.current = false;
        }, 1200);
      }
    },
    [copy, eyeMode, scanPlantQr],
  );

  function close() {
    setEyeMode(false);
    setMessage(null);
  }

  if (!eyeMode) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{copy.eyeModeScanTitle}</Text>
          <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.close}>{copy.eyeModeClose}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{copy.scanPlantHint}</Text>

        {isLocalWorkspace || !userId ? (
          <Text style={styles.muted}>{copy.formVarietyQrNeedCloud}</Text>
        ) : !permission?.granted ? (
          <View style={styles.perm}>
            <Text style={styles.muted}>{copy.scanPlantPermission}</Text>
            <Pressable style={styles.permBtn} onPress={() => void requestPermission()}>
              <Text style={styles.permBtnText}>{copy.scanPlantEnableCamera}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcode}
            />
            <View style={styles.reticle} pointerEvents="none" />
          </View>
        )}

        {message ? <Text style={styles.feedback}>{message}</Text> : null}

        {focusedPlant ? (
          <View style={styles.focused}>
            <Text style={styles.focusedLabel}>{copy.scanPlantFocused}</Text>
            <Text style={styles.focusedValue}>
              {focusedPlant.cultivar_name ?? copy.formStrain} · № {plantLabelNumber(focusedPlant)}
            </Text>
            <Pressable onPress={clearFocusedPlant}>
              <Text style={styles.clear}>{copy.scanPlantClear}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.screen,
      paddingHorizontal: 16,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
    close: { fontSize: 16, fontWeight: '600', color: c.primary },
    hint: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    muted: { fontSize: 14, color: c.textMuted },
    perm: { gap: 12, marginTop: 8 },
    permBtn: {
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    permBtnText: { color: c.primaryText, fontWeight: '700' },
    cameraWrap: {
      flex: 1,
      minHeight: 280,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    camera: { flex: 1 },
    reticle: {
      position: 'absolute',
      top: 48,
      left: 48,
      right: 48,
      bottom: 48,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.85)',
      borderRadius: 16,
    },
    feedback: { fontSize: 14, fontWeight: '600', color: c.okText },
    focused: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.rowActiveBorder,
      backgroundColor: c.rowActiveBg,
      gap: 6,
    },
    focusedLabel: { fontSize: 13, fontWeight: '700', color: c.text },
    focusedValue: { fontSize: 16, fontWeight: '600', color: c.text },
    clear: { fontSize: 13, fontWeight: '600', color: c.primary },
  });
}
