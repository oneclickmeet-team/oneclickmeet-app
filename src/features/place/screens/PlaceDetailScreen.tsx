import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { PlaceId } from '@/types/ids';

import { useDeletePlace, usePlace } from '../hooks/usePlaces';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function PlaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id) > 0 ? (Number(id) as PlaceId) : null;
  const place = usePlace(placeId);
  const remove = useDeletePlace();

  const confirmDelete = () => {
    if (!placeId) return;
    Alert.alert('장소 삭제', '보관함에서 이 장소를 지울까요? 저장한 코스에는 영향이 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          remove.mutate(placeId, {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/storage')),
          }),
      },
    ]);
  };

  if (place.isPending) {
    return (
      <Screen edges={[]} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (place.error || !place.data) {
    return (
      <Screen edges={[]}>
        <ErrorBanner error={place.error ?? new Error('not found')} />
      </Screen>
    );
  }

  const p = place.data;
  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <Text style={styles.name}>{p.name}</Text>
        <Text style={styles.sub}>{p.address ?? '주소 없음'}</Text>
        {p.coords ? null : (
          <Text style={styles.warn}>위치 정보가 없어서 코스 추천 기준 장소로는 쓸 수 없어요.</Text>
        )}
        <Text style={styles.meta}>저장한 날 {formatDate(p.createdAt)}</Text>
        {p.sharedPlaceId ? <Text style={styles.meta}>상대와 공유 중</Text> : null}
      </View>

      {p.sourceUrl ? (
        <Button
          title="원본 링크 열기"
          variant="secondary"
          onPress={() => void Linking.openURL(p.sourceUrl!)}
        />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>메모 · 공유</Text>
        <Text style={styles.sub}>M4 이후에 붙여요.</Text>
      </View>

      <ErrorBanner error={remove.error} />
      <Button title="보관함에서 삭제" variant="text" loading={remove.isPending} onPress={confirmDelete} />
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
  name: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  sub: { fontSize: fontSize.body, color: colors.textSub },
  warn: { fontSize: fontSize.caption, color: colors.warning },
  meta: { fontSize: fontSize.caption, color: colors.textSub },
  section: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
});
