import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/ErrorBanner';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CommentTargetType } from '@/types/api';
import type { CoupleId } from '@/types/ids';

import { useActivities } from '../hooks/useActivity';

function timeText(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 공동 활동·변경 기록(H01). target을 주면 그 공동 장소·코스의 기록만 보여 준다. */
export function ActivityList({
  coupleId,
  title,
  target,
  showLabel = true,
}: {
  coupleId: CoupleId;
  title: string;
  target?: { type: CommentTargetType; id: number };
  showLabel?: boolean;
}) {
  const q = useActivities(coupleId, target);
  const items = q.data?.items ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {q.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      <ErrorBanner error={q.error} />
      {!q.isPending && items.length === 0 ? <Text style={styles.empty}>아직 기록이 없어요.</Text> : null}
      {items.map((a) => (
        <View key={a.id} style={styles.row}>
          <Text style={styles.text}>
            {a.text}
            {showLabel && a.targetLabel ? (
              <Text style={a.accessible ? styles.label : styles.gone}> · {a.targetLabel}</Text>
            ) : null}
          </Text>
          <Text style={styles.time}>{timeText(a.occurredAt)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  empty: { fontSize: fontSize.caption, color: colors.textSub },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  text: { flex: 1, fontSize: fontSize.caption, color: colors.text },
  label: { color: colors.textSub },
  gone: { color: colors.textSub, textDecorationLine: 'line-through' },
  time: { fontSize: fontSize.caption, color: colors.textSub },
});
