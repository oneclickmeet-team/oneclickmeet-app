import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Pressable } from 'react-native';

import { Button } from '@/components/Button';
import { useUnreadCount } from '@/features/activity/hooks/useActivity';
import { Screen } from '@/components/Screen';
import { PlaceRow } from '@/features/place/components/PlaceRow';
import { usePlaceList } from '@/features/place/hooks/usePlaces';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontSize, spacing } from '@/theme';

// 홈 전용 API는 두지 않는다(TRD 13). 최근 장소는 P05를 작은 size로 호출한다.
export function HomeScreen() {
  const router = useRouter();
  const member = useAuthStore((s) => s.member);
  const recent = usePlaceList({ size: 3 });
  const places = recent.data?.pages[0]?.items ?? [];
  const unread = useUnreadCount();

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.heading}>안녕하세요, {member?.displayName ?? ''}님</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`알림 ${unread.count}개`}
          onPress={() => router.push('/notifications')}
          style={styles.bell}
        >
          <Text style={styles.bellText}>알림</Text>
          {unread.count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread.label}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 저장한 장소</Text>
          <Button title="전체 보기" variant="text" onPress={() => router.push('/storage')} />
        </View>
        {places.length === 0 && !recent.isPending ? (
          <Button title="+ 첫 장소 저장하기" variant="secondary" onPress={() => router.push('/place/add')} />
        ) : (
          places.map((p) => (
            <PlaceRow key={p.id} place={p} onPress={() => router.push(`/place/${p.id}`)} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘 어디 갈까요?</Text>
        <Button title="코스 추천받기" onPress={() => router.push('/courses/builder')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  heading: { flex: 1, fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  bell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  bellText: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.white },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
});
