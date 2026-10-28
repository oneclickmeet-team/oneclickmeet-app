// R01, T01~T03, T05 mock.
// 추천은 AI 레포(placeflow/v3/recommend.py)의 규칙을 그대로 옮겼다.
//  - 기준 반경 1km 안의 후보만 (내 저장 장소 + 외부 후보)
//  - 각 자리에는 그 자리 카테고리의 장소만, 필수 장소는 지정한 자리에 고정
//  - 이웃 장소 사이 추정 도보 10분 이내
//  - 점수: 저장 장소 +5, 도보 1분당 -0.12
//  - 코스끼리 겹침: 필수 장소 빼고 1곳까지, 모자라면 2곳까지. 최대 3개
import { ANCHOR_RADIUS_M, MAX_LEG_MIN, distanceMeters, walkMinutes } from '@/lib/walking';
import type {
  AmountSummary,
  CategoryCode,
  CourseCreateRequest,
  CourseListParams,
  CourseResponse,
  CourseSummary,
  PageResponse,
  PlaceSnapshot,
  RecommendationRequest,
  RecommendationResponse,
  RecommendedCourse,
  WalkingLeg,
} from '@/types/api';

import { badRequest, delay, fail, nowIso, requireMemberId } from './core';
import { db, saveDb, type MockCourse } from './db';
import { CATALOG, REGIONS } from './places';

const LABELS: Record<CategoryCode, string> = {
  MEAL: '맛집',
  CAFE: '카페',
  BAR: '술집',
  ACTIVITY: '놀거리',
  CULTURE: '전시',
  WALK: '산책',
  SHOPPING: '쇼핑',
};
const MAX_EXTERNAL_PER_CODE = 12;
const BEAM = 3000;

interface Node {
  key: string;
  snapshot: PlaceSnapshot;
  saved: boolean;
}

const pos = (s: PlaceSnapshot) => ({ latitude: s.latitude, longitude: s.longitude });

function nearestRegion(lat: number, lng: number) {
  let best: { d: number; r: (typeof REGIONS)[number] } | null = null;
  for (const r of REGIONS) {
    const d = distanceMeters({ latitude: lat, longitude: lng }, r);
    if (d <= 1200 && (!best || d < best.d)) best = { d, r };
  }
  return best?.r ?? null;
}

function legsOf(places: PlaceSnapshot[]): WalkingLeg[] {
  return places.slice(1).map((p, i) => ({
    fromVisitOrder: i + 1,
    toVisitOrder: i + 2,
    estimatedMinutes: walkMinutes(pos(places[i]), pos(p)),
  }));
}

function hashKey(keys: string[]) {
  let h = 0;
  for (const ch of keys.join('>')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `crs_${(h >>> 0).toString(16)}`;
}

export function recommendCourses(req: RecommendationRequest, memberId: number): RecommendationResponse {
  const empty = (reason: RecommendationResponse['reason']): RecommendationResponse => ({
    courses: [],
    reason,
    walkingTimeMethod: 'COORDINATE_ESTIMATE',
  });

  // 0) 기준 확인
  const myPlaces = db().places.filter((p) => p.ownerId === memberId);
  let center: { latitude: number; longitude: number };
  let anchorNode: Node | null = null;
  if (req.anchor.type === 'PLACE') {
    if (req.anchor.source !== 'PERSONAL') badRequest('anchor', '공동 장소 기준 추천은 M4 이후에 붙여요.');
    const placeId = req.anchor.placeId;
    const anchor = myPlaces.find((p) => p.placeId === placeId);
    if (!anchor) fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });
    if (anchor.latitude === null || anchor.longitude === null) {
      badRequest('anchor', '위치 정보가 없는 장소는 추천 기준으로 쓸 수 없어요.');
    }
    center = { latitude: anchor.latitude, longitude: anchor.longitude };
    anchorNode = {
      key: `mine-${anchor.placeId}`,
      saved: true,
      snapshot: { name: anchor.name, address: anchor.address, ...center },
    };
  } else {
    const regionId = req.anchor.regionId;
    const r = REGIONS.find((x) => x.regionId === regionId);
    if (!r) return empty('UNSUPPORTED_REGION');
    center = { latitude: r.latitude, longitude: r.longitude };
  }
  const region = nearestRegion(center.latitude, center.longitude);
  if (!region) return empty('UNSUPPORTED_REGION');

  const seq = req.categorySequence;
  const anchorPos = anchorNode ? (req.requiredPlaceOrder ?? 1) - 1 : -1;

  // 1) 후보 모으기: 저장 장소 먼저, 외부는 가까운 순 최대 12곳
  const byCode = new Map<CategoryCode, Node[]>();
  for (const code of new Set(seq.filter((_, i) => i !== anchorPos))) {
    const saved: Node[] = myPlaces
      .filter(
        (p) =>
          p.categoryCode === code &&
          p.latitude !== null &&
          p.longitude !== null &&
          `mine-${p.placeId}` !== anchorNode?.key &&
          distanceMeters(center, { latitude: p.latitude, longitude: p.longitude }) <= ANCHOR_RADIUS_M,
      )
      .map((p) => ({
        key: `mine-${p.placeId}`,
        saved: true,
        snapshot: { name: p.name, address: p.address, latitude: p.latitude!, longitude: p.longitude! },
      }));
    const external: Node[] = CATALOG.filter(
      (c) =>
        c.code === code &&
        !saved.some((s) => s.snapshot.name === c.name) &&
        c.name !== anchorNode?.snapshot.name &&
        distanceMeters(center, { latitude: c.latitude!, longitude: c.longitude! }) <= ANCHOR_RADIUS_M,
    )
      .sort(
        (a, b) =>
          distanceMeters(center, { latitude: a.latitude!, longitude: a.longitude! }) -
          distanceMeters(center, { latitude: b.latitude!, longitude: b.longitude! }),
      )
      .slice(0, MAX_EXTERNAL_PER_CODE)
      .map((c) => ({
        key: `ext-${c.name}`,
        saved: false,
        snapshot: { name: c.name, address: c.address, latitude: c.latitude!, longitude: c.longitude! },
      }));
    byCode.set(code, [...saved, ...external]);
  }
  const slots: Node[][] = seq.map((code, i) => (i === anchorPos && anchorNode ? [anchorNode] : byCode.get(code) ?? []));
  if (slots.some((s) => s.length === 0)) return empty('INSUFFICIENT_PLACES');

  // 2) 자리 채우기 (빔 탐색)
  type Path = { score: number; nodes: Node[]; legs: number[] };
  let beam: Path[] = [{ score: 0, nodes: [], legs: [] }];
  slots.forEach((options) => {
    const next: Path[] = [];
    for (const path of beam) {
      for (const n of options) {
        if (path.nodes.some((x) => x.key === n.key)) continue;
        const prev = path.nodes[path.nodes.length - 1];
        const leg = prev ? walkMinutes(pos(prev.snapshot), pos(n.snapshot)) : null;
        if (leg !== null && leg > MAX_LEG_MIN) continue;
        next.push({
          score: path.score + (n.saved ? 5 : 0) - 0.12 * (leg ?? 0),
          nodes: [...path.nodes, n],
          legs: leg === null ? path.legs : [...path.legs, leg],
        });
      }
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, BEAM);
  });
  if (beam.length === 0) return empty('INSUFFICIENT_PLACES');

  // 3) 서로 다른 코스 고르기
  const chosen: Path[] = [];
  const others = (p: Path) => new Set(p.nodes.filter((n) => n.key !== anchorNode?.key).map((n) => n.key));
  for (const maxOverlap of [1, 2]) {
    for (const p of beam) {
      if (chosen.length >= 3) break;
      if (chosen.includes(p)) continue;
      const mine = others(p);
      const tooSimilar = chosen.some((q) => [...others(q)].filter((k) => mine.has(k)).length > maxOverlap);
      if (!tooSimilar) chosen.push(p);
    }
  }

  const uniqueLabels = [...new Set(seq.map((c) => LABELS[c]))];
  const title = `${region.name} ${uniqueLabels.join('·')} 코스`;
  const courses: RecommendedCourse[] = chosen.map((p) => {
    const places = p.nodes.map((n, i) => ({ visitOrder: i + 1, ...n.snapshot }));
    return {
      candidateKey: hashKey(p.nodes.map((n) => n.key)),
      title,
      places,
      walkingLegs: legsOf(places),
    };
  });
  return { courses, reason: null, walkingTimeMethod: 'COORDINATE_ESTIMATE' };
}

function amountOf(course: Pick<CourseResponse, 'places'>): AmountSummary {
  let known = 0;
  let placesWithout = 0;
  let checkedWithoutAmount = 0;
  let anyChecked = false;
  for (const p of course.places) {
    const checked = p.items.filter((i) => i.isChecked);
    if (checked.length === 0) placesWithout += 1;
    for (const i of checked) {
      anyChecked = true;
      if (i.twoPersonAmount === null) checkedWithoutAmount += 1;
      else known += i.twoPersonAmount;
    }
  }
  const status = !anyChecked
    ? 'EMPTY'
    : placesWithout === 0 && checkedWithoutAmount === 0
      ? 'COMPLETE'
      : 'PARTIAL';
  return {
    currency: 'KRW',
    knownTotalAmount: known,
    placesWithoutCheckedItems: placesWithout,
    checkedItemsWithoutAmount: checkedWithoutAmount,
    status,
    amountSource: 'USER_INPUT',
  };
}

function toResponse({ ownerId: _o, ...rest }: MockCourse): CourseResponse {
  // 도보 시간은 조회할 때마다 다시 계산한다(TRD 9.4).
  return { ...rest, walkingLegs: legsOf(rest.places), amountSummary: amountOf(rest) };
}

function findOwned(courseId: number) {
  const me = requireMemberId();
  const course = db().courses.find((c) => c.courseId === courseId && c.ownerId === me);
  if (!course) fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });
  return course;
}

export const mockCourses = {
  // R01
  async recommend(req: RecommendationRequest): Promise<RecommendationResponse> {
    await delay(900);
    if (req.placeCount < 3 || req.placeCount > 5) badRequest('placeCount', '장소 수는 3~5곳이에요.');
    if (req.categorySequence.length !== req.placeCount) {
      badRequest('categorySequence', '카테고리 순서 개수가 장소 수와 달라요.');
    }
    return recommendCourses(req, requireMemberId());
  },

  // T02
  async create(req: CourseCreateRequest): Promise<CourseResponse> {
    await delay();
    const me = requireMemberId();
    if (!req.title.trim() || req.title.length > 255) badRequest('title', '코스 제목은 1~255자예요.');
    if (req.places.length < 3 || req.places.length > 5) badRequest('places', '코스는 3~5곳이에요.');
    const store = db();
    const seq = () => store.nextCourseSeq++;
    const now = nowIso();
    const course: MockCourse = {
      ownerId: me,
      courseId: seq(),
      title: req.title.trim(),
      sharedCourseId: null,
      sourceSharedCourseId: null,
      places: [...req.places]
        .sort((a, b) => a.visitOrder - b.visitOrder)
        .map((p, i) => {
          const items = p.items.map((it) => ({ ...it, courseItemId: seq() }));
          return {
            coursePlaceId: seq(),
            visitOrder: i + 1,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            items,
            checkedSubtotal: items
              .filter((it) => it.isChecked && it.twoPersonAmount !== null)
              .reduce((sum, it) => sum + (it.twoPersonAmount ?? 0), 0),
          };
        }),
      walkingLegs: [],
      walkingTimeMethod: 'COORDINATE_ESTIMATE',
      amountSummary: amountOf({ places: [] }),
      createdAt: now,
      updatedAt: now,
    };
    store.courses.push(course);
    saveDb();
    return toResponse(course);
  },

  // T01
  async list(params: CourseListParams): Promise<PageResponse<CourseSummary>> {
    await delay(300);
    const me = requireMemberId();
    const q = params.query?.trim() ?? '';
    const all = db()
      .courses.filter((c) => c.ownerId === me && (!q || c.title.includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.courseId - a.courseId)
      .map((c) => {
        const full = toResponse(c);
        return {
          courseId: c.courseId,
          title: c.title,
          placeCount: c.places.length,
          sharedCourseId: c.sharedCourseId,
          sourceSharedCourseId: c.sourceSharedCourseId,
          amountSummary: full.amountSummary,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    return { items: all.slice(page * size, page * size + size), page, size, hasNext: (page + 1) * size < all.length };
  },

  // T03
  async get(courseId: number): Promise<CourseResponse> {
    await delay(200);
    return toResponse(findOwned(courseId));
  },

  // T05
  async remove(courseId: number): Promise<void> {
    await delay();
    const course = findOwned(courseId);
    if (course.sharedCourseId !== null) {
      fail({ status: 409, title: 'Conflict', code: 'COURSE-0409', reason: 'ACTIVE_SHARE_EXISTS' });
    }
    const store = db();
    store.courses = store.courses.filter((c) => c.courseId !== courseId);
    saveDb();
  },
};
