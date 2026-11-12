import Svg, { Circle, Path } from 'react-native-svg';

/** Lucide `voicemail` (ISC) — assistant tab. */
export function LucideVoicemail({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Circle cx={18} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Path d="M6 16h12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
