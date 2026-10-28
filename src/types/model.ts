// 화면이 쓰는 모델. 서버 계약(api.ts)과 분리해 둔다.
import type { CoupleId, LibraryId, MemberId, PlaceId, SharedPlaceId } from './ids';

export interface Member {
  id: MemberId;
  displayName: string;
  libraryId: LibraryId;
  currentCoupleId: CoupleId | null;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  member: Member;
}

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: PlaceId;
  name: string;
  address: string | null;
  /** 좌표가 없으면 null. 추천 기준 장소로 쓰려면 좌표가 있어야 한다. */
  coords: Coords | null;
  sourceUrl: string | null;
  sharedPlaceId: SharedPlaceId | null;
  createdAt: string;
}

/** 저장 전 확인용 후보. placeId가 없다. */
export interface Candidate {
  name: string;
  address: string | null;
  coords: Coords | null;
  sourceUrl: string | null;
  categoryLabel: string | null;
  openingHours: string | null;
}

export interface Recognition {
  found: boolean;
  extractedQuery: string | null;
  candidates: Candidate[];
  message: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  hasNext: boolean;
}
