import { MicTabButton } from '@/components/layout/MicTabButton';
import { ScopeBar } from '@/components/layout/ScopeBar';
import { useMobileLocale } from '@/context/LocaleContext';
import { VoiceCaptureProvider } from '@/context/VoiceCaptureContext';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  return (
    <VoiceCaptureProvider>
      <TabShell />
    </VoiceCaptureProvider>
  );
}

function TabShell() {
  const insets = useSafeAreaInsets();
  const { strings } = useMobileLocale();
  const tabInset = insets.bottom > 0 ? insets.bottom : 0;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2d6a4f',
          tabBarInactiveTintColor: '#9ca3af',
          headerStyle: { backgroundColor: '#eef5ef' },
          headerTitleStyle: { fontWeight: '600' },
          tabBarStyle: {
            paddingTop: 6,
            paddingBottom: tabInset > 0 ? tabInset - 4 : 6,
            height: 72 + tabInset,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: strings.tabs.focus,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={24} />
            ),
            headerTitle: strings.headers.dailyFocus,
            header: () => (
              <View style={{ backgroundColor: '#eef5ef', paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 8 }}>
                <ScopeBar />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: strings.tabs.timeline,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: strings.headers.assistant,
            headerTitle: strings.headers.assistant,
            tabBarShowLabel: false,
            tabBarButton: (props) => (
              <MicTabButton
                onPress={props.onPress}
                accessibilityState={props.accessibilityState}
                style={props.style}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="sop"
          options={{
            title: strings.tabs.sop,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} tintColor={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: strings.tabs.more,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }} tintColor={color} size={24} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
