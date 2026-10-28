import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

// 목록 행 안에 들어가는 작은 버튼 (위로, 아래로, 교체, 빼기 등)
export function MiniButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  label: { fontSize: fontSize.caption, color: colors.text },
  danger: { color: colors.danger },
});
