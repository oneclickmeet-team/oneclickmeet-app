import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { MiniButton } from '@/components/MiniButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { walkMinutes } from '@/lib/walking';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CourseEditOperation } from '@/types/api';
import type { AmountSummaryModel, Course } from '@/types/model';

import {
  diffToOperations,
  draftFromCourse,
  newKey,
  previewAmount,
  type CourseDraft,
} from '../lib/editDraft';
import { ItemList } from './ItemList';
import { NearbyPicker } from './NearbyPicker';
import { StopList } from './StopList';

const MIN_STOPS = 3;
const MAX_STOPS = 5;
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// 합계는 서버가 계산한 값만 확정값으로 보여 준다(TRD 9.4).
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

export interface CourseViewProps {
  course: Course;
  /** true면 편집 버튼을 숨긴다(공동 코스 GRACE 등) */
  readOnly?: boolean;
  /** 보기 모드 맨 위에 붙일 안내 */
  banner?: ReactNode;
  /** 보기 모드 맨 아래에 붙일 버튼들(공유, 삭제 등) */
  footer?: ReactNode;
  saving: boolean;
  saveError: unknown;
  /** 변경분 operations를 저장한다. 성공하면 done()을 불러 보기 모드로 돌아간다. */
  onSave: (operations: CourseEditOperation[], done: () => void) => void;
  onCancelEdit?: () => void;
}

/** 코스 보기 + 편집(메뉴·금액·장소). 개인 코스(T04)와 공동 코스(S08)가 같이 쓴다. */
export function CourseView({
  course,
  readOnly,
  banner,
  footer,
  saving,
  saveError,
  onSave,
  onCancelEdit,
}: CourseViewProps) {
  const navigation = useNavigation();

  // null이면 보기 모드, 값이 있으면 편집 중
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [picker, setPicker] = useState<number | 'add' | null>(null);
  const editing = draft !== null;

  const dirty = editing && diffToOperations(course, draft).length > 0;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // 저장하지 않은 편집이 있으면 나가기 전에 확인
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      Alert.alert('편집 취소', '저장하지 않은 변경이 사라져요. 나갈까요?', [
        { text: '계속 편집', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation]);

  const patch = (fn: (d: CourseDraft) => CourseDraft) => setDraft((d) => (d ? fn(d) : d));
  const movePlace = (i: number, delta: -1 | 1) =>
    patch((d) => {
      const places = [...d.places];
      [places[i], places[i + delta]] = [places[i + delta], places[i]];
      return { ...d, places };
    });

  const save = () => {
    if (!draft) return;
    const operations = diffToOperations(course, draft);
    if (operations.length === 0) {
      setDraft(null);
      return;
    }
    onSave(operations, () => setDraft(null));
  };

  // ---- 보기 모드
  if (!editing) {
    return (
      <Screen edges={[]}>
        {banner}
        <View style={styles.card}>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.sub}>
            {course.places.length}곳 · 총 도보 약 {course.legMinutes.reduce((a, b) => a + b, 0)}분 (추정)
          </Text>
          <Text style={styles.amount}>{amountText(course.amount)}</Text>
        </View>

        <StopList
          stops={course.places}
          legMinutes={course.legMinutes}
          renderBody={(i) => {
            const p = course.places[i];
            return (
              <>
                <ItemList editable={false} items={draftFromCourse(course).places[i].items} />
                {p.checkedSubtotal > 0 ? <Text style={styles.subtotal}>선택 합계 {won(p.checkedSubtotal)}</Text> : null}
              </>
            );
          }}
        />

        {readOnly ? null : (
          <Button title="메뉴·금액 입력 / 코스 편집" onPress={() => setDraft(draftFromCourse(course))} />
        )}
        {footer}
      </Screen>
    );
  }

  // ---- 편집 모드
  const count = draft.places.length;
  const legMinutes = draft.places.slice(1).map((p, i) => walkMinutes(draft.places[i].coords, p.coords));
  const preview = previewAmount(draft);
  const canSave = draft.title.trim().length > 0 && count >= MIN_STOPS && count <= MAX_STOPS;
  const pivot =
    picker === null ? null : picker === 'add' ? draft.places[count - 1]?.coords : draft.places[picker]?.coords;

  return (
    <Screen edges={[]}>
      <TextField
        label="코스 이름"
        value={draft.title}
        maxLength={255}
        onChangeText={(title) => patch((d) => ({ ...d, title }))}
      />

      <View style={styles.previewBox}>
        <Text style={styles.previewText}>
          선택한 금액 {won(preview.known)}
          {preview.placesWithout ? ` · 선택 안 한 장소 ${preview.placesWithout}곳` : ''}
          {preview.missingAmount ? ` · 금액 미입력 ${preview.missingAmount}개` : ''}
        </Text>
        <Text style={styles.sub}>저장 전 미리보기예요. 체크한 항목만 더해요.</Text>
      </View>

      <StopList
        stops={draft.places}
        legMinutes={legMinutes}
        renderBody={(i) => (
          <ItemList
            editable
            items={draft.places[i].items}
            onChange={(items) =>
              patch((d) => ({ ...d, places: d.places.map((p, idx) => (idx === i ? { ...p, items } : p)) }))
            }
          />
        )}
        renderActions={(i) => (
          <>
            <MiniButton label="위로" disabled={i === 0} onPress={() => movePlace(i, -1)} />
            <MiniButton label="아래로" disabled={i === count - 1} onPress={() => movePlace(i, 1)} />
            <MiniButton label="교체" onPress={() => setPicker(i)} />
            <MiniButton
              label="빼기"
              danger
              disabled={count <= MIN_STOPS}
              onPress={() => patch((d) => ({ ...d, places: d.places.filter((_, idx) => idx !== i) }))}
            />
          </>
        )}
      />

      {picker !== null && pivot ? (
        <NearbyPicker
          title={picker === 'add' ? '마지막 장소 근처에서 추가' : `${picker + 1}번째 장소 바꾸기`}
          pivot={pivot}
          excludeNames={draft.places.map((p) => p.name)}
          onClose={() => setPicker(null)}
          onPick={(stop) => {
            patch((d) => {
              if (picker === 'add') {
                return {
                  ...d,
                  places: [...d.places, { ...stop, key: newKey('p'), coursePlaceId: null, replacesId: null, items: [] }],
                };
              }
              const old = d.places[picker];
              // 교체하면 새 장소가 되고, 기존 항목은 옮기지 않는다(TRD 9.3-3).
              const replacesId = old.coursePlaceId ?? old.replacesId;
              return {
                ...d,
                places: d.places.map((p, idx) =>
                  idx === picker
                    ? { ...stop, key: newKey('p'), coursePlaceId: null, replacesId, items: [] }
                    : p,
                ),
              };
            });
            setPicker(null);
          }}
        />
      ) : count < MAX_STOPS ? (
        <Button title="+ 장소 추가" variant="secondary" onPress={() => setPicker('add')} />
      ) : null}

      <ErrorBanner error={saveError} />
      <Button title="저장" disabled={!canSave} loading={saving} onPress={save} />
      <Button
        title="편집 취소"
        variant="text"
        onPress={() => {
          setDraft(null);
          setPicker(null);
          onCancelEdit?.();
        }}
      />
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
  subtotal: { fontSize: fontSize.caption, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  previewBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  previewText: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
});
