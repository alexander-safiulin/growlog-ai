import { CycleContextBar } from '@/components/layout/CycleContextBar';
import { NutrientMobileScreen } from '@/components/nutrient/NutrientMobileScreen';
import { useTheme } from '@/context/ThemeContext';
import { View } from 'react-native';

export default function NutrientTabScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <CycleContextBar />
      <NutrientMobileScreen />
    </View>
  );
}
