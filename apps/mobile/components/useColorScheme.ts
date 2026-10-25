import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useOptionalColorScheme } from '@/context/ThemeContext';

export const useColorScheme = () => useOptionalColorScheme();

export function useSystemOnlyColorScheme() {
  const coreScheme = useSystemColorScheme();
  return coreScheme === 'dark' ? 'dark' : 'light';
}
