// N01~N05 비공개 메모, N06~N09 공동 첨언 mock (TRD 11장)
//  - 메모: 작성자만 본다. 내 개인 본문 또는 내가 볼 수 있는 공동 본문에 쓸 수 있다. GRACE에도 쓸 수 있다.
//  - 첨언: 공유 기록(sharedPlaceId·sharedCourseId)에 단다. 두 사람이 본다. GRACE는 읽기만, CLOSED·공유 취소면 404.
//  - 첨언 수정·삭제는 작성자만(403 AUTHOR_ONLY)
import type {
  CommentCreateRequest,
  CommentResponse,
  MemoCreateRequest,
  MemoResponse,
  MemoTargetType,
  PageResponse,
} from '@/types/api';

import { badRequest, delay, fail, nowIso, requireMemberId } from './core';
import { recordActivity } from './activity';
import { bodyVisibleViaShare, checkCommentTarget, memberName } from './couples';
import { db, partnerAccount, saveDb } from './db';

const MEMO_MAX = 5000;

/** 첨언 대상의 활동 기록용 라벨 */
function targetOf(targetType: 'SHARED_PLACE' | 'SHARED_COURSE', targetId: number) {
  const store = db();
  const share = (targetType === 'SHARED_PLACE' ? store.sharedPlaces : store.sharedCourses).find((s) => s.sharedId === targetId);
  const label =
    targetType === 'SHARED_PLACE'
      ? store.places.find((p) => p.placeId === share?.contentId)?.name
      : store.courses.find((c) => c.courseId === share?.contentId)?.title;
  return { targetType, targetId, label: label ?? '' };
}
const COMMENT_MAX = 2000;

const notFound = (): never =>
  fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });

function validContent(content: string, max: number) {
  if (!content || content.trim().length === 0 || content.length > max) {
    badRequest('content', `내용은 1~${max.toLocaleString()}자로 입력해 주세요.`);
  }
}

function canSeeTarget(actorId: number, type: MemoTargetType, id: number) {
  const store = db();
  const owned =
    type === 'PLACE'
      ? store.places.some((p) => p.placeId === id && p.ownerId === actorId)
      : store.courses.some((c) => c.courseId === id && c.ownerId === actorId);
  return owned || bodyVisibleViaShare(actorId, type, id);
}

function paginate<T>(all: T[], page = 0, size = 20): PageResponse<T> {
  return { items: all.slice(page * size, page * size + size), page, size, hasNext: (page + 1) * size < all.length };
}

const stripMemo = ({ authorId: _a, ...m }: MemoResponse & { authorId: number }): MemoResponse => m;
const toComment = ({ authorId, ...c }: Omit<CommentResponse, 'author'> & { authorId: number }): CommentResponse => ({
  ...c,
  author: { memberId: authorId, displayName: memberName(authorId) },
});

function myMemo(memoId: number) {
  const me = requireMemberId();
  return db().memos.find((m) => m.memoId === memoId && m.authorId === me) ?? notFound();
}

export const mockMemos = {
  // N01
  async list(targetType: MemoTargetType, targetId: number, page?: number): Promise<PageResponse<MemoResponse>> {
    await delay(200);
    const me = requireMemberId();
    if (!canSeeTarget(me, targetType, targetId)) notFound();
    const all = db()
      .memos.filter((m) => m.authorId === me && m.targetType === targetType && m.targetId === targetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.memoId - a.memoId)
      .map(stripMemo);
    return paginate(all, page);
  },
  // N02
  async create(req: MemoCreateRequest): Promise<MemoResponse> {
    await delay();
    const me = requireMemberId();
    validContent(req.content, MEMO_MAX);
    if (!canSeeTarget(me, req.targetType, req.targetId)) notFound();
    const now = nowIso();
    const memo = { ...req, content: req.content.trim(), memoId: db().nextNoteSeq++, authorId: me, createdAt: now, updatedAt: now };
    db().memos.push(memo);
    saveDb();
    return stripMemo(memo);
  },
  // N03
  async get(memoId: number): Promise<MemoResponse> {
    await delay(150);
    return stripMemo(myMemo(memoId));
  },
  // N04
  async update(memoId: number, content: string): Promise<MemoResponse> {
    await delay();
    validContent(content, MEMO_MAX);
    const memo = myMemo(memoId);
    memo.content = content.trim();
    memo.updatedAt = nowIso();
    saveDb();
    return stripMemo(memo);
  },
  // N05
  async remove(memoId: number): Promise<void> {
    await delay();
    const memo = myMemo(memoId);
    db().memos = db().memos.filter((m) => m !== memo);
    saveDb();
  },
};

function myComment(coupleId: number, commentId: number) {
  const me = requireMemberId();
  const c = db().comments.find((x) => x.commentId === commentId && x.coupleId === coupleId) ?? notFound();
  checkCommentTarget(me, coupleId, c.targetType, c.targetId, true);
  if (c.authorId !== me) fail({ status: 403, title: 'Forbidden', code: 'COMMENT-0403', reason: 'AUTHOR_ONLY' });
  return c;
}

export const mockComments = {
  // N06: 오래된 순
  async list(
    coupleId: number,
    targetType: CommentCreateRequest['targetType'],
    targetId: number,
    page?: number,
  ): Promise<PageResponse<CommentResponse>> {
    await delay(200);
    checkCommentTarget(requireMemberId(), coupleId, targetType, targetId, false);
    const all = db()
      .comments.filter((c) => c.coupleId === coupleId && c.targetType === targetType && c.targetId === targetId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.commentId - b.commentId)
      .map(toComment);
    return paginate(all, page, 50);
  },
  // N07
  async create(coupleId: number, req: CommentCreateRequest): Promise<CommentResponse> {
    await delay();
    const me = requireMemberId();
    validContent(req.content, COMMENT_MAX);
    checkCommentTarget(me, coupleId, req.targetType, req.targetId, true);
    const now = nowIso();
    const c = { ...req, content: req.content.trim(), coupleId, commentId: db().nextNoteSeq++, authorId: me, createdAt: now, updatedAt: now };
    db().comments.push(c);
    recordActivity(coupleId, me, 'COMMENT_CREATED', { ...targetOf(req.targetType, req.targetId) });
    saveDb();
    return toComment(c);
  },
  // N08
  async update(coupleId: number, commentId: number, content: string): Promise<CommentResponse> {
    await delay();
    validContent(content, COMMENT_MAX);
    const c = myComment(coupleId, commentId);
    c.content = content.trim();
    c.updatedAt = nowIso();
    saveDb();
    return toComment(c);
  },
  // N09
  async remove(coupleId: number, commentId: number): Promise<void> {
    await delay();
    const c = myComment(coupleId, commentId);
    db().comments = db().comments.filter((x) => x !== c);
    saveDb();
  },
};

/** 개발자 설정용: 상대가 가장 최근 공동 코스(없으면 공동 장소)에 첨언을 남긴다. */
export function partnerCommentOnLatest(): string {
  const me = requireMemberId();
  const partnerId = partnerAccount().member.memberId;
  const store = db();
  const couple = store.couples.find(
    (c) => c.status === 'ACTIVE' && c.memberIds.includes(me) && c.memberIds.includes(partnerId),
  );
  if (!couple) return '상대와 연결된 상태에서만 할 수 있어요.';
  const latest = (list: typeof store.sharedPlaces) =>
    list.filter((s) => s.coupleId === couple.coupleId && !s.canceledAt).sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))[0];
  const course = latest(store.sharedCourses);
  const place = latest(store.sharedPlaces);
  const target = course
    ? { targetType: 'SHARED_COURSE' as const, targetId: course.sharedId }
    : place
      ? { targetType: 'SHARED_PLACE' as const, targetId: place.sharedId }
      : null;
  if (!target) return '공유된 장소나 코스가 없어요. 먼저 하나 공유해 주세요.';
  const now = nowIso();
  recordActivity(couple.coupleId, partnerId, 'COMMENT_CREATED', targetOf(target.targetType, target.targetId));
  store.comments.push({
    coupleId: couple.coupleId,
    ...target,
    content: '여기 좋다! 이 순서로 가자',
    commentId: store.nextNoteSeq++,
    authorId: partnerId,
    createdAt: now,
    updatedAt: now,
  });
  saveDb();
  return `상대가 최근 공동 ${target.targetType === 'SHARED_COURSE' ? '코스' : '장소'}에 첨언을 남겼어요.`;
}
