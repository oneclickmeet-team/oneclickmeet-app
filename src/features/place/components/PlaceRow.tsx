import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';
import type { Place } from '@/types/model';

export function PlaceRow({ place, onPress }: { place: Place; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {place.address ?? '주소 없음'}
        </Text>
      </View>
      {!place.coords ? <Text style={styles.badge}>위치 없음</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  sub: { fontSize: fontSize.caption, color: colors.textSub },
  badge: {
    fontSize: fontSize.caption,
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
