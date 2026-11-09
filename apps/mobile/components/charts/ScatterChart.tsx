import {
  CHART_PAD,
  formatYTick,
  linearScale,
  niceYDomain,
  plotHeight,
  plotWidth,
} from '@/components/charts/chart-layout';
import { useTheme } from '@/context/ThemeContext';
import { Text, View } from 'react-native';

export type ScatterPoint = {
  x: number;
  y: number;
  color: string;
  radius?: number;
};

export function ScatterChart({
  width,
  height,
  points,
  yDecimals = 1,
  dualY,
}: {
  width: number;
  height: number;
  points: ScatterPoint[];
  yDecimals?: number;
  dualY?: { points: ScatterPoint[] };
}) {
  const { colors } = useTheme();
  if (width < 8 || height < 8) return null;
  const finite = (list: ScatterPoint[]) => list.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const plotted = finite(points);
  const extra = finite(dualY?.points ?? []);
  const all = [...plotted, ...extra];
  if (!all.length) return null;
  const pw = plotWidth(width);
  const ph = plotHeight(height);
  const [y0, y1] = niceYDomain(all.map((p) => p.y));
  const xs = all.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xDomain: [number, number] = xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax];
  const toX = (x: number) => CHART_PAD.left + linearScale(x, xDomain, [0, pw]);
  const toY = (y: number) => CHART_PAD.top + linearScale(y, [y0, y1], [ph, 0]);
  const yTicks = [y0, y1];

  const dots = (list: ScatterPoint[], prefix: string) =>
    list.map((p, i) => {
      const r = p.radius ?? 5;
      return (
        <View
          key={`${prefix}-${i}`}
          style={{
            position: 'absolute',
            left: toX(p.x) - r,
            top: toY(p.y) - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: p.color,
            opacity: 0.9,
          }}
        />
      );
    });

  return (
    <View style={{ width, height }}>
      {yTicks.map((tick, i) => {
        const y = toY(tick);
        return (
          <View key={i}>
            <View
              style={{
                position: 'absolute',
                left: CHART_PAD.left,
                top: y,
                width: pw,
                height: 1,
                backgroundColor: colors.border,
                opacity: 0.6,
              }}
            />
            <Text
              style={{
                position: 'absolute',
                left: 0,
                top: y - 7,
                width: CHART_PAD.left - 4,
                fontSize: 10,
                color: colors.textMuted,
                textAlign: 'right',
              }}
            >
              {formatYTick(tick, yDecimals)}
            </Text>
          </View>
        );
      })}
      {dots(plotted, 'a')}
      {dots(extra, 'b')}
    </View>
  );
}
