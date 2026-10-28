import { create } from 'zustand';

import type { RecommendationRequest } from '@/types/api';
import type { CourseStop, Recommendation, RecommendedCourseModel } from '@/types/model';

// 추천 조건과 결과. 조건 화면 ↔ 결과 화면을 오가는 동안 유지한다(설계서 8장 recommendationStore).
interface RecommendationState {
  request: RecommendationRequest | null;
  result: Recommendation | null;
  set: (request: RecommendationRequest, result: Recommendation) => void;
  clear: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set) => ({
  request: null,
  result: null,
  set: (request, result) => set({ request, result }),
  clear: () => set({ request: null, result: null }),
}));

// 저장 전 코스 편집본(courseDraftStore). 저장 성공이나 취소 때 비운다.
export interface DraftStop extends CourseStop {
  clientKey: string;
}

interface CourseDraftState {
  title: string;
  stops: DraftStop[];
  dirty: boolean;
  start: (course: RecommendedCourseModel) => void;
  setTitle: (title: string) => void;
  move: (index: number, delta: -1 | 1) => void;
  remove: (index: number) => void;
  replace: (index: number, stop: CourseStop) => void;
  add: (stop: CourseStop) => void;
  reset: () => void;
}

let keySeq = 0;
const withKey = (s: CourseStop): DraftStop => ({ ...s, clientKey: `draft-${++keySeq}` });

export const useCourseDraftStore = create<CourseDraftState>((set) => ({
  title: '',
  stops: [],
  dirty: false,
  start: (course) => set({ title: course.title, stops: course.stops.map(withKey), dirty: false }),
  setTitle: (title) => set({ title, dirty: true }),
  move: (index, delta) =>
    set((s) => {
      const target = index + delta;
      if (target < 0 || target >= s.stops.length) return s;
      const stops = [...s.stops];
      [stops[index], stops[target]] = [stops[target], stops[index]];
      return { stops, dirty: true };
    }),
  remove: (index) => set((s) => ({ stops: s.stops.filter((_, i) => i !== index), dirty: true })),
  replace: (index, stop) =>
    set((s) => ({ stops: s.stops.map((x, i) => (i === index ? withKey(stop) : x)), dirty: true })),
  add: (stop) => set((s) => ({ stops: [...s.stops, withKey(stop)], dirty: true })),
  reset: () => set({ title: '', stops: [], dirty: false }),
}));
