import {
  CHART_PAD,
  formatYTick,
  linearScale,
  niceYDomain,
  plotHeight,
  plotWidth,
} from '@/components/charts/chart-layout';
import { useTheme } from '@/context/ThemeContext';
import { Fragment } from 'react';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

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

  const allX = [
    ...drawn.flatMap((s) => s.points.map((p) => p.x)),
    ...drawnBands.map((b) => b.x),
  ];
  const xMin = allX.length ? Math.min(...allX) : 0;
  const xMax = allX.length ? Math.max(...allX) : 1;
  const xDomain: [number, number] = xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax];

  const yTicks = [y0, (y0 + y1) / 2, y1];

  const bandRect =
    horizontalBand != null
      ? {
          y: linearScale(horizontalBand.max, [y0, y1], [ph, 0]),
          h: linearScale(horizontalBand.min, [y0, y1], [ph, 0]) - linearScale(horizontalBand.max, [y0, y1], [ph, 0]),
        }
      : null;

  return (
    <Svg width={width} height={height}>
      {bandRect ? (
        <Rect
          x={CHART_PAD.left}
          y={CHART_PAD.top + bandRect.y}
          width={pw}
          height={Math.max(0, bandRect.h)}
          fill={horizontalBand!.fill}
        />
      ) : null}
      {yTicks.map((tick, i) => {
        const y = CHART_PAD.top + linearScale(tick, [y0, y1], [ph, 0]);
        return (
          <Fragment key={i}>
            <Line
              x1={CHART_PAD.left}
              y1={y}
              x2={CHART_PAD.left + pw}
              y2={y}
              stroke={colors.border}
              strokeWidth={0.5}
              opacity={0.6}
            />
            <SvgText
              x={CHART_PAD.left - 4}
              y={y + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {formatYTick(tick, yDecimals)}
            </SvgText>
          </Fragment>
        );
      })}
      {drawnBands.map((b, i) => {
        const x = CHART_PAD.left + linearScale(b.x, xDomain, [0, pw]);
        const yTop = CHART_PAD.top + linearScale(b.max, [y0, y1], [ph, 0]);
        const yBot = CHART_PAD.top + linearScale(b.min, [y0, y1], [ph, 0]);
        return (
          <Line
            key={`band-${i}`}
            x1={x}
            y1={yTop}
            x2={x}
            y2={yBot}
            stroke={b.color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
      {drawn.map((s, si) => {
        if (s.points.length < 2) {
          const p = s.points[0];
          if (!p) return null;
          const cx = CHART_PAD.left + linearScale(p.x, xDomain, [0, pw]);
          const cy = CHART_PAD.top + linearScale(p.y, [y0, y1], [ph, 0]);
          return <Circle key={si} cx={cx} cy={cy} r={4} fill={s.color} />;
        }
        const pts = s.points
          .map((p) => {
            const x = CHART_PAD.left + linearScale(p.x, xDomain, [0, pw]);
            const y = CHART_PAD.top + linearScale(p.y, [y0, y1], [ph, 0]);
            return `${x},${y}`;
          })
          .join(' ');
        return (
          <Polyline
            key={si}
            points={pts}
            fill="none"
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}
