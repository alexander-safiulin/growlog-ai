import { NutrientMobileScreen } from '@/components/nutrient/NutrientMobileScreen';
import { Stack } from 'expo-router';

export default function NutrientCalculatorScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nutrient' }} />
      <NutrientMobileScreen />
    </>
  );
}
