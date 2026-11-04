// C01~C06(커플 연결·해제·재연결), S01~S09(장소·코스 공유) mock.
// 규칙은 TRD 5장·10장을 따른다. 사본 이전은 단순화했다:
//  - 해제(C05): 공유된 본문의 원래 주인에게 개인본을 만들어 주고, 공동 본문은 주인 없는 고정본이 된다.
//  - 최종 종료(유예 만료·새 연결): 아직 개인본이 없는 구성원에게도 사본을 만든다.
import type {
  CourseEditRequest,
  CoupleResponse,
  CoupleStatus,
  DisconnectionResponse,
  InvitationRequest,
  InvitationResponse,
  SharedCourseResponse,
  SharedPageResponse,
  SharedPlaceResponse,
  UnshareScope,
} from '@/types/api';

import { badRequest, delay, fail, nowIso, requireMemberId } from './core';
import { recordActivity } from './activity';
import { applyCourseEdit, toCourseResponse } from './courses';
import { db, partnerAccount, saveDb, type MockCouple, type MockShared } from './db';
import { toPlaceResponse } from './places';

const GRACE_DAYS = 30;
const INVITE_HOURS = 24;

const conflict = (code: string, reason: string): never =>
  fail({ status: 409, title: 'Conflict', code, reason });
const notFound = (): never =>
  fail({ status: 404, title: 'Not Found', code: 'COMMON-0404', reason: 'RESOURCE_NOT_FOUND' });

const nextShareId = () => db().nextShareSeq++;
const nextCourseId = () => db().nextCourseSeq++;

function memberName(id: number) {
  return db().accounts.find((a) => a.member.memberId === id)?.member.displayName ?? '알 수 없음';
}

function setCurrentCouple(memberIds: number[], coupleId: number | null) {
  for (const a of db().accounts) {
    if (memberIds.includes(a.member.memberId)) a.member.currentCoupleId = coupleId;
  }
}

// ---------------------------------------------------------------- 사본
/** 본문이 개인본으로 분리될 때 그 사람의 메모를 개인본으로 옮긴다(TRD 5.3-1, 11.1). */
function moveMemos(memberId: number, kind: 'PLACE' | 'COURSE', fromId: number, toId: number) {
  for (const m of db().memos) {
    if (m.authorId === memberId && m.targetType === kind && m.targetId === fromId) m.targetId = toId;
  }
}

function placeCopyOf(memberId: number, sharedId: number) {
  return db().places.find((p) => p.ownerId === memberId && p.sourceSharedPlaceId === sharedId);
}
function courseCopyOf(memberId: number, sharedId: number) {
  return db().courses.find((c) => c.ownerId === memberId && c.sourceSharedCourseId === sharedId);
}
function hasPlaceCopy(memberId: number, sharedId: number) {
  return db().places.some((p) => p.ownerId === memberId && p.sourceSharedPlaceId === sharedId);
}
function hasCourseCopy(memberId: number, sharedId: number) {
  return db().courses.some((c) => c.ownerId === memberId && c.sourceSharedCourseId === sharedId);
}

function copyPlace(share: MockShared, ownerId: number) {
  const store = db();
  const src = store.places.find((p) => p.placeId === share.contentId);
  if (!src) return null;
  const now = nowIso();
  const copy = {
    ...JSON.parse(JSON.stringify(src)),
    placeId: store.nextPlaceId++,
    ownerId,
    sharedPlaceId: null,
    sourceSharedPlaceId: share.sharedId,
    createdAt: now,
    updatedAt: now,
  };
  store.places.push(copy);
  moveMemos(ownerId, 'PLACE', src.placeId, copy.placeId);
  return { previous: src.placeId, copy: copy.placeId as number };
}

function copyCourse(share: MockShared, ownerId: number) {
  const store = db();
  const src = store.courses.find((c) => c.courseId === share.contentId);
  if (!src) return null;
  const now = nowIso();
  const copy = JSON.parse(JSON.stringify(src));
  copy.courseId = nextCourseId();
  copy.ownerId = ownerId;
  copy.sharedCourseId = null;
  copy.sourceSharedCourseId = share.sharedId;
  copy.createdAt = now;
  copy.updatedAt = now;
  // 코스 내 장소·항목 ID도 새로 발급한다(TRD 5.2)
  for (const p of copy.places) {
    p.coursePlaceId = nextCourseId();
    for (const it of p.items) it.courseItemId = nextCourseId();
  }
  store.courses.push(copy);
  moveMemos(ownerId, 'COURSE', src.courseId, copy.courseId);
  return { previous: src.courseId, copy: copy.courseId as number };
}

function activeShares(coupleId: number) {
  const store = db();
  return {
    places: store.sharedPlaces.filter((s) => s.coupleId === coupleId && !s.canceledAt),
    courses: store.sharedCourses.filter((s) => s.coupleId === coupleId && !s.canceledAt),
  };
}

/** 최종 종료: 개인본이 없는 구성원에게 사본을 주고 CLOSED로 바꾼다. */
function closeCouple(couple: MockCouple) {
  if (couple.status === 'CLOSED') return;
  const { places, courses } = activeShares(couple.coupleId);
  for (const m of couple.memberIds) {
    for (const s of places) {
      if (!hasPlaceCopy(m, s.sharedId)) copyPlace(s, m);
      // 유예 중에 공동 본문에 쓴 메모도 내 사본으로 옮긴다.
      else moveMemos(m, 'PLACE', s.contentId, placeCopyOf(m, s.sharedId)!.placeId);
    }
    for (const s of courses) {
      if (!hasCourseCopy(m, s.sharedId)) copyCourse(s, m);
      else moveMemos(m, 'COURSE', s.contentId, courseCopyOf(m, s.sharedId)!.courseId);
    }
  }
  couple.status = 'CLOSED';
  couple.closedAt = nowIso();
}

/** 유예 기간이 지난 관계는 조회 시점에 종료 처리한다(스케줄러가 늦어도 막히게). */
function expireGrace() {
  const now = Date.now();
  for (const c of db().couples) {
    if (c.status === 'GRACE' && c.graceExpiresAt && Date.parse(c.graceExpiresAt) <= now) closeCouple(c);
  }
}

// ---------------------------------------------------------------- 응답 변환
function toCouple(c: MockCouple): CoupleResponse {
  const now = Date.now();
  return {
    coupleId: c.coupleId,
    status: c.status,
    members: c.memberIds.map((id) => ({ memberId: id, displayName: memberName(id) })),
    disconnectedAt: c.disconnectedAt,
    graceExpiresAt: c.graceExpiresAt,
    closedAt: c.closedAt,
    readOnly: c.status !== 'ACTIVE',
    canReconnect: c.status === 'GRACE' && !!c.graceExpiresAt && now < Date.parse(c.graceExpiresAt),
    serverTime: new Date(now).toISOString(),
  };
}

function myCouple(actorId: number, coupleId: number) {
  expireGrace();
  const c = db().couples.find((x) => x.coupleId === coupleId && x.memberIds.includes(actorId));
  return c ?? notFound();
}

function activeCoupleOf(memberId: number) {
  return db().couples.find((c) => c.status === 'ACTIVE' && c.memberIds.includes(memberId));
}

// ---------------------------------------------------------------- C01~C06 (actorId로 동작)
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function issueInvitation(actorId: number, req: InvitationRequest): InvitationResponse {
  expireGrace();
  if (req.purpose === 'CONNECT') {
    if (activeCoupleOf(actorId)) conflict('COUPLE-0409', 'ACTIVE_COUPLE_EXISTS');
  } else {
    const c = myCouple(actorId, req.coupleId ?? -1);
    if (c.status !== 'GRACE') conflict('COUPLE-0409', 'NOT_IN_GRACE');
  }
  const inv = {
    code: makeCode(),
    purpose: req.purpose,
    coupleId: req.purpose === 'RECONNECT' ? req.coupleId! : null,
    issuerId: actorId,
    expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000).toISOString(),
    usedAt: null,
  };
  db().invitations.push(inv);
  saveDb();
  return { invitationCode: inv.code, purpose: inv.purpose, coupleId: inv.coupleId, expiresAt: inv.expiresAt };
}

function findInvitation(code: string) {
  const inv = db().invitations.find((i) => i.code === code.trim().toUpperCase());
  if (!inv || Date.parse(inv.expiresAt) <= Date.now()) {
    fail({ status: 400, title: 'Bad Request', code: 'COUPLE-0400', reason: 'INVALID_INVITATION' });
  }
  return inv;
}

function acceptConnect(actorId: number, code: string): CoupleResponse {
  expireGrace();
  const inv = findInvitation(code);
  if (inv.purpose !== 'CONNECT') badRequest('invitationCode', '재연결용 코드예요. 재연결 화면에서 입력해 주세요.');
  if (inv.issuerId === actorId) conflict('COUPLE-0409', 'OWN_INVITATION');
  if (inv.usedAt) conflict('COUPLE-0409', 'INVITATION_USED');
  if (activeCoupleOf(actorId) || activeCoupleOf(inv.issuerId)) conflict('COUPLE-0409', 'ACTIVE_COUPLE_EXISTS');
  const pair = [inv.issuerId, actorId];
  const store = db();
  const sameGrace = store.couples.find(
    (c) => c.status === 'GRACE' && pair.every((m) => c.memberIds.includes(m)),
  );
  if (sameGrace) conflict('COUPLE-0409', 'RECONNECT_REQUIRED');
  // 새 연결이 성립하면 두 사람의 이전 GRACE 관계를 최종 종료한다.
  for (const c of store.couples) {
    if (c.status === 'GRACE' && c.memberIds.some((m) => pair.includes(m))) closeCouple(c);
  }
  const couple: MockCouple = {
    coupleId: nextShareId(),
    status: 'ACTIVE',
    memberIds: [inv.issuerId, actorId],
    connectedAt: nowIso(),
    disconnectedAt: null,
    graceExpiresAt: null,
    closedAt: null,
  };
  store.couples.push(couple);
  inv.usedAt = nowIso();
  setCurrentCouple(pair, couple.coupleId);
  saveDb();
  return toCouple(couple);
}

function disconnect(actorId: number, coupleId: number): DisconnectionResponse {
  const couple = myCouple(actorId, coupleId);
  if (couple.status !== 'ACTIVE') conflict('COUPLE-0409', 'NOT_ACTIVE');
  const store = db();
  const copies: DisconnectionResponse['personalCopies'] = [];
  const { places, courses } = activeShares(coupleId);
  // 공유된 본문의 원래 주인은 분리된 개인본을 받고, 공동 본문은 고정된다.
  for (const s of places) {
    const body = store.places.find((p) => p.placeId === s.contentId);
    if (!body || body.ownerId === null) continue;
    const owner = body.ownerId;
    const made = copyPlace(s, owner);
    body.ownerId = null;
    if (made && owner === actorId) {
      copies.push({ targetType: 'PLACE', sourceSharedId: s.sharedId, previousContentId: made.previous, personalContentId: made.copy });
    }
  }
  for (const s of courses) {
    const body = store.courses.find((c) => c.courseId === s.contentId);
    if (!body || body.ownerId === null) continue;
    const owner = body.ownerId;
    const made = copyCourse(s, owner);
    body.ownerId = null;
    if (made && owner === actorId) {
      copies.push({ targetType: 'COURSE', sourceSharedId: s.sharedId, previousContentId: made.previous, personalContentId: made.copy });
    }
  }
  couple.status = 'GRACE';
  couple.disconnectedAt = nowIso();
  recordActivity(couple.coupleId, actorId, 'COUPLE_DISCONNECTED');
  couple.graceExpiresAt = new Date(Date.now() + GRACE_DAYS * 86400_000).toISOString();
  setCurrentCouple(couple.memberIds, null);
  saveDb();
  return { couple: toCouple(couple), personalCopies: copies, reloadPersonalLibrary: true };
}

function reconnect(actorId: number, coupleId: number, code: string): CoupleResponse {
  const couple = myCouple(actorId, coupleId);
  const inv = findInvitation(code);
  if (inv.purpose !== 'RECONNECT' || inv.coupleId !== coupleId) {
    badRequest('invitationCode', '이 관계의 재연결 코드가 아니에요.');
  }
  if (inv.issuerId === actorId) conflict('COUPLE-0409', 'OWN_INVITATION');
  if (inv.usedAt) conflict('COUPLE-0409', 'INVITATION_USED');
  if (couple.status !== 'GRACE' || !couple.graceExpiresAt || Date.parse(couple.graceExpiresAt) <= Date.now()) {
    conflict('COUPLE-0409', 'COUPLE_CLOSED');
  }
  if (couple.memberIds.some((m) => activeCoupleOf(m))) conflict('COUPLE-0409', 'ACTIVE_COUPLE_EXISTS');
  couple.status = 'ACTIVE';
  couple.disconnectedAt = null;
  couple.graceExpiresAt = null;
  inv.usedAt = nowIso();
  setCurrentCouple(couple.memberIds, couple.coupleId);
  recordActivity(couple.coupleId, actorId, 'COUPLE_RECONNECTED');
  saveDb();
  return toCouple(couple);
}

// ---------------------------------------------------------------- 공유 (S01~S09)
function sharedMeta(couple: MockCouple) {
  return {
    coupleId: couple.coupleId,
    relationshipStatus: couple.status as CoupleStatus,
    readOnly: couple.status !== 'ACTIVE',
    graceExpiresAt: couple.graceExpiresAt,
  };
}

function readableCouple(actorId: number, coupleId: number) {
  const couple = myCouple(actorId, coupleId);
  if (couple.status === 'CLOSED') conflict('COUPLE-0409', 'COUPLE_CLOSED');
  return couple;
}

function writableCouple(actorId: number, coupleId: number) {
  const couple = readableCouple(actorId, coupleId);
  if (couple.status !== 'ACTIVE') conflict('COUPLE-0409', 'SHARED_READ_ONLY');
  return couple;
}

function toSharedPlace(s: MockShared, couple: MockCouple): SharedPlaceResponse {
  const place = db().places.find((p) => p.placeId === s.contentId) ?? notFound();
  return {
    sharedPlaceId: s.sharedId,
    sharedByMemberId: s.sharedByMemberId,
    sharedAt: s.sharedAt,
    ...sharedMeta(couple),
    place: { ...toPlaceResponse(place), sharedPlaceId: s.sharedId },
  };
}

function toSharedCourse(s: MockShared, couple: MockCouple): SharedCourseResponse {
  const course = db().courses.find((c) => c.courseId === s.contentId) ?? notFound();
  return {
    sharedCourseId: s.sharedId,
    sharedByMemberId: s.sharedByMemberId,
    sharedAt: s.sharedAt,
    ...sharedMeta(couple),
    course: { ...toCourseResponse(course), sharedCourseId: s.sharedId },
  };
}

function page<T>(all: T[], couple: MockCouple, p = 0, size = 20): SharedPageResponse<T> {
  return {
    items: all.slice(p * size, p * size + size),
    page: p,
    size,
    hasNext: (p + 1) * size < all.length,
    ...sharedMeta(couple),
  };
}

function sharePlace(actorId: number, coupleId: number, placeId: number): SharedPlaceResponse {
  const couple = writableCouple(actorId, coupleId);
  const place = db().places.find((p) => p.placeId === placeId && p.ownerId === actorId) ?? notFound();
  if (place.sharedPlaceId !== null) conflict('SHARE-0409', 'ALREADY_SHARED');
  const s: MockShared = {
    sharedId: nextShareId(),
    coupleId,
    contentId: placeId,
    sharedByMemberId: actorId,
    sharedAt: nowIso(),
    canceledAt: null,
  };
  db().sharedPlaces.push(s);
  place.sharedPlaceId = s.sharedId;
  recordActivity(coupleId, actorId, 'PLACE_SHARED', { targetType: 'SHARED_PLACE', targetId: s.sharedId, label: place.name });
  saveDb();
  return toSharedPlace(s, couple);
}

function shareCourse(actorId: number, coupleId: number, courseId: number): SharedCourseResponse {
  const couple = writableCouple(actorId, coupleId);
  const course = db().courses.find((c) => c.courseId === courseId && c.ownerId === actorId) ?? notFound();
  if (course.sharedCourseId !== null) conflict('SHARE-0409', 'ALREADY_SHARED');
  const s: MockShared = {
    sharedId: nextShareId(),
    coupleId,
    contentId: courseId,
    sharedByMemberId: actorId,
    sharedAt: nowIso(),
    canceledAt: null,
  };
  db().sharedCourses.push(s);
  course.sharedCourseId = s.sharedId;
  recordActivity(coupleId, actorId, 'COURSE_SHARED', { targetType: 'SHARED_COURSE', targetId: s.sharedId, label: course.title });
  saveDb();
  return toSharedCourse(s, couple);
}

function findShare(list: MockShared[], coupleId: number, sharedId: number) {
  return list.find((s) => s.sharedId === sharedId && s.coupleId === coupleId && !s.canceledAt) ?? notFound();
}

// ---------------------------------------------------------------- 앱이 부르는 mock API
export const mockCouples = {
  // C01
  async list(status?: CoupleStatus[]): Promise<{ items: CoupleResponse[] }> {
    await delay(200);
    const me = requireMemberId();
    expireGrace();
    const wanted = status?.length ? status : ['ACTIVE', 'GRACE'];
    const items = db()
      .couples.filter((c) => c.memberIds.includes(me) && wanted.includes(c.status))
      .map(toCouple);
    saveDb();
    return { items };
  },
  // C02
  async invite(req: InvitationRequest): Promise<InvitationResponse> {
    await delay();
    return issueInvitation(requireMemberId(), req);
  },
  // C03
  async accept(invitationCode: string): Promise<CoupleResponse> {
    await delay();
    return acceptConnect(requireMemberId(), invitationCode);
  },
  // C04
  async get(coupleId: number): Promise<CoupleResponse> {
    await delay(200);
    return toCouple(myCouple(requireMemberId(), coupleId));
  },
  // C05
  async disconnect(coupleId: number): Promise<DisconnectionResponse> {
    await delay();
    return disconnect(requireMemberId(), coupleId);
  },
  // C06
  async reconnect(coupleId: number, invitationCode: string): Promise<CoupleResponse> {
    await delay();
    return reconnect(requireMemberId(), coupleId, invitationCode);
  },
};

export const mockShared = {
  // S01
  async places(coupleId: number, p?: number, size?: number): Promise<SharedPageResponse<SharedPlaceResponse>> {
    await delay(300);
    const couple = readableCouple(requireMemberId(), coupleId);
    const all = db()
      .sharedPlaces.filter((s) => s.coupleId === coupleId && !s.canceledAt)
      .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
      .map((s) => toSharedPlace(s, couple));
    return page(all, couple, p, size);
  },
  // S02
  async sharePlace(coupleId: number, placeId: number): Promise<SharedPlaceResponse> {
    await delay();
    return sharePlace(requireMemberId(), coupleId, placeId);
  },
  // S03
  async place(coupleId: number, sharedPlaceId: number): Promise<SharedPlaceResponse> {
    await delay(200);
    const couple = readableCouple(requireMemberId(), coupleId);
    return toSharedPlace(findShare(db().sharedPlaces, coupleId, sharedPlaceId), couple);
  },
  // S04
  async unsharePlace(coupleId: number, sharedPlaceId: number, scope: UnshareScope): Promise<void> {
    await delay();
    const me = requireMemberId();
    writableCouple(me, coupleId);
    const s = findShare(db().sharedPlaces, coupleId, sharedPlaceId);
    s.canceledAt = nowIso();
    const store = db();
    const body = store.places.find((p) => p.placeId === s.contentId);
    recordActivity(coupleId, me, scope === 'PERSONAL_AND_SHARED' ? 'PLACE_DELETED' : 'PLACE_SHARE_REVOKED', {
      targetType: 'SHARED_PLACE',
      targetId: sharedPlaceId,
      label: body?.name ?? '장소',
    });
    if (body) {
      body.sharedPlaceId = null;
      if (scope === 'PERSONAL_AND_SHARED' || body.ownerId === null) {
        store.places = store.places.filter((p) => p !== body);
      }
    }
    saveDb();
  },
  // S05
  async courses(coupleId: number, p?: number, size?: number): Promise<SharedPageResponse<SharedCourseResponse>> {
    await delay(300);
    const couple = readableCouple(requireMemberId(), coupleId);
    const all = db()
      .sharedCourses.filter((s) => s.coupleId === coupleId && !s.canceledAt)
      .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
      .map((s) => toSharedCourse(s, couple));
    return page(all, couple, p, size);
  },
  // S06
  async shareCourse(coupleId: number, courseId: number): Promise<SharedCourseResponse> {
    await delay();
    return shareCourse(requireMemberId(), coupleId, courseId);
  },
  // S07
  async course(coupleId: number, sharedCourseId: number): Promise<SharedCourseResponse> {
    await delay(200);
    const couple = readableCouple(requireMemberId(), coupleId);
    return toSharedCourse(findShare(db().sharedCourses, coupleId, sharedCourseId), couple);
  },
  // S08: 두 사람 모두 공동 코스를 편집할 수 있다(ACTIVE일 때만)
  async editCourse(coupleId: number, sharedCourseId: number, req: CourseEditRequest): Promise<SharedCourseResponse> {
    await delay();
    const me = requireMemberId();
    const couple = writableCouple(me, coupleId);
    const s = findShare(db().sharedCourses, coupleId, sharedCourseId);
    const course = db().courses.find((c) => c.courseId === s.contentId) ?? notFound();
    applyCourseEdit(course, req);
    recordActivity(coupleId, me, 'COURSE_UPDATED', { targetType: 'SHARED_COURSE', targetId: sharedCourseId, label: course.title });
    saveDb();
    return toSharedCourse(s, couple);
  },
  // S09
  async unshareCourse(coupleId: number, sharedCourseId: number, scope: UnshareScope): Promise<void> {
    await delay();
    const me = requireMemberId();
    writableCouple(me, coupleId);
    const s = findShare(db().sharedCourses, coupleId, sharedCourseId);
    s.canceledAt = nowIso();
    const store = db();
    const body = store.courses.find((c) => c.courseId === s.contentId);
    recordActivity(coupleId, me, scope === 'PERSONAL_AND_SHARED' ? 'COURSE_DELETED' : 'COURSE_SHARE_REVOKED', {
      targetType: 'SHARED_COURSE',
      targetId: sharedCourseId,
      label: body?.title ?? '코스',
    });
    if (body) {
      body.sharedCourseId = null;
      if (scope === 'PERSONAL_AND_SHARED' || body.ownerId === null) {
        store.courses = store.courses.filter((c) => c !== body);
      }
    }
    saveDb();
  },
};

// ---------------------------------------------------------------- 개발자 설정용: 상대 역할 흉내
// mock에는 상대방이 없으니, 상대 계정(partner@oneclickmeet.app)이 할 행동을 버튼으로 대신한다.
export const mockPartner = {
  /** 내가 만든 가장 최근 초대 코드를 상대가 수락한다. */
  acceptMyInvitation(): string {
    const me = requireMemberId();
    const partner = partnerAccount().member.memberId;
    const inv = [...db().invitations]
      .reverse()
      .find((i) => i.issuerId === me && !i.usedAt && Date.parse(i.expiresAt) > Date.now());
    if (!inv) return '수락할 초대 코드가 없어요. 커플 화면에서 먼저 코드를 만들어 주세요.';
    if (inv.purpose === 'CONNECT') acceptConnect(partner, inv.code);
    else reconnect(partner, inv.coupleId!, inv.code);
    return '상대가 초대를 수락했어요.';
  },
  /** 상대가 초대 코드를 만든다. 지금 관계가 GRACE면 재연결 코드를 만든다. */
  issueInvitation(): string {
    const me = requireMemberId();
    const partner = partnerAccount().member.memberId;
    expireGrace();
    const grace = db().couples.find(
      (c) => c.status === 'GRACE' && c.memberIds.includes(me) && c.memberIds.includes(partner),
    );
    const res = grace
      ? issueInvitation(partner, { purpose: 'RECONNECT', coupleId: grace.coupleId })
      : issueInvitation(partner, { purpose: 'CONNECT' });
    return `상대 코드: ${res.invitationCode} (${res.purpose === 'RECONNECT' ? '재연결용' : '연결용'})`;
  },
  /** 상대가 장소 하나를 저장해서 공유한다. */
  sharePlace(): string {
    const me = requireMemberId();
    const partner = partnerAccount().member.memberId;
    const couple = activeCoupleOf(me);
    if (!couple || !couple.memberIds.includes(partner)) return '상대와 연결된 상태에서만 할 수 있어요.';
    const store = db();
    const now = nowIso();
    const place = {
      placeId: store.nextPlaceId++,
      ownerId: partner,
      name: `상대가 찜한 카페 ${store.nextPlaceId}`,
      address: '서울 (가상 주소) 한성대입구역',
      latitude: 37.5889,
      longitude: 127.0071,
      sourceUrl: null,
      sharedPlaceId: null,
      sourceSharedPlaceId: null,
      createdAt: now,
      updatedAt: now,
      categoryCode: 'CAFE' as const,
    };
    store.places.push(place);
    sharePlace(partner, couple.coupleId, place.placeId);
    return `상대가 "${place.name}"을 공유했어요.`;
  },
  /** 유예 기간을 바로 끝낸다(30일 기다리지 않고 종료 확인용). */
  expireGrace(): string {
    const me = requireMemberId();
    const grace = db().couples.filter((c) => c.status === 'GRACE' && c.memberIds.includes(me));
    if (grace.length === 0) return '유예 중인 관계가 없어요.';
    for (const c of grace) closeCouple(c);
    saveDb();
    return '유예 기간을 끝냈어요. 관계가 종료되고 개인 사본이 만들어졌어요.';
  },
};


// ---------------------------------------------------------------- 메모·첨언 mock이 쓰는 권한 확인
/** 개인 본문이 아니어도, 내가 속한 ACTIVE·GRACE 관계의 공유 대상이면 볼 수 있다. */
export function bodyVisibleViaShare(actorId: number, kind: 'PLACE' | 'COURSE', contentId: number): boolean {
  expireGrace();
  const store = db();
  const list = kind === 'PLACE' ? store.sharedPlaces : store.sharedCourses;
  return list.some((s) => {
    if (s.contentId !== contentId || s.canceledAt) return false;
    const c = store.couples.find((x) => x.coupleId === s.coupleId);
    return !!c && c.status !== 'CLOSED' && c.memberIds.includes(actorId);
  });
}

/** 첨언 대상(공유 기록) 확인. write면 ACTIVE여야 한다. 종료·취소된 대상은 404. */
export function checkCommentTarget(
  actorId: number,
  coupleId: number,
  targetType: 'SHARED_PLACE' | 'SHARED_COURSE',
  targetId: number,
  write: boolean,
) {
  const couple = myCouple(actorId, coupleId);
  if (couple.status === 'CLOSED') notFound();
  const list = targetType === 'SHARED_PLACE' ? db().sharedPlaces : db().sharedCourses;
  findShare(list, coupleId, targetId);
  if (write && couple.status !== 'ACTIVE') conflict('COUPLE-0409', 'SHARED_READ_ONLY');
  return couple;
}

export { memberName };
