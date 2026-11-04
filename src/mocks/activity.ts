// H01~H03 활동 기록·알림 mock (TRD 12장)
// 공유·공유 취소·삭제·공동 코스 수정·첨언·해제·재연결이 일어나면 활동을 남기고,
// 행동한 사람이 아닌 구성원에게 알림을 만든다. db만 import해서 다른 mock들이 순환 없이 부를 수 있다.
import type { ActivityActionType, ActivityResponse, NotificationResponse, PageResponse } from '@/types/api';

import { badRequest, delay, fail, nowIso, requireMemberId } from './core';
import { db, saveDb, type MockActivity } from './db';

const notFound = (): never =>
  fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });

function nameOf(id: number | null) {
  if (id === null) return null;
  return db().accounts.find((a) => a.member.memberId === id)?.member.displayName ?? '알 수 없음';
}

const VERB: Record<ActivityActionType, string> = {
  PLACE_SHARED: '장소를 공유했어요',
  PLACE_SHARE_REVOKED: '장소 공유를 취소했어요',
  PLACE_DELETED: '공유 장소를 삭제했어요',
  COURSE_SHARED: '코스를 공유했어요',
  COURSE_UPDATED: '공동 코스를 수정했어요',
  COURSE_SHARE_REVOKED: '코스 공유를 취소했어요',
  COURSE_DELETED: '공유 코스를 삭제했어요',
  COMMENT_CREATED: '말을 남겼어요',
  COUPLE_DISCONNECTED: '연결을 해제했어요',
  COUPLE_RECONNECTED: '다시 연결했어요',
};

export function activityText(type: ActivityActionType, actorName: string | null, label: string | null) {
  const who = actorName ?? '시스템';
  return label ? `${who}님이 ${VERB[type]} · ${label}` : `${who}님이 ${VERB[type]}`;
}

/** 활동을 남기고 상대에게 알림을 만든다. 다른 mock에서 부른다(저장은 부른 쪽에서). */
export function recordActivity(
  coupleId: number,
  actorId: number | null,
  actionType: ActivityActionType,
  target?: { targetType: 'SHARED_PLACE' | 'SHARED_COURSE'; targetId: number; label: string },
) {
  const store = db();
  const couple = store.couples.find((c) => c.coupleId === coupleId);
  if (!couple) return;
  const now = nowIso();
  const activity: MockActivity = {
    activityId: store.nextActivitySeq++,
    coupleId,
    actorId,
    actionType,
    targetType: target?.targetType ?? null,
    targetId: target?.targetId ?? null,
    targetLabel: target?.label ?? null,
    occurredAt: now,
  };
  store.activities.push(activity);
  for (const recipientId of couple.memberIds) {
    if (recipientId === actorId) continue;
    store.notifications.push({
      notificationId: store.nextActivitySeq++,
      recipientId,
      activityId: activity.activityId,
      type: actionType,
      message: activityText(actionType, nameOf(actorId), activity.targetLabel),
      readAt: null,
      createdAt: now,
    });
  }
}

/** 공유 기록이 아직 살아 있고 관계가 종료되지 않았는지 (지금 기준으로 다시 검사) */
function accessible(a: Pick<MockActivity, 'coupleId' | 'targetType' | 'targetId'>) {
  if (a.targetType === null || a.targetId === null) return false;
  const store = db();
  const couple = store.couples.find((c) => c.coupleId === a.coupleId);
  if (!couple || couple.status === 'CLOSED') return false;
  const list = a.targetType === 'SHARED_PLACE' ? store.sharedPlaces : store.sharedCourses;
  return list.some((s) => s.sharedId === a.targetId && s.coupleId === a.coupleId && !s.canceledAt);
}

function paginate<T>(all: T[], page = 0, size = 20): PageResponse<T> {
  return { items: all.slice(page * size, page * size + size), page, size, hasNext: (page + 1) * size < all.length };
}

export const mockActivity = {
  // H01
  async activities(
    coupleId: number,
    params: { page?: number; size?: number; targetType?: 'SHARED_PLACE' | 'SHARED_COURSE'; targetId?: number },
  ): Promise<PageResponse<ActivityResponse>> {
    await delay(200);
    const me = requireMemberId();
    const couple = db().couples.find((c) => c.coupleId === coupleId && c.memberIds.includes(me)) ?? notFound();
    if (couple.status === 'CLOSED') fail({ status: 409, title: 'Conflict', code: 'COUPLE-0409', reason: 'COUPLE_CLOSED' });
    if ((params.targetType === undefined) !== (params.targetId === undefined)) {
      badRequest('targetType', '대상 필터는 targetType과 targetId를 함께 보내야 해요.');
    }
    const all = db()
      .activities.filter(
        (a) =>
          a.coupleId === coupleId &&
          (params.targetType === undefined || (a.targetType === params.targetType && a.targetId === params.targetId)),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.activityId - a.activityId)
      .map(
        (a): ActivityResponse => ({
          activityId: a.activityId,
          coupleId: a.coupleId,
          actor: a.actorId === null ? null : { memberId: a.actorId, displayName: nameOf(a.actorId)! },
          actionType: a.actionType,
          targetType: a.targetType,
          targetId: a.targetId,
          targetLabel: a.targetLabel,
          targetAccessible: accessible(a),
          occurredAt: a.occurredAt,
        }),
      );
    return paginate(all, params.page, params.size);
  },

  // H02
  async notifications(params: { page?: number; size?: number; unreadOnly?: boolean }): Promise<PageResponse<NotificationResponse>> {
    await delay(200);
    const me = requireMemberId();
    const store = db();
    const all = store.notifications
      .filter((n) => n.recipientId === me && (!params.unreadOnly || n.readAt === null))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.notificationId - a.notificationId)
      .map((n): NotificationResponse => {
        const a = store.activities.find((x) => x.activityId === n.activityId) ?? null;
        const target =
          a && a.targetType !== null && a.targetId !== null
            ? { coupleId: a.coupleId, targetType: a.targetType, targetId: a.targetId }
            : null;
        return {
          notificationId: n.notificationId,
          type: n.type,
          message: n.message,
          activityId: n.activityId,
          target,
          targetAccessible: a ? accessible(a) : false,
          readAt: n.readAt,
          createdAt: n.createdAt,
        };
      });
    return paginate(all, params.page, params.size);
  },

  // H03: 이미 읽었으면 기존 readAt 유지
  async markRead(notificationId: number, isRead: boolean): Promise<NotificationResponse> {
    await delay(100);
    if (isRead !== true) badRequest('isRead', 'isRead는 true만 보낼 수 있어요.');
    const me = requireMemberId();
    const n = db().notifications.find((x) => x.notificationId === notificationId && x.recipientId === me) ?? notFound();
    n.readAt ??= nowIso();
    saveDb();
    const page = await this.notifications({ size: 10_000 });
    return page.items.find((x) => x.notificationId === notificationId)!;
  },
};
