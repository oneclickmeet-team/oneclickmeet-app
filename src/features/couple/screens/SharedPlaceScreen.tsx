import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CoupleId, SharedPlaceId } from '@/types/ids';

import { GraceBanner } from '../components/GraceBanner';
import { confirmUnshare } from '../components/unshareConfirm';
import { useCurrentCouple, useSharedPlace, useUnsharePlace } from '../hooks/useCouple';

const toId = <T,>(v: string | undefined) => (Number(v) > 0 ? (Number(v) as T) : null);

// 공동 장소 상세(S03) + 공유 취소(S04). 메모·첨언은 다음 단계에서 붙인다.
export function SharedPlaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ coupleId: string; sharedPlaceId: string }>();
  const coupleId = toId<CoupleId>(params.coupleId);
  const id = toId<SharedPlaceId>(params.sharedPlaceId);
  const shared = useSharedPlace(coupleId, id);
  const { couple } = useCurrentCouple();
  const unshare = useUnsharePlace();

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

  const s = shared.data;
  const p = s.place;
  const partner = couple?.id === coupleId ? couple.partner?.name ?? '상대' : '상대';

  return (
    <Screen edges={[]}>
      {s.readOnly ? <GraceBanner daysLeft={couple?.id === coupleId ? couple.graceDaysLeft : null} /> : null}
      <View style={styles.card}>
        <Text style={styles.badge}>{s.sharedByMe ? '내가 공유' : `${partner}가 공유`}</Text>
        <Text style={styles.name}>{p.name}</Text>
        <Text style={styles.sub}>{p.address ?? '주소 없음'}</Text>
        {p.coords ? null : <Text style={styles.warn}>위치 정보가 없어서 코스 추천 기준으로는 쓸 수 없어요.</Text>}
      </View>

      {p.sourceUrl ? (
        <Button title="원본 링크 열기" variant="secondary" onPress={() => void Linking.openURL(p.sourceUrl!)} />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>메모 · 같이 남기는 말</Text>
        <Text style={styles.sub}>다음 단계에서 붙여요.</Text>
      </View>

      {!s.readOnly ? (
        <>
          <ErrorBanner error={unshare.error} />
          <Button
            title="공동 보관함에서 빼기"
            variant="text"
            loading={unshare.isPending}
            onPress={() =>
              confirmUnshare('장소', s.sharedByMe, (scope) =>
                unshare.mutate(
                  { coupleId, id, scope },
                  { onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/storage')) },
                ),
              )
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  name: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  sub: { fontSize: fontSize.body, color: colors.textSub },
  warn: { fontSize: fontSize.caption, color: colors.warning },
  section: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
});
