import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CourseEditRequest, UnshareScope } from '@/types/api';
import type { CoupleId, CourseId, PlaceId, SharedCourseId, SharedPlaceId } from '@/types/ids';

import { coupleApi, sharedApi } from '../api/coupleApi';

// queryKey는 설계서 8장: ['couples', ...], ['couple', id], ['couples', coupleId, 'places'|'courses', ...]
export const coupleKeys = {
  all: ['couples'] as const,
  list: ['couples', { status: 'ACTIVE,GRACE' }] as const,
  sharedPlaces: (coupleId: CoupleId) => ['couples', coupleId, 'places'] as const,
  sharedPlace: (coupleId: CoupleId, id: SharedPlaceId) => ['couples', coupleId, 'place', id] as const,
  sharedCourses: (coupleId: CoupleId) => ['couples', coupleId, 'courses'] as const,
  sharedCourse: (coupleId: CoupleId, id: SharedCourseId) => ['couples', coupleId, 'course', id] as const,
};

/** 관계 상태가 바뀌면 개인·공동 목록과 내 정보를 모두 다시 불러온다(TRD 5.2). */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: coupleKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['places'] }),
      queryClient.invalidateQueries({ queryKey: ['place'] }),
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
      queryClient.invalidateQueries({ queryKey: ['course'] }),
    ]);
}

export function useCouples() {
  return useQuery({ queryKey: coupleKeys.list, queryFn: () => coupleApi.list() });
}

/** 지금 관계: ACTIVE가 있으면 그것, 없으면 GRACE, 둘 다 없으면 null */
export function useCurrentCouple() {
  const q = useCouples();
  const couples = q.data ?? [];
  const current = couples.find((c) => c.status === 'ACTIVE') ?? couples.find((c) => c.status === 'GRACE') ?? null;
  return { ...q, couple: current };
}

export function useInvite() {
  return useMutation({
    mutationFn: ({ purpose, coupleId }: { purpose: 'CONNECT' | 'RECONNECT'; coupleId?: CoupleId }) =>
      coupleApi.invite(purpose, coupleId),
  });
}

export function useAcceptInvite() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (code: string) => coupleApi.accept(code), onSuccess: refresh });
}

export function useDisconnect() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: CoupleId) => coupleApi.disconnect(id), onSuccess: refresh });
}

export function useReconnect() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, code }: { id: CoupleId; code: string }) => coupleApi.reconnect(id, code),
    onSuccess: refresh,
  });
}

// ---- 공동 장소·코스
export function useSharedPlaces(coupleId: CoupleId | null) {
  return useInfiniteQuery({
    queryKey: coupleKeys.sharedPlaces(coupleId ?? (0 as CoupleId)),
    queryFn: ({ pageParam }) => sharedApi.places(coupleId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: coupleId !== null,
  });
}

export function useSharedPlace(coupleId: CoupleId | null, id: SharedPlaceId | null) {
  return useQuery({
    queryKey: coupleKeys.sharedPlace(coupleId ?? (0 as CoupleId), id ?? (0 as SharedPlaceId)),
    queryFn: () => sharedApi.place(coupleId!, id!),
    enabled: coupleId !== null && id !== null,
  });
}

export function useSharedCourses(coupleId: CoupleId | null) {
  return useInfiniteQuery({
    queryKey: coupleKeys.sharedCourses(coupleId ?? (0 as CoupleId)),
    queryFn: ({ pageParam }) => sharedApi.courses(coupleId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: coupleId !== null,
  });
}

export function useSharedCourse(coupleId: CoupleId | null, id: SharedCourseId | null) {
  return useQuery({
    queryKey: coupleKeys.sharedCourse(coupleId ?? (0 as CoupleId), id ?? (0 as SharedCourseId)),
    queryFn: () => sharedApi.course(coupleId!, id!),
    enabled: coupleId !== null && id !== null,
  });
}

export function useSharePlace() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ coupleId, placeId }: { coupleId: CoupleId; placeId: PlaceId }) =>
      sharedApi.sharePlace(coupleId, placeId),
    onSuccess: refresh,
  });
}

export function useShareCourse() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ coupleId, courseId }: { coupleId: CoupleId; courseId: CourseId }) =>
      sharedApi.shareCourse(coupleId, courseId),
    onSuccess: refresh,
  });
}

export function useUnsharePlace() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ coupleId, id, scope }: { coupleId: CoupleId; id: SharedPlaceId; scope: UnshareScope }) =>
      sharedApi.unsharePlace(coupleId, id, scope),
    onSuccess: refresh,
  });
}

export function useUnshareCourse() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ coupleId, id, scope }: { coupleId: CoupleId; id: SharedCourseId; scope: UnshareScope }) =>
      sharedApi.unshareCourse(coupleId, id, scope),
    onSuccess: refresh,
  });
}

export function useEditSharedCourse(coupleId: CoupleId, id: SharedCourseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CourseEditRequest) => sharedApi.editCourse(coupleId, id, req),
    onSuccess: (shared) => {
      queryClient.setQueryData(coupleKeys.sharedCourse(coupleId, id), shared);
      void queryClient.invalidateQueries({ queryKey: coupleKeys.sharedCourses(coupleId) });
      // 공유한 사람의 개인 코스에도 반영되므로 개인 목록도 다시 불러온다.
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['course'] });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: coupleKeys.sharedCourse(coupleId, id) }),
  });
}
