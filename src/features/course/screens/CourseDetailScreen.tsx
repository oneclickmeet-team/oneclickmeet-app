import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CourseId } from '@/types/ids';
import type { AmountSummaryModel } from '@/types/model';

import { StopList } from '../components/StopList';
import { useCourse, useDeleteCourse } from '../hooks/useCourses';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// 합계는 서버가 계산한 값만 보여 준다(TRD 9.4). 앱에서 다시 더하지 않는다.
export function amountText(a: AmountSummaryModel) {
  switch (a.status) {
    case 'EMPTY':
      return '아직 고른 메뉴·활동이 없어요';
    case 'COMPLETE':
      return `예상 2인 ${won(a.knownTotal)}`;
    case 'PARTIAL': {
      const missing = [
        a.placesWithoutChecked ? `선택 안 한 장소 ${a.placesWithoutChecked}곳` : null,
        a.checkedWithoutAmount ? `금액 미입력 ${a.checkedWithoutAmount}개` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `확인된 금액 ${won(a.knownTotal)} (${missing})`;
    }
  }
}

export function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id) > 0 ? (Number(id) as CourseId) : null;
  const course = useCourse(courseId);
  const remove = useDeleteCourse();

  const confirmDelete = () => {
    if (!courseId) return;
    Alert.alert('코스 삭제', '이 코스를 지울까요? 보관함의 장소는 그대로 남아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          remove.mutate(courseId, {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/course')),
          }),
      },
    ]);
  };

  if (course.isPending) {
    return (
      <Screen edges={[]} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (course.error || !course.data) {
    return (
      <Screen edges={[]}>
        <ErrorBanner error={course.error ?? new Error('not found')} />
      </Screen>
    );
  }

  const c = course.data;
  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>
          {c.places.length}곳 · 총 도보 약 {c.legMinutes.reduce((a, b) => a + b, 0)}분 (추정)
        </Text>
        <Text style={styles.amount}>{amountText(c.amount)}</Text>
      </View>

      <StopList stops={c.places} legMinutes={c.legMinutes} />

      <View style={styles.card}>
        <Text style={styles.section}>메뉴·금액 · 편집 · 공유</Text>
        <Text style={styles.sub}>다음 단계에서 붙여요.</Text>
      </View>

      <ErrorBanner error={remove.error} />
      <Button title="코스 삭제" variant="text" loading={remove.isPending} onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  sub: { fontSize: fontSize.caption, color: colors.textSub },
  amount: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  section: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
});
