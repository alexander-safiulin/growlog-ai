import { MicTabButton } from '@/components/layout/MicTabButton';
import { NutrientTabIcon } from '@/components/layout/NutrientTabIcon';
import { TimelineTabIcon } from '@/components/layout/TimelineTabIcon';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  return <TabShell />;
}

function TabShell() {
  const insets = useSafeAreaInsets();
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          headerStyle: { backgroundColor: colors.screen },
          headerTitleStyle: { fontWeight: '600', color: colors.text },
          sceneStyle: { backgroundColor: colors.screen },
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: bottomPad,
            height: 78 + bottomPad,
            overflow: 'visible',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIconStyle: { marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: strings.tabs.focus,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={26} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: strings.tabs.timeline,
            headerShown: false,
            tabBarIcon: ({ color }) => <TimelineTabIcon color={color} />,
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
          name="nutrient"
          options={{
            title: strings.tabs.nutrient,
            headerShown: false,
            tabBarAccessibilityLabel: strings.more.nutrient,
            tabBarIcon: ({ color }) => <NutrientTabIcon color={color} />,
          }}
        />
        <Tabs.Screen name="sop" options={{ href: null, headerShown: true, title: strings.tabs.sop }} />
        <Tabs.Screen
          name="more"
          options={{
            title: strings.tabs.more,
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }}
                tintColor={color}
                size={26}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
