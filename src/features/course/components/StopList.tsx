import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MAX_LEG_MIN } from '@/lib/walking';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CourseStop } from '@/types/model';

interface StopListProps {
  stops: CourseStop[];
  /** legMinutes[i] = i → i+1 추정 도보 분 */
  legMinutes: number[];
  /** 각 장소 카드 아래에 붙일 버튼 등 */
  renderActions?: (index: number) => ReactNode;
}

// 장소 사이 도보 시간은 좌표로 계산한 추정값이라 항상 "약"을 붙인다.
export function StopList({ stops, legMinutes, renderActions }: StopListProps) {
  return (
    <View>
      {stops.map((s, i) => (
        <View key={`${i}-${s.name}`}>
          <View style={styles.stop}>
            <Text style={styles.order}>{i + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {s.address ?? '주소 없음'}
              </Text>
              {renderActions ? <View style={styles.actions}>{renderActions(i)}</View> : null}
            </View>
          </View>
          {i < stops.length - 1 ? (
            <Text style={[styles.leg, (legMinutes[i] ?? 0) > MAX_LEG_MIN && styles.legWarn]}>
              {'   ↓ '}걸어서 약 {legMinutes[i] ?? '?'}분
              {(legMinutes[i] ?? 0) > MAX_LEG_MIN ? ' (10분 넘음)' : ''}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stop: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  order: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    backgroundColor: colors.primary,
    color: colors.white,
    fontWeight: '700',
    overflow: 'hidden',
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  sub: { fontSize: fontSize.caption, color: colors.textSub },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  leg: { fontSize: fontSize.caption, color: colors.textSub, paddingVertical: spacing.xs },
  legWarn: { color: colors.warning, fontWeight: '700' },
});
