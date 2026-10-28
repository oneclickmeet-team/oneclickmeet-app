import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/theme';

import { StopList } from '../components/StopList';
import { useCourseDraftStore, useRecommendationStore } from '../store/courseStores';

const REASON_TEXT = {
  UNSUPPORTED_REGION: '아직 지원하지 않는 지역이에요. 지금은 연남·서촌·혜화·잠실·성신여대역·한성대입구역에서 추천해요.',
  INSUFFICIENT_PLACES:
    '조건에 맞게 걸어서 이을 장소가 부족해요. 방문 순서의 카테고리를 바꾸거나 장소를 더 저장해 보세요. 지역은 자동으로 넓히지 않아요.',
} as const;

// 추천 결과는 저장되지 않는다. 하나를 골라 편집한 뒤 저장(T02)해야 코스가 생긴다.
export function CourseResultScreen() {
  const router = useRouter();
  const result = useRecommendationStore((s) => s.result);
  const startDraft = useCourseDraftStore((s) => s.start);

  if (!result) {
    return (
      <Screen edges={[]}>
        <Text style={styles.note}>추천 결과가 없어요. 조건을 다시 골라 주세요.</Text>
        <Button title="조건 고르기" onPress={() => router.replace('/courses/builder')} />
      </Screen>
    );
  }

  if (result.courses.length === 0) {
    return (
      <Screen edges={[]}>
        <View style={styles.card}>
          <Text style={styles.title}>추천할 코스가 없어요</Text>
          <Text style={styles.note}>{result.reason ? REASON_TEXT[result.reason] : ''}</Text>
        </View>
        <Button title="조건 바꾸기" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Text style={styles.note}>{result.courses.length}개 코스를 찾았어요. 하나를 골라 편집하고 저장하세요.</Text>
      {result.courses.map((c, idx) => (
        <View key={c.key} style={styles.card}>
          <Text style={styles.badge}>코스 {idx + 1}</Text>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.note}>총 도보 약 {c.legMinutes.reduce((a, b) => a + b, 0)}분 (추정)</Text>
          <StopList stops={c.stops} legMinutes={c.legMinutes} />
          <Button
            title="이 코스로 정하기"
            onPress={() => {
              startDraft(c);
              router.push('/courses/edit');
            }}
          />
        </View>
      ))}
      <Button title="조건 바꾸기" variant="text" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  badge: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
  title: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  note: { fontSize: fontSize.caption, color: colors.textSub },
});
