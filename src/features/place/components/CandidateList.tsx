import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Candidate } from '@/types/model';

interface CandidateListProps {
  candidates: Candidate[];
  loading?: boolean;
  error?: unknown;
  /** 저장 중인 후보 (버튼 로딩 표시용) */
  savingName?: string | null;
  onSave: (candidate: Candidate) => void;
  emptyText?: string;
}

// 후보는 저장 전 확인용이다(TRD 6.1). 사용자가 고른 것만 저장한다.
export function CandidateList({
  candidates,
  loading,
  error,
  savingName,
  onSave,
  emptyText = '찾은 장소가 없어요.',
}: CandidateListProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) return <ErrorBanner error={error} />;
  if (candidates.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View style={styles.list}>
      {candidates.map((c) => (
        <View key={`${c.name}-${c.address}`} style={styles.card}>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{c.name}</Text>
              {c.categoryLabel ? <Text style={styles.tag}>{c.categoryLabel}</Text> : null}
            </View>
            <Text style={styles.sub}>{c.address ?? '주소 정보 없음'}</Text>
            <Text style={styles.sub}>{c.openingHours ?? '운영시간 확인 필요'}</Text>
          </View>
          <Button
            title="저장"
            variant="secondary"
            loading={savingName === c.name}
            disabled={Boolean(savingName) && savingName !== c.name}
            onPress={() => onSave(c)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  empty: { fontSize: fontSize.body, color: colors.textSub, textAlign: 'center', padding: spacing.lg },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  info: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  tag: {
    fontSize: fontSize.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  sub: { fontSize: fontSize.caption, color: colors.textSub },
});
