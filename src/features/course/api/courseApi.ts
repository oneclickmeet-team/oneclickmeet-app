// 코스 추천·저장 API (TRD R01, T01~T03, T05). T04 편집은 다음 단계에서 붙인다.
import { apiRequest } from '@/lib/apiClient';
import { mockCourses } from '@/mocks/courses';
import { isMockMode } from '@/stores/settingsStore';
import type {
  AmountSummary,
  CourseCreateRequest,
  CourseListParams,
  CourseResponse,
  CourseSummary,
  PageResponse,
  RecommendationRequest,
  RecommendationResponse,
  WalkingLeg,
} from '@/types/api';
import type { CourseId } from '@/types/ids';
import type {
  AmountSummaryModel,
  Course,
  CourseSummaryModel,
  Page,
  Recommendation,
} from '@/types/model';

function legMinutes(legs: WalkingLeg[]) {
  return [...legs].sort((a, b) => a.fromVisitOrder - b.fromVisitOrder).map((l) => l.estimatedMinutes);
}

function toAmount(a: AmountSummary): AmountSummaryModel {
  return {
    knownTotal: a.knownTotalAmount,
    placesWithoutChecked: a.placesWithoutCheckedItems,
    checkedWithoutAmount: a.checkedItemsWithoutAmount,
    status: a.status,
  };
}

function toRecommendation(res: RecommendationResponse): Recommendation {
  return {
    reason: res.reason,
    courses: res.courses.map((c) => ({
      key: c.candidateKey,
      title: c.title,
      stops: [...c.places]
        .sort((a, b) => a.visitOrder - b.visitOrder)
        .map((p) => ({
          name: p.name,
          address: p.address,
          coords: { latitude: p.latitude, longitude: p.longitude },
        })),
      legMinutes: legMinutes(c.walkingLegs),
    })),
  };
}

function toCourse(res: CourseResponse): Course {
  return {
    id: res.courseId as CourseId,
    title: res.title,
    places: [...res.places]
      .sort((a, b) => a.visitOrder - b.visitOrder)
      .map((p) => ({
        id: p.coursePlaceId,
        name: p.name,
        address: p.address,
        coords: { latitude: p.latitude, longitude: p.longitude },
        items: p.items.map((i) => ({
          id: i.courseItemId,
          name: i.name,
          twoPersonAmount: i.twoPersonAmount,
          isChecked: i.isChecked,
        })),
        checkedSubtotal: p.checkedSubtotal,
      })),
    legMinutes: legMinutes(res.walkingLegs),
    amount: toAmount(res.amountSummary),
    sharedCourseId: res.sharedCourseId,
    createdAt: res.createdAt,
  };
}

function toSummary(res: CourseSummary): CourseSummaryModel {
  return {
    id: res.courseId as CourseId,
    title: res.title,
    placeCount: res.placeCount,
    amount: toAmount(res.amountSummary),
    shared: res.sharedCourseId !== null,
    createdAt: res.createdAt,
  };
}

export const courseApi = {
  // R01: 결과는 저장되지 않는다. 고른 코스는 T02로 저장한다.
  async recommend(req: RecommendationRequest): Promise<Recommendation> {
    const res = isMockMode()
      ? await mockCourses.recommend(req)
      : await apiRequest<RecommendationResponse>('/course-recommendations', {
          method: 'POST',
          body: req,
          timeoutMs: 30_000,
        });
    return toRecommendation(res);
  },

  // T02
  async create(req: CourseCreateRequest): Promise<Course> {
    const res = isMockMode()
      ? await mockCourses.create(req)
      : await apiRequest<CourseResponse>('/courses', { method: 'POST', body: req });
    return toCourse(res);
  },

  // T01
  async list(params: CourseListParams): Promise<Page<CourseSummaryModel>> {
    const res = isMockMode()
      ? await mockCourses.list(params)
      : await apiRequest<PageResponse<CourseSummary>>('/courses', { query: { ...params } });
    return { items: res.items.map(toSummary), page: res.page, hasNext: res.hasNext };
  },

  // T03
  async get(id: CourseId): Promise<Course> {
    const res = isMockMode() ? await mockCourses.get(id) : await apiRequest<CourseResponse>(`/courses/${id}`);
    return toCourse(res);
  },

  // T05
  async remove(id: CourseId): Promise<void> {
    if (isMockMode()) return mockCourses.remove(id);
    await apiRequest<void>(`/courses/${id}`, { method: 'DELETE' });
  },
};
