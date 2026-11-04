import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { useCurrentCouple, useShareCourse } from '@/features/couple/hooks/useCouple';
import { MemoSection } from '@/features/notes/components/NoteSections';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CourseId } from '@/types/ids';
import type { Course } from '@/types/model';

import { CourseView } from '../components/CourseView';
import { useCourse, useDeleteCourse, useUpdateCourse } from '../hooks/useCourses';

export { amountText } from '../components/CourseView';

// 개인 코스 상세(T03) + 편집(T04) + 공유(S06) + 삭제(T05)
export function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id) > 0 ? (Number(id) as CourseId) : null;
  const course = useCourse(courseId);

  if (course.isPending) {
    return (
      <Screen edges={[]} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (course.error || !course.data || !courseId) {
    return (
      <Screen edges={[]}>
        <ErrorBanner error={course.error ?? new Error('not found')} />
      </Screen>
    );
  }
  return <PersonalCourse course={course.data} />;
}

function PersonalCourse({ course }: { course: Course }) {
  const router = useRouter();
  const update = useUpdateCourse(course.id);
  const remove = useDeleteCourse();
  const { couple } = useCurrentCouple();
  const share = useShareCourse();

  const confirmDelete = () =>
    Alert.alert('코스 삭제', '이 코스를 지울까요? 보관함의 장소는 그대로 남아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          remove.mutate(course.id, {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/course')),
          }),
      },
    ]);

  const shareBox =
    course.sharedCourseId !== null && couple ? (
      <View style={styles.shareBox}>
        <Text style={styles.shareText}>{couple.partner?.name ?? '상대'}와 공유 중이에요. 공동 코스에서 같이 편집할 수 있어요.</Text>
        <Button
          title="공동 코스로 보기"
          variant="secondary"
          onPress={() => router.push(`/couples/${couple.id}/courses/${course.sharedCourseId}`)}
        />
      </View>
    ) : couple?.status === 'ACTIVE' ? (
      <>
        <ErrorBanner error={share.error} />
        <Button
          title={`${couple.partner?.name ?? '상대'}와 공유하기`}
          variant="secondary"
          loading={share.isPending}
          onPress={() => share.mutate({ coupleId: couple.id, courseId: course.id })}
        />
      </>
    ) : null;

  return (
    <CourseView
      course={course}
      saving={update.isPending}
      saveError={update.error}
      onSave={(operations, done) => update.mutate({ operations }, { onSuccess: done })}
      onCancelEdit={() => update.reset()}
      footer={
        <>
          {shareBox}
          <MemoSection targetType="COURSE" targetId={course.id} />
          <ErrorBanner error={remove.error} />
          <Button title="코스 삭제" variant="text" loading={remove.isPending} onPress={confirmDelete} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shareBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  shareText: { fontSize: fontSize.caption, color: colors.primary, fontWeight: '700' },
});
