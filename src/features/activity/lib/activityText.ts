import type { ActivityActionType } from '@/types/api';

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

/** 활동 한 줄 문구. 내가 한 일은 "내가", 시스템 처리는 주어 없이 */
export function activitySentence(type: ActivityActionType, actorName: string | null, mine: boolean) {
  if (mine) return `내가 ${VERB[type]}`;
  if (actorName === null) return VERB[type];
  return `${actorName}님이 ${VERB[type]}`;
}
