import { CycleOverviewSheet } from '@/components/feed/CycleOverviewSheet';
import { TimelineAddMenu } from '@/components/feed/TimelineAddMenu';
import { CycleTabHeaderTitle } from '@/components/layout/CycleTabHeaderTitle';
import { NutrientMobileScreen } from '@/components/nutrient/NutrientMobileScreen';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { anchorDateForTimezone } from '@/lib/sop-utils';
import { useFarmContext } from '@/providers/FarmProvider';
import { cycleDayNumber, growerStageLabelRu } from '@growlog/domain';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';

export default function NutrientTabScreen() {
  const { strings } = useMobileLocale();
  const tl = strings.timelineScreen;
  const { colors } = useTheme();
  const { cycle, farms, farmId } = useFarmContext();
  const navigation = useNavigation();
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = useMemo(() => anchorDateForTimezone(farmTz), [farmTz]);
  const stageLabel = cycle ? growerStageLabelRu(cycle.stage) : '';
  const dayNum = cycle ? cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTz }) : 0;
  const headerMeta = cycle
    ? tl.headerMeta.replace('{day}', String(dayNum)).replace('{stage}', stageLabel)
    : '';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: 'left',
      headerTitleContainerStyle: { flex: 1, maxWidth: '100%' },
      headerTitle: () => (
        <CycleTabHeaderTitle
          title={cycle?.name ?? strings.more.nutrient}
          meta={cycle ? headerMeta : undefined}
          colors={colors}
          onPress={cycle ? () => setOverviewOpen(true) : undefined}
        />
      ),
      headerRight: () =>
        cycle ? (
          <Pressable
            onPress={() => setAddMenuOpen(true)}
            hitSlop={12}
            accessibilityLabel={tl.addA11y}
            style={{ paddingHorizontal: 12 }}
          >
            <Text style={{ fontSize: 28, fontWeight: '300', color: colors.primary, lineHeight: 28 }}>+</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, cycle, colors, headerMeta, strings.more.nutrient, tl.addA11y]);

  return (
    <>
      <NutrientMobileScreen />
      <CycleOverviewSheet visible={overviewOpen} onClose={() => setOverviewOpen(false)} />
      <TimelineAddMenu
        visible={addMenuOpen}
        selectedDate={today}
        onClose={() => setAddMenuOpen(false)}
        onOpenCycleSheet={() => setOverviewOpen(true)}
      />
    </>
  );
}
