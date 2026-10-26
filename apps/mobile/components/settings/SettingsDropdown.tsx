import { useTheme } from '@/context/ThemeContext';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SETTINGS_FIELD_METRICS as M } from '@/components/settings/settings-field-metrics';

type Anchor = { x: number; y: number; width: number; height: number };

export type SettingsDropdownOption<T extends string> = {
  id: T;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
};

type Props<T extends string> = {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
  options: readonly SettingsDropdownOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
};

function OptionMark({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mark, { borderColor: colors.border }, selected && { borderColor: colors.primary }]}>
      {selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

function menuFrame(
  anchor: Anchor,
  window: { width: number; height: number },
  insets: { top: number; bottom: number },
) {
  const gap = 6;
  const margin = 8;
  const topLimit = insets.top + margin;
  const bottomLimit = window.height - Math.max(insets.bottom, margin) - margin;
  const width = Math.min(anchor.width, window.width - margin * 2);
  const left = Math.min(Math.max(margin, anchor.x), Math.max(margin, window.width - margin - width));
  const belowTop = anchor.y + anchor.height + gap;
  const spaceBelow = bottomLimit - belowTop;
  const spaceAbove = anchor.y - gap - topLimit;
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(420, Math.max(160, openUp ? spaceAbove : spaceBelow));
  const top = openUp ? Math.max(topLimit, anchor.y - gap - maxHeight) : belowTop;
  return { top, left, width, maxHeight };
}

export function SettingsDropdown<T extends string>({
  label,
  labelStyle,
  value,
  valueStyle,
  options,
  selectedId,
  onSelect,
}: Props<T>) {
  const { colors } = useTheme();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const frame = open && anchor ? menuFrame(anchor, window, insets) : null;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  function choose(id: T) {
    setOpen(false);
    if (id !== selectedId) onSelect(id);
  }

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.wrap}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border },
          ]}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          accessibilityState={{ expanded: open }}
        >
          <Text style={[styles.section, labelStyle, { color: colors.sectionLabel }]}>{label}</Text>
          <View style={styles.value}>
            <Text style={[styles.label, valueStyle, { color: colors.text }]}>{value}</Text>
            <SymbolView
              name={{
                ios: open ? 'chevron.up' : 'chevron.down',
                android: open ? 'expand_less' : 'expand_more',
                web: open ? 'expand_less' : 'expand_more',
              }}
              size={16}
              tintColor={colors.textMuted}
            />
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          {frame ? (
            <View
              style={[
                styles.menuShadow,
                {
                  top: frame.top,
                  left: frame.left,
                  width: frame.width,
                  maxHeight: frame.maxHeight,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <View
                style={[
                  styles.menu,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    maxHeight: frame.maxHeight,
                  },
                ]}
              >
                <ScrollView
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: frame.maxHeight, flexGrow: 0 }}
                >
                  {options.map((option) => {
                    const selected = option.id === selectedId;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.option, selected && { backgroundColor: colors.rowActiveBg }]}
                        onPress={() => choose(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <OptionMark selected={selected} />
                        <Text style={[styles.label, option.labelStyle, { color: colors.text }]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: M.marginBottom },
  card: {
    borderRadius: M.borderRadius,
    paddingHorizontal: M.paddingHorizontal,
    paddingVertical: M.paddingVertical,
    borderWidth: 1,
    minHeight: M.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 1,
  },
  label: { fontSize: 16, lineHeight: 22 },
  modalRoot: { flex: 1 },
  menuShadow: {
    position: 'absolute',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
