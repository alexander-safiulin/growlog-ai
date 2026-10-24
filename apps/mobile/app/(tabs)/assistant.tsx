import { AdvisorChat } from '@/components/assistant/AdvisorChat';
import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { View } from 'react-native';

export default function AssistantScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f4faf5' }}>
      <CloudFeatureGate reason="assistant">
        <AdvisorChat />
      </CloudFeatureGate>
    </View>
  );
}
