import { CycleFormCaption } from '@/components/cycle/cycle-form-ui';
import { plantLabelQrDataUrl } from '@/lib/plant-label-qrcode';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

export function PlantQrPreview({
  farmId,
  plantId,
  cultivarName,
  labelNumber,
  compact,
}: {
  farmId: string;
  plantId: string;
  cultivarName: string;
  labelNumber: string;
  compact?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setDataUrl(null);
    void plantLabelQrDataUrl({ farmId, plantId })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [farmId, plantId]);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.name} numberOfLines={2}>
        {cultivarName || '—'}
      </Text>
      <Text style={styles.number}>№ {labelNumber}</Text>
      <View style={styles.qrWrap}>
        {!dataUrl && !failed ? <ActivityIndicator /> : null}
        {failed ? <CycleFormCaption>QR</CycleFormCaption> : null}
        {dataUrl ? (
          <Image
            source={{ uri: dataUrl }}
            style={compact ? styles.qrCompact : styles.qr}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      width: 148,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.chipBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      gap: 4,
    },
    cardCompact: { width: 132, padding: 8 },
    name: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center' },
    number: { fontSize: 12, fontWeight: '600', color: c.sectionLabel },
    qrWrap: { minHeight: 108, alignItems: 'center', justifyContent: 'center' },
    qr: { width: 108, height: 108 },
    qrCompact: { width: 96, height: 96 },
  });
}
