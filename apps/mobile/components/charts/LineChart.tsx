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

export type LineChartSeries = {
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth?: number;
};

export type LineChartBand = {
  x: number;
  min: number;
  max: number;
  color: string;
};

function Segment({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(length) || length < 0.5) return null;
  const angle = `${Math.atan2(dy, dx)}rad`;
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - length / 2,
        top: (y1 + y2) / 2 - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: angle }],
      }}
    />
  );
}

export function LineChart({
  width,
  height,
  series,
  bands,
  horizontalBand,
  yDecimals = 1,
}: {
  width: number;
  height: number;
  series: LineChartSeries[];
  bands?: LineChartBand[];
  horizontalBand?: { min: number; max: number; fill: string } | null;
  yDecimals?: number;
}) {
  const { colors } = useTheme();
  if (width < 8 || height < 8) return null;
  const drawn = series.map((s) => ({
    ...s,
    points: s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  }));
  const drawnBands = (bands ?? [])
    .filter((b) => Number.isFinite(b.x) && Number.isFinite(b.min) && Number.isFinite(b.max))
    .map((b) => (b.min <= b.max ? b : { ...b, min: b.max, max: b.min }));
  const pw = plotWidth(width);
  const ph = plotHeight(height);
  const allY = [
    ...drawn.flatMap((s) => s.points.map((p) => p.y)),
    ...drawnBands.flatMap((b) => [b.min, b.max]),
  ];
  const [y0, y1] = niceYDomain(allY, horizontalBand);
  const allX = [...drawn.flatMap((s) => s.points.map((p) => p.x)), ...drawnBands.map((b) => b.x)];
  const xMin = allX.length ? Math.min(...allX) : 0;
  const xMax = allX.length ? Math.max(...allX) : 1;
  const xDomain: [number, number] = xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax];
  const yTicks = [y0, (y0 + y1) / 2, y1];
  const toX = (x: number) => CHART_PAD.left + linearScale(x, xDomain, [0, pw]);
  const toY = (y: number) => CHART_PAD.top + linearScale(y, [y0, y1], [ph, 0]);

  const bandTop = horizontalBand ? toY(horizontalBand.max) : 0;
  const bandHeight = horizontalBand ? Math.max(0, toY(horizontalBand.min) - bandTop) : 0;

  return (
    <View style={{ width, height }}>
      {horizontalBand && bandHeight > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: CHART_PAD.left,
            top: bandTop,
            width: pw,
            height: bandHeight,
            backgroundColor: horizontalBand.fill,
          }}
        />
      ) : null}
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
      {drawnBands.map((b, i) => {
        const x = toX(b.x);
        const yTop = toY(b.max);
        const yBot = toY(b.min);
        return (
          <View
            key={`band-${i}`}
            style={{
              position: 'absolute',
              left: x - 2,
              top: yTop,
              width: 4,
              height: Math.max(2, yBot - yTop),
              borderRadius: 2,
              backgroundColor: b.color,
              opacity: 0.85,
            }}
          />
        );
      })}
      {drawn.map((s, si) => {
        const thickness = s.strokeWidth ?? 2;
        if (s.points.length < 2) {
          const p = s.points[0];
          if (!p) return null;
          const cx = toX(p.x);
          const cy = toY(p.y);
          return (
            <View
              key={si}
              style={{
                position: 'absolute',
                left: cx - 4,
                top: cy - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: s.color,
              }}
            />
          );
        }
        return s.points.slice(1).map((p, i) => {
          const prev = s.points[i]!;
          return (
            <Segment
              key={`${si}-${i}`}
              x1={toX(prev.x)}
              y1={toY(prev.y)}
              x2={toX(p.x)}
              y2={toY(p.y)}
              color={s.color}
              thickness={thickness}
            />
          );
        });
      })}
    </View>
  );
}
