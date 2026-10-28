import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { MiniButton } from '@/components/MiniButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CandidateList } from '@/features/place/components/CandidateList';
import { useCandidateSearch } from '@/features/place/hooks/usePlaces';
import { useDebounced } from '@/lib/useDebounced';
import { walkMinutes } from '@/lib/walking';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Candidate, Coords } from '@/types/model';

import { StopList } from '../components/StopList';
import { useCreateCourse } from '../hooks/useCourses';
import { useCourseDraftStore, useRecommendationStore } from '../store/courseStores';

const MIN_STOPS = 3;
const MAX_STOPS = 5;

// 새 코스 편집 → 최종 저장(T02). 저장 전 변경은 앱(courseDraftStore)에만 있다.
// 메뉴·금액 항목은 다음 단계에서 붙인다(지금은 items: []로 저장).
export function CourseEditScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const draft = useCourseDraftStore();
  const clearRecommendation = useRecommendationStore((s) => s.clear);
  const create = useCreateCourse();

  // 교체·추가 패널: index가 있으면 그 자리 교체, 'add'면 끝에 추가
  const [picker, setPicker] = useState<number | 'add' | null>(null);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim());

  const legMinutes = draft.stops.slice(1).map((s, i) => walkMinutes(draft.stops[i].coords, s.coords));

  // 검색 기준 좌표: 교체면 그 장소, 추가면 마지막 장소 주변
  const pivot: Coords | null =
    picker === null
      ? null
      : picker === 'add'
        ? draft.stops[draft.stops.length - 1]?.coords ?? null
        : draft.stops[picker]?.coords ?? null;
  const search = useCandidateSearch(
    {
      query: debounced || undefined,
      latitude: pivot?.latitude,
      longitude: pivot?.longitude,
      radiusMeters: 1000,
    },
    picker !== null && pivot !== null,
  );
  // 코스에는 좌표가 있는 후보만 넣을 수 있다(PlaceSnapshot 좌표 필수).
  const candidates = (search.data?.items ?? []).filter(
    (c) => c.coords && !draft.stops.some((s) => s.name === c.name),
  );

  const pick = (c: Candidate) => {
    if (!c.coords) return;
    const stop = { name: c.name, address: c.address, coords: c.coords };
    if (picker === 'add') draft.add(stop);
    else if (typeof picker === 'number') draft.replace(picker, stop);
    setPicker(null);
    setQuery('');
  };

  // 저장하지 않고 나가면 확인을 받는다.
  const saved = useRef(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (saved.current || !useCourseDraftStore.getState().dirty) return;
      e.preventDefault();
      Alert.alert('편집 취소', '저장하지 않은 변경이 사라져요. 나갈까요?', [
        { text: '계속 편집', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  const count = draft.stops.length;
  const canSave = draft.title.trim().length > 0 && count >= MIN_STOPS && count <= MAX_STOPS;

  const save = () => {
    create.mutate(
      {
        title: draft.title.trim(),
        places: draft.stops.map((s, i) => ({
          visitOrder: i + 1,
          name: s.name,
          address: s.address,
          latitude: s.coords.latitude,
          longitude: s.coords.longitude,
          items: [],
        })),
      },
      {
        onSuccess: (course) => {
          saved.current = true;
          draft.reset();
          clearRecommendation();
          router.dismissAll();
          router.push(`/courses/${course.id}`);
        },
      },
    );
  };

  if (count === 0 && !create.isSuccess) {
    return (
      <Screen edges={[]}>
        <Text style={styles.note}>편집할 코스가 없어요.</Text>
        <Button title="코스 추천받기" onPress={() => router.replace('/courses/builder')} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <TextField label="코스 이름" value={draft.title} onChangeText={draft.setTitle} maxLength={255} />

      <StopList
        stops={draft.stops}
        legMinutes={legMinutes}
        renderActions={(i) => (
          <>
            <MiniButton label="위로" disabled={i === 0} onPress={() => draft.move(i, -1)} />
            <MiniButton label="아래로" disabled={i === count - 1} onPress={() => draft.move(i, 1)} />
            <MiniButton label="교체" onPress={() => setPicker(i)} />
            <MiniButton label="빼기" danger disabled={count <= MIN_STOPS} onPress={() => draft.remove(i)} />
          </>
        )}
      />

      {count < MAX_STOPS && picker === null ? (
        <Button title="+ 장소 추가" variant="secondary" onPress={() => setPicker('add')} />
      ) : null}

      {picker !== null ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {picker === 'add' ? '마지막 장소 근처에서 추가' : `${picker + 1}번째 장소 바꾸기`}
          </Text>
          <TextField
            label="이름으로 좁히기 (선택)"
            value={query}
            onChangeText={setQuery}
            placeholder="비워 두면 근처 장소를 모두 보여 줘요"
          />
          <CandidateList
            candidates={candidates}
            loading={search.isFetching}
            error={search.error}
            onSave={pick}
            actionLabel="이 장소로"
            emptyText="근처에서 찾은 장소가 없어요."
          />
          <Button
            title="닫기"
            variant="text"
            onPress={() => {
              setPicker(null);
              setQuery('');
            }}
          />
        </View>
      ) : null}

      <Text style={styles.note}>
        코스는 {MIN_STOPS}~{MAX_STOPS}곳이에요. 도보 시간은 좌표로 계산한 추정값이에요.
      </Text>
      <ErrorBanner error={create.error} />
      <Button title="코스 저장" disabled={!canSave} loading={create.isPending} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  panelTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  note: { fontSize: fontSize.caption, color: colors.textSub },
});
