import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { CourseView } from '@/features/course/components/CourseView';
import { ActivityList } from '@/features/activity/components/ActivityList';
import { CommentSection, MemoSection } from '@/features/notes/components/NoteSections';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CoupleId, SharedCourseId } from '@/types/ids';
import type { SharedCourse } from '@/types/model';

import { GraceBanner } from '../components/GraceBanner';
import { confirmUnshare } from '../components/unshareConfirm';
import { useCurrentCouple, useEditSharedCourse, useSharedCourse, useUnshareCourse } from '../hooks/useCouple';

const toId = <T,>(v: string | undefined) => (Number(v) > 0 ? (Number(v) as T) : null);

// 공동 코스 상세(S07) + 두 사람 모두 편집(S08) + 첨언·메모 + 공유 취소(S09)
export function SharedCourseScreen() {
  const params = useLocalSearchParams<{ coupleId: string; sharedCourseId: string }>();
  const coupleId = toId<CoupleId>(params.coupleId);
  const id = toId<SharedCourseId>(params.sharedCourseId);
  const shared = useSharedCourse(coupleId, id);

  if (shared.isPending) {
    return (
      <Screen edges={[]} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (shared.error || !shared.data || !coupleId || !id) {
    return (
      <Screen edges={[]}>
        <ErrorBanner error={shared.error ?? new Error('not found')} />
      </Screen>
    );
  }
  return <SharedCourseView shared={shared.data} coupleId={coupleId} id={id} />;
}

function SharedCourseView({ shared, coupleId, id }: { shared: SharedCourse; coupleId: CoupleId; id: SharedCourseId }) {
  const router = useRouter();
  const edit = useEditSharedCourse(coupleId, id);
  const unshare = useUnshareCourse();
  const { couple } = useCurrentCouple();
  const partner = couple?.id === coupleId ? couple.partner?.name ?? '상대' : '상대';

  return (
    <CourseView
      course={shared.course}
      readOnly={shared.readOnly}
      saving={edit.isPending}
      saveError={edit.error}
      onSave={(operations, done) => edit.mutate({ operations }, { onSuccess: done })}
      onCancelEdit={() => edit.reset()}
      banner={
        <>
          {shared.readOnly ? <GraceBanner daysLeft={couple?.id === coupleId ? couple.graceDaysLeft : null} /> : null}
          <View style={styles.who}>
            <Text style={styles.whoText}>
              {shared.sharedByMe ? '내가 공유한 코스' : `${partner}가 공유한 코스`}
              {shared.readOnly ? '' : ' · 둘 다 편집할 수 있어요'}
            </Text>
          </View>
        </>
      }
      footer={
        <>
          <CommentSection coupleId={coupleId} targetType="SHARED_COURSE" targetId={id} readOnly={shared.readOnly} />
          <MemoSection targetType="COURSE" targetId={shared.course.id} />
          <ActivityList
            coupleId={coupleId}
            title="변경 기록"
            target={{ type: 'SHARED_COURSE', id }}
            showLabel={false}
          />
          {shared.readOnly ? null : (
            <>
              <ErrorBanner error={unshare.error} />
              <Button
                title="공동 코스에서 빼기"
                variant="text"
                loading={unshare.isPending}
                onPress={() =>
                  confirmUnshare('코스', shared.sharedByMe, (scope) =>
                    unshare.mutate(
                      { coupleId, id, scope },
                      { onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/course')) },
                    ),
                  )
                }
              />
            </>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  who: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  whoText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
});
