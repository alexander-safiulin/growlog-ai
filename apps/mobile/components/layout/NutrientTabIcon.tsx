import { useTheme } from '@/context/ThemeContext';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type ColorValue } from 'react-native';

type Props = {
  color: ColorValue;
  size?: number;
};

/** Tab bar: nutrient mix calculator (flask + calc badge), not a generic calculator app. */
export function NutrientTabIcon({ color, size = 26 }: Props) {
  const { colors } = useTheme();
  const badge = Math.round(size * 0.46);

  return (
    <View style={[styles.wrap, { width: size + 4, height: size }]}>
      <SymbolView
        name={{ ios: 'flask.fill', android: 'science', web: 'science' }}
        tintColor={color}
        size={size}
      />
      <View style={[styles.badge, { width: badge + 4, height: badge + 4, backgroundColor: colors.tabBar }]}>
        <SymbolView
          name={{ ios: 'plus.forwardslash.minus', android: 'calculate', web: 'calculate' }}
          tintColor={color}
          size={badge}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
