import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Placeholder } from '@/components/Placeholder';
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

  return (
    <Screen>
      <Text style={styles.heading}>안녕하세요, {member?.displayName ?? ''}님</Text>

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

      <Placeholder title="코스 추천" milestone="M3" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
});
