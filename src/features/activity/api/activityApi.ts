// 활동 기록(H01)과 알림(H02, H03)
import { apiRequest } from '@/lib/apiClient';
import { mockActivity } from '@/mocks/activity';
import { useAuthStore } from '@/stores/authStore';
import { isMockMode } from '@/stores/settingsStore';
import type { ActivityResponse, CommentTargetType, NotificationResponse, PageResponse } from '@/types/api';
import type { CoupleId } from '@/types/ids';
import type { ActivityItem, NotificationItem, Page } from '@/types/model';

import { activitySentence } from '../lib/activityText';

function toActivity(res: ActivityResponse): ActivityItem {
  const me = useAuthStore.getState().member?.id;
  const mine = res.actor !== null && res.actor.memberId === me;
  const actorName = res.actor?.displayName ?? null;
  return {
    id: res.activityId,
    actorName,
    mine,
    text: activitySentence(res.actionType, actorName, mine),
    targetLabel: res.targetLabel,
    accessible: res.targetAccessible,
    occurredAt: res.occurredAt,
  };
}

function hrefOf(res: NotificationResponse): NotificationItem['href'] {
  if (!res.target || !res.targetAccessible) return null;
  const { coupleId, targetId } = res.target;
  return res.target.targetType === 'SHARED_PLACE'
    ? `/couples/${coupleId}/places/${targetId}`
    : `/couples/${coupleId}/courses/${targetId}`;
}

function toNotification(res: NotificationResponse): NotificationItem {
  return {
    id: res.notificationId,
    message: res.message,
    href: hrefOf(res),
    hasTarget: res.target !== null,
    read: res.readAt !== null,
    createdAt: res.createdAt,
  };
}

const toPage = <A, B>(res: PageResponse<A>, map: (a: A) => B): Page<B> => ({
  items: res.items.map(map),
  page: res.page,
  hasNext: res.hasNext,
});

export const activityApi = {
  // H01
  async activities(
    coupleId: CoupleId,
    params: { page?: number; size?: number; targetType?: CommentTargetType; targetId?: number } = {},
  ): Promise<Page<ActivityItem>> {
    const res = isMockMode()
      ? await mockActivity.activities(coupleId, params)
      : await apiRequest<PageResponse<ActivityResponse>>(`/couples/${coupleId}/activities`, { query: { ...params } });
    return toPage(res, toActivity);
  },

  // H02
  async notifications(params: { page?: number; size?: number; unreadOnly?: boolean } = {}): Promise<Page<NotificationItem>> {
    const res = isMockMode()
      ? await mockActivity.notifications(params)
      : await apiRequest<PageResponse<NotificationResponse>>('/notifications', { query: { ...params } });
    return toPage(res, toNotification);
  },

  // H03
  async markRead(id: number): Promise<NotificationItem> {
    const res = isMockMode()
      ? await mockActivity.markRead(id, true)
      : await apiRequest<NotificationResponse>(`/notifications/${id}`, { method: 'PATCH', body: { isRead: true } });
    return toNotification(res);
  },
};
