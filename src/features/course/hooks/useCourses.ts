import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CourseCreateRequest, RecommendationRequest } from '@/types/api';
import type { CourseId } from '@/types/ids';

import { courseApi } from '../api/courseApi';

export const courseKeys = {
  all: ['courses'] as const,
  list: (query?: string) => ['courses', { query: query ?? '' }] as const,
  detail: (id: CourseId) => ['course', id] as const,
};

// R01은 POST지만 저장 부작용이 없는 분석 호출이라 mutation으로 부른다(설계서 8장).
export function useRecommend() {
  return useMutation({ mutationFn: (req: RecommendationRequest) => courseApi.recommend(req) });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CourseCreateRequest) => courseApi.create(req),
    onSuccess: (course) => {
      queryClient.setQueryData(courseKeys.detail(course.id), course);
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export function useCourseList(query?: string) {
  return useInfiniteQuery({
    queryKey: courseKeys.list(query),
    queryFn: ({ pageParam }) => courseApi.list({ page: pageParam, query: query || undefined }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
}

export function useCourse(id: CourseId | null) {
  return useQuery({
    queryKey: courseKeys.detail(id ?? (0 as CourseId)),
    queryFn: () => courseApi.get(id!),
    enabled: id !== null,
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: CourseId) => courseApi.remove(id),
    onSuccess: (_d, id) => {
      queryClient.removeQueries({ queryKey: courseKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}
