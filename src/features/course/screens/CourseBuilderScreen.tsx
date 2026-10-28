import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { usePlaceList, useRegions } from '@/features/place/hooks/usePlaces';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { RecommendationRequest, RegionId } from '@/types/api';
import type { PlaceId } from '@/types/ids';

import { CATEGORY_CODES, CATEGORY_LABELS, DEFAULT_SEQUENCE, type CategoryCode } from '../categories';
import { useRecommend } from '../hooks/useCourses';
import { useRecommendationStore } from '../store/courseStores';

type Mode = 'REGION' | 'PLACE';

// 추천 조건: 시작 기준(지역 또는 저장 장소 1곳), 장소 수, 방문 순서별 카테고리, 필수 장소 위치
export function CourseBuilderScreen() {
  const router = useRouter();
  const regions = useRegions();
  const places = usePlaceList();
  const recommend = useRecommend();
  const setRecommendation = useRecommendationStore((s) => s.set);

  const [mode, setMode] = useState<Mode>('REGION');
  const [regionId, setRegionId] = useState<RegionId | null>(null);
  const [placeId, setPlaceId] = useState<PlaceId | null>(null);
  const [count, setCount] = useState(3);
  const [sequence, setSequence] = useState<CategoryCode[]>(DEFAULT_SEQUENCE[3]);
  const [requiredOrder, setRequiredOrder] = useState(1);

  // 추천 기준으로는 좌표가 있는 장소만 쓸 수 있다(TRD 7.2).
  const anchorable = (places.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => p.coords);

  const changeCount = (n: number) => {
    setCount(n);
    setSequence(DEFAULT_SEQUENCE[n]);
    setRequiredOrder((o) => Math.min(o, n));
  };

  const setSlot = (i: number, code: CategoryCode) =>
    setSequence((seq) => seq.map((c, idx) => (idx === i ? code : c)));

  const ready = mode === 'REGION' ? regionId !== null : placeId !== null;

  const submit = () => {
    if (!ready) return;
    const req: RecommendationRequest =
      mode === 'REGION'
        ? { anchor: { type: 'REGION', regionId: regionId! }, placeCount: count, categorySequence: sequence }
        : {
            anchor: { type: 'PLACE', source: 'PERSONAL', placeId: placeId! },
            placeCount: count,
            categorySequence: sequence,
            requiredPlaceOrder: requiredOrder,
          };
    recommend.mutate(req, {
      onSuccess: (result) => {
        setRecommendation(req, result);
        router.push('/courses/result');
      },
    });
  };

  return (
    <Screen edges={[]}>
      <Section title="어디서 시작할까요?">
        <View style={styles.row}>
          <Chip label="지역에서" selected={mode === 'REGION'} onPress={() => setMode('REGION')} />
          <Chip label="저장한 장소에서" selected={mode === 'PLACE'} onPress={() => setMode('PLACE')} />
        </View>
        {mode === 'REGION' ? (
          <View style={styles.wrap}>
            {regions.data?.map((r) => (
              <Chip
                key={r.regionId}
                label={r.name}
                selected={regionId === r.regionId}
                onPress={() => setRegionId(r.regionId)}
              />
            ))}
          </View>
        ) : anchorable.length === 0 ? (
          <Text style={styles.note}>위치 정보가 있는 저장 장소가 없어요. 먼저 장소를 검색해서 저장해 주세요.</Text>
        ) : (
          <View style={styles.wrap}>
            {anchorable.map((p) => (
              <Chip key={p.id} label={p.name} selected={placeId === p.id} onPress={() => setPlaceId(p.id)} />
            ))}
          </View>
        )}
      </Section>

      <Section title="몇 곳 들를까요?">
        <View style={styles.row}>
          {[3, 4, 5].map((n) => (
            <Chip key={n} label={`${n}곳`} selected={count === n} onPress={() => changeCount(n)} />
          ))}
        </View>
      </Section>

      {mode === 'PLACE' ? (
        <Section title="선택한 장소는 몇 번째로 갈까요?">
          <View style={styles.row}>
            {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
              <Chip key={n} label={`${n}번째`} selected={requiredOrder === n} onPress={() => setRequiredOrder(n)} />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="방문 순서">
        {sequence.map((code, i) => {
          const isAnchorSlot = mode === 'PLACE' && requiredOrder === i + 1;
          return (
            <View key={i} style={styles.slot}>
              <Text style={styles.slotLabel}>{i + 1}번째</Text>
              {isAnchorSlot ? (
                <Text style={styles.anchorText}>선택한 장소</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {CATEGORY_CODES.map((c) => (
                    <Chip key={c} label={CATEGORY_LABELS[c]} selected={code === c} onPress={() => setSlot(i, c)} />
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </Section>

      <ErrorBanner error={recommend.error} />
      <Button title="코스 추천받기" disabled={!ready} loading={recommend.isPending} onPress={submit} />
      <Text style={styles.note}>장소 사이는 걸어서 10분 이내로 묶어요. 도보 시간은 좌표로 계산한 추정값이에요.</Text>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { gap: spacing.xs },
  slotLabel: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
  anchorText: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  note: { fontSize: fontSize.caption, color: colors.textSub },
});
