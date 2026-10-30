import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

const PENDING_HEIGHT = 220;

/** Full width, height from the photo itself. Portrait stays tall; landscape stays short. */
export function AspectPhoto({
  uri,
  maxHeight,
  radius = 8,
}: {
  uri: string;
  maxHeight?: number;
  radius?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAspect(null);
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setAspect(w / h);
      },
      () => {
        if (!cancelled) setAspect(3 / 4);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const natural = width > 0 && aspect ? width / aspect : PENDING_HEIGHT;
  const height = maxHeight != null ? Math.min(natural, maxHeight) : natural;

  return (
    <View
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== width) setWidth(next);
      }}
      style={{ width: '100%' }}
    >
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceMuted,
        }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
