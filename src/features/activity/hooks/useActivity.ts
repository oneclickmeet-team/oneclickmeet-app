import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CommentTargetType } from '@/types/api';
import type { CoupleId } from '@/types/ids';

import { activityApi } from '../api/activityApi';

// queryKey는 설계서 8장: ['notifications', { unreadOnly }], ['couples', coupleId, 'activities']
export const activityKeys = {
  notifications: ['notifications'] as const,
  list: (unreadOnly: boolean) => ['notifications', { unreadOnly }] as const,
  activities: (coupleId: CoupleId, target?: { type: CommentTargetType; id: number }) =>
    ['couples', coupleId, 'activities', target ?? 'all'] as const,
};

const UNREAD_PAGE = 20;

/** 읽지 않은 알림 수. 전체 건수 API가 없어서 첫 페이지 기준으로 "20+"까지만 센다(TRD 2.2). */
export function useUnreadCount(enabled = true) {
  const q = useQuery({
    queryKey: activityKeys.list(true),
    queryFn: () => activityApi.notifications({ unreadOnly: true, size: UNREAD_PAGE }),
    enabled,
    // 푸시(FCM)가 붙기 전까지는 화면이 떠 있는 동안 30초마다 확인한다.
    refetchInterval: 30_000,
  });
  const count = q.data?.items.length ?? 0;
  return { count, label: q.data?.hasNext ? `${UNREAD_PAGE}+` : String(count) };
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: activityKeys.list(false),
    queryFn: ({ pageParam }) => activityApi.notifications({ page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => activityApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityKeys.notifications }),
  });
}

export function useActivities(coupleId: CoupleId | null, target?: { type: CommentTargetType; id: number }, size = 10) {
  return useQuery({
    queryKey: activityKeys.activities(coupleId ?? (0 as CoupleId), target),
    queryFn: () =>
      activityApi.activities(coupleId!, {
        size,
        ...(target ? { targetType: target.type, targetId: target.id } : {}),
      }),
    enabled: coupleId !== null,
  });
}
