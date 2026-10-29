import { useFarmContext } from '@/providers/FarmProvider';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

export function EventMediaThumb({ storagePath }: { storagePath: string }) {
  const { supabase, isLocalWorkspace, userId } = useFarmContext();
  const styles = useThemedStyles(makeStyles);
  const [uri, setUri] = useState<string | null>(null);
  const canLoad = !isLocalWorkspace && !!userId;

  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    void supabase.storage
      .from('media')
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.signedUrl) return;
        setUri(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath, supabase, canLoad]);

  if (!canLoad || !uri) return null;

  return (
    <Image
      source={{ uri }}
      style={styles.thumb}
      accessibilityIgnoresInvertColors
      resizeMode="cover"
    />
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    thumb: {
      width: '100%',
      height: 168,
      borderRadius: 8,
      marginTop: 8,
      backgroundColor: c.surfaceMuted,
    },
  });
}
