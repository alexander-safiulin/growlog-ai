import { Timeline } from 'lucide-react-native';
import { type ColorValue } from 'react-native';

type Props = {
  color: ColorValue;
  size?: number;
};

/** Tab bar: chronological feed (Lucide timeline — vertical spine + event rows). */
export function TimelineTabIcon({ color, size = 26 }: Props) {
  return <Timeline color={color} size={size} strokeWidth={2} />;
}
