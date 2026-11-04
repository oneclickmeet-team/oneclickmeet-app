// 저장된 코스 편집본과, 원본과의 차이를 T04 operations로 바꾸는 함수.
// 화면은 편집본만 고치고, 저장 버튼을 누를 때 diffToOperations로 명령 묶음을 만든다.
import type { CourseEditOperation, CourseItemInput, PlaceWithItems } from '@/types/api';
import type { Course, CourseStop } from '@/types/model';

export interface DraftItem extends CourseItemInput {
  key: string;
  /** 서버에 이미 있는 항목이면 그 ID, 새 항목이면 null */
  courseItemId: number | null;
}

export interface DraftPlace extends CourseStop {
  key: string;
  /** 원본 장소면 그 ID. 새로 추가하거나 교체한 장소는 null */
  coursePlaceId: number | null;
  /** 교체한 장소면 원래 장소 ID */
  replacesId: number | null;
  items: DraftItem[];
}

export interface CourseDraft {
  title: string;
  places: DraftPlace[];
}

let seq = 0;
export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export function draftFromCourse(course: Course): CourseDraft {
  return {
    title: course.title,
    places: course.places.map((p) => ({
      key: `p-${p.id}`,
      coursePlaceId: p.id,
      replacesId: null,
      name: p.name,
      address: p.address,
      coords: p.coords,
      items: p.items.map((i) => ({
        key: `i-${i.id}`,
        courseItemId: i.id,
        name: i.name,
        twoPersonAmount: i.twoPersonAmount,
        isChecked: i.isChecked,
      })),
    })),
  };
}

const toItemInput = (i: DraftItem): CourseItemInput => ({
  name: i.name.trim(),
  twoPersonAmount: i.twoPersonAmount,
  isChecked: i.isChecked,
});

const toPlaceWithItems = (p: DraftPlace): PlaceWithItems => ({
  name: p.name,
  address: p.address,
  latitude: p.coords.latitude,
  longitude: p.coords.longitude,
  items: p.items.map(toItemInput),
});

type Ref = { coursePlaceId: number } | { clientPlaceKey: string };
const refKey = (r: Ref) => ('coursePlaceId' in r ? `id:${r.coursePlaceId}` : `key:${r.clientPlaceKey}`);

/**
 * 원본 코스와 편집본의 차이를 TRD 9.3 명령 묶음으로 만든다.
 * 순서: 제목 → 남은 장소의 항목 변경 → 장소 삭제 → 교체 → 추가 → 순서 지정
 */
export function diffToOperations(original: Course, draft: CourseDraft): CourseEditOperation[] {
  const ops: CourseEditOperation[] = [];

  if (draft.title.trim() !== original.title) ops.push({ type: 'UPDATE_TITLE', title: draft.title.trim() });

  const keptIds = new Set(draft.places.filter((p) => p.coursePlaceId !== null).map((p) => p.coursePlaceId!));
  const replacedIds = new Set(draft.places.filter((p) => p.replacesId !== null).map((p) => p.replacesId!));

  // 남아 있는 원본 장소의 항목 변경
  for (const p of draft.places) {
    if (p.coursePlaceId === null) continue;
    const orig = original.places.find((o) => o.id === p.coursePlaceId);
    if (!orig) continue;
    const draftItemIds = new Set(p.items.filter((i) => i.courseItemId !== null).map((i) => i.courseItemId!));
    for (const oi of orig.items) {
      if (!draftItemIds.has(oi.id)) ops.push({ type: 'REMOVE_ITEM', courseItemId: oi.id });
    }
    for (const di of p.items) {
      if (di.courseItemId === null) {
        ops.push({ type: 'ADD_ITEM', coursePlaceId: p.coursePlaceId, item: toItemInput(di) });
        continue;
      }
      const oi = orig.items.find((x) => x.id === di.courseItemId);
      if (!oi) continue;
      const changes: Partial<CourseItemInput> = {};
      if (di.name.trim() !== oi.name) changes.name = di.name.trim();
      if (di.twoPersonAmount !== oi.twoPersonAmount) changes.twoPersonAmount = di.twoPersonAmount;
      if (di.isChecked !== oi.isChecked) changes.isChecked = di.isChecked;
      if (Object.keys(changes).length > 0) {
        ops.push({ type: 'UPDATE_ITEM', courseItemId: di.courseItemId, ...changes });
      }
    }
  }

  // 빠진 장소 (교체된 것은 REPLACE_PLACE가 처리)
  for (const o of original.places) {
    if (!keptIds.has(o.id) && !replacedIds.has(o.id)) ops.push({ type: 'REMOVE_PLACE', coursePlaceId: o.id });
  }

  // 교체·추가
  const added: string[] = [];
  for (const p of draft.places) {
    if (p.replacesId !== null) {
      ops.push({ type: 'REPLACE_PLACE', coursePlaceId: p.replacesId, clientPlaceKey: p.key, place: toPlaceWithItems(p) });
    } else if (p.coursePlaceId === null) {
      ops.push({ type: 'ADD_PLACE', clientPlaceKey: p.key, place: toPlaceWithItems(p) });
      added.push(p.key);
    }
  }

  // 서버가 위 명령만 적용했을 때의 순서: 원본 순서(삭제 제외, 교체는 같은 자리) + 추가는 끝
  const implied: Ref[] = [];
  for (const o of original.places) {
    if (keptIds.has(o.id)) implied.push({ coursePlaceId: o.id });
    else if (replacedIds.has(o.id)) {
      const rep = draft.places.find((p) => p.replacesId === o.id)!;
      implied.push({ clientPlaceKey: rep.key });
    }
  }
  for (const k of added) implied.push({ clientPlaceKey: k });

  const desired: Ref[] = draft.places.map((p) =>
    p.coursePlaceId !== null ? { coursePlaceId: p.coursePlaceId } : { clientPlaceKey: p.key },
  );
  if (desired.map(refKey).join('|') !== implied.map(refKey).join('|')) {
    ops.push({ type: 'REORDER_PLACES', places: desired });
  }

  return ops;
}

/** 저장 전 미리보기용 합계. 확정값은 저장 후 서버 응답의 amountSummary를 쓴다. */
export function previewAmount(draft: CourseDraft) {
  let known = 0;
  let placesWithout = 0;
  let missingAmount = 0;
  for (const p of draft.places) {
    const checked = p.items.filter((i) => i.isChecked);
    if (checked.length === 0) placesWithout += 1;
    for (const i of checked) {
      if (i.twoPersonAmount === null) missingAmount += 1;
      else known += i.twoPersonAmount;
    }
  }
  return { known, placesWithout, missingAmount };
}
