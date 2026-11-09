import {
  CHART_PAD,
  formatYTick,
  linearScale,
  niceYDomain,
  plotHeight,
  plotWidth,
} from '@/components/charts/chart-layout';
import { useTheme } from '@/context/ThemeContext';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

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
  /** When set, left axis uses primary Y domain; points with y2 use right scale mapped to same plot. */
  dualY?: { points: ScatterPoint[] };
}) {
  const { colors } = useTheme();
  if (width < 8 || height < 8) return null;
  const finite = (list: ScatterPoint[]) =>
    list.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const pw = plotWidth(width);
  const ph = plotHeight(height);
  const all = [...finite(points), ...finite(dualY?.points ?? [])];
  if (!all.length) return null;
  const ys = all.map((p) => p.y);
  const [y0, y1] = niceYDomain(ys);
  const xs = all.map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const xDomain: [number, number] = xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax];
  const yTicks = [y0, (y0 + y1) / 2, y1];

  const plotPoint = (p: ScatterPoint, key: string | number) => {
    const cx = CHART_PAD.left + linearScale(p.x, xDomain, [0, pw]);
    const cy = CHART_PAD.top + linearScale(p.y, [y0, y1], [ph, 0]);
    return (
      <Circle key={key} cx={cx} cy={cy} r={p.radius ?? 5} fill={p.color} opacity={0.9} />
    );
  };

  return (
    <Svg width={width} height={height}>
      {yTicks.map((tick, i) => {
        const y = CHART_PAD.top + linearScale(tick, [y0, y1], [ph, 0]);
        return (
          <Line
            key={i}
            x1={CHART_PAD.left}
            y1={y}
            x2={CHART_PAD.left + pw}
            y2={y}
            stroke={colors.border}
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}
      <SvgText x={CHART_PAD.left - 4} y={CHART_PAD.top + 8} fontSize={10} fill={colors.textMuted} textAnchor="end">
        {formatYTick(y1, yDecimals)}
      </SvgText>
      <SvgText
        x={CHART_PAD.left - 4}
        y={CHART_PAD.top + ph}
        fontSize={10}
        fill={colors.textMuted}
        textAnchor="end"
      >
        {formatYTick(y0, yDecimals)}
      </SvgText>
      {finite(points).map((p, i) => plotPoint(p, `a-${i}`))}
      {finite(dualY?.points ?? []).map((p, i) => plotPoint(p, `b-${i}`))}
    </Svg>
  );
}
