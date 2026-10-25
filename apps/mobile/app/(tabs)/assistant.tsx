import { AdvisorChat } from '@/components/assistant/AdvisorChat';
import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { useTheme } from '@/context/ThemeContext';
import { View } from 'react-native';

export default function AssistantScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <CloudFeatureGate reason="assistant">
        <AdvisorChat />
      </CloudFeatureGate>
    </View>
  );
}
