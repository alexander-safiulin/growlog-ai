import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Matches `tabBarIconStyle` + SymbolView size in `(tabs)/_layout`. */
export const TAB_BAR_ICON_SIZE = 26;

type Props = {
  children: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function TabBarIconSlot({ children, size = TAB_BAR_ICON_SIZE, style }: Props) {
  return (
    <View style={[styles.slot, { width: size, height: size }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
