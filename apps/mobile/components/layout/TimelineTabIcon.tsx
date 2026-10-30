import { SymbolView } from 'expo-symbols';
import { type ColorValue } from 'react-native';
import { TAB_BAR_ICON_SIZE, TabBarIconSlot } from '@/components/layout/TabBarIconSlot';

type Props = {
  color: ColorValue;
  size?: number;
};

/** Tab bar: chronological feed. Bulleted list matches the other SymbolView tabs; Menu is a grid. */
export function TimelineTabIcon({ color, size = TAB_BAR_ICON_SIZE }: Props) {
  return (
    <TabBarIconSlot size={size}>
      <SymbolView
        name={{ ios: 'list.bullet', android: 'list', web: 'list' }}
        tintColor={color}
        size={size}
      />
    </TabBarIconSlot>
  );
}
