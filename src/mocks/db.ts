// mock 서버의 저장소. 앱 문서 폴더에 JSON으로 저장해서 앱을 껐다 켜도 남는다.
// 개발자 설정의 "mock 데이터 초기화"로 지운다.
import { File, Paths } from 'expo-file-system';

import type {
  CategoryCode,
  CommentResponse,
  CourseResponse,
  MemberResponse,
  MemoResponse,
  PlaceResponse,
} from '@/types/api';

export interface MockAccount {
  email: string;
  password: string;
  member: MemberResponse;
}

export interface MockPlace extends PlaceResponse {
  /** null이면 개인 소유자가 없는 공동 본문(해제 후 고정된 공동본) */
  ownerId: number | null;
  /** TRD 저장 모델에는 없는 값. 추천 mock에서만 쓴다(팀에서 category 필드 추가 논의 중). */
  categoryCode?: CategoryCode | null;
}

export interface MockCourse extends CourseResponse {
  ownerId: number | null;
}

export interface MockCouple {
  coupleId: number;
  status: 'ACTIVE' | 'GRACE' | 'CLOSED';
  memberIds: [number, number];
  connectedAt: string;
  disconnectedAt: string | null;
  graceExpiresAt: string | null;
  closedAt: string | null;
}

export interface MockInvitation {
  code: string;
  purpose: 'CONNECT' | 'RECONNECT';
  coupleId: number | null;
  issuerId: number;
  expiresAt: string;
  usedAt: string | null;
}

export interface MockShared {
  sharedId: number;
  coupleId: number;
  /** 장소면 placeId, 코스면 courseId */
  contentId: number;
  sharedByMemberId: number;
  sharedAt: string;
  canceledAt: string | null;
}

interface MockDb {
  version: 1;
  accounts: MockAccount[];
  places: MockPlace[];
  nextPlaceId: number;
  courses: MockCourse[];
  /** courseId, coursePlaceId, courseItemId 공용 순번 */
  nextCourseSeq: number;
  couples: MockCouple[];
  invitations: MockInvitation[];
  sharedPlaces: MockShared[];
  sharedCourses: MockShared[];
  /** coupleId, sharedPlaceId, sharedCourseId 공용 순번 */
  nextShareSeq: number;
  memos: (MemoResponse & { authorId: number })[];
  comments: (Omit<CommentResponse, 'author'> & { authorId: number })[];
  /** memoId, commentId 공용 순번 */
  nextNoteSeq: number;
}

export const DEMO_ACCOUNT: MockAccount = {
  email: 'demo@oneclickmeet.app',
  password: 'demo1234',
  member: {
    memberId: 1,
    displayName: '데모',
    libraryId: 10,
    currentCoupleId: null,
    createdAt: '2026-10-18T08:00:00Z',
  },
};

/** mock에서 상대 역할을 하는 가짜 계정. 이 계정으로 로그인해서 반대편 화면을 볼 수도 있다. */
export const PARTNER_ACCOUNT: MockAccount = {
  email: 'partner@oneclickmeet.app',
  password: 'demo1234',
  member: {
    memberId: 2,
    displayName: '상대',
    libraryId: 20,
    currentCoupleId: null,
    createdAt: '2026-10-18T08:00:00Z',
  },
};

function initialDb(): MockDb {
  return {
    version: 1,
    accounts: [DEMO_ACCOUNT, PARTNER_ACCOUNT],
    places: [],
    nextPlaceId: 1,
    courses: [],
    nextCourseSeq: 1,
    couples: [],
    invitations: [],
    sharedPlaces: [],
    sharedCourses: [],
    nextShareSeq: 1,
    memos: [],
    comments: [],
    nextNoteSeq: 1,
  };
}

const file = () => new File(Paths.document, 'mock-db.json');

let cache: MockDb | null = null;

export function db(): MockDb {
  if (cache) return cache;
  try {
    const f = file();
    // 예전 버전 파일에 없는 필드는 기본값으로 채운다.
    cache = f.exists ? { ...initialDb(), ...(JSON.parse(f.textSync()) as Partial<MockDb>) } : initialDb();
  } catch {
    cache = initialDb();
  }
  // 예전 파일에는 상대 계정이 없다. 2번을 이미 누가 쓰고 있으면 다음 번호를 준다.
  if (!cache.accounts.some((a) => a.email === PARTNER_ACCOUNT.email)) {
    const partner: MockAccount = JSON.parse(JSON.stringify(PARTNER_ACCOUNT));
    if (cache.accounts.some((a) => a.member.memberId === partner.member.memberId)) {
      partner.member.memberId = Math.max(...cache.accounts.map((a) => a.member.memberId)) + 1;
      partner.member.libraryId = partner.member.memberId * 10;
    }
    cache.accounts.push(partner);
  }
  return cache;
}

export function partnerAccount(): MockAccount {
  return db().accounts.find((a) => a.email === PARTNER_ACCOUNT.email)!;
}

export function saveDb() {
  if (!cache) return;
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(cache));
  } catch {
    // 저장 실패해도 메모리에는 남아 있다.
  }
}

export function resetDb() {
  cache = initialDb();
  saveDb();
}
