// mock 서버의 저장소. 앱 문서 폴더에 JSON으로 저장해서 앱을 껐다 켜도 남는다.
// 개발자 설정의 "mock 데이터 초기화"로 지운다.
import { File, Paths } from 'expo-file-system';

import type { CategoryCode, CourseResponse, MemberResponse, PlaceResponse } from '@/types/api';

export interface MockAccount {
  email: string;
  password: string;
  member: MemberResponse;
}

export interface MockPlace extends PlaceResponse {
  ownerId: number;
  /** TRD 저장 모델에는 없는 값. 추천 mock에서만 쓴다(팀에서 category 필드 추가 논의 중). */
  categoryCode?: CategoryCode | null;
}

export interface MockCourse extends CourseResponse {
  ownerId: number;
}

interface MockDb {
  version: 1;
  accounts: MockAccount[];
  places: MockPlace[];
  nextPlaceId: number;
  courses: MockCourse[];
  /** courseId, coursePlaceId, courseItemId 공용 순번 */
  nextCourseSeq: number;
}

const DEMO_ACCOUNT: MockAccount = {
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

function initialDb(): MockDb {
  return {
    version: 1,
    accounts: [DEMO_ACCOUNT],
    places: [],
    nextPlaceId: 1,
    courses: [],
    nextCourseSeq: 1,
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
  return cache;
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
