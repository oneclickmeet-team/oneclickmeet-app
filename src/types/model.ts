// 화면이 쓰는 모델. 서버 계약(api.ts)과 분리해 둔다.
import type { CoupleId, CourseId, LibraryId, MemberId, PlaceId, SharedPlaceId } from './ids';

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

// ---- 코스
export interface CourseStop {
  name: string;
  address: string | null;
  coords: Coords;
}

export interface RecommendedCourseModel {
  key: string;
  title: string;
  stops: CourseStop[];
  /** legMinutes[i] = i번째 → i+1번째 장소 추정 도보 분 */
  legMinutes: number[];
}

export interface Recommendation {
  courses: RecommendedCourseModel[];
  reason: 'INSUFFICIENT_PLACES' | 'UNSUPPORTED_REGION' | null;
}

export interface CourseItem {
  id: number;
  name: string;
  twoPersonAmount: number | null;
  isChecked: boolean;
}

export interface CoursePlace extends CourseStop {
  id: number;
  items: CourseItem[];
  checkedSubtotal: number;
}

export interface AmountSummaryModel {
  knownTotal: number;
  placesWithoutChecked: number;
  checkedWithoutAmount: number;
  status: 'EMPTY' | 'PARTIAL' | 'COMPLETE';
}

export interface Course {
  id: CourseId;
  title: string;
  places: CoursePlace[];
  legMinutes: number[];
  amount: AmountSummaryModel;
  sharedCourseId: number | null;
  createdAt: string;
}

export interface CourseSummaryModel {
  id: CourseId;
  title: string;
  placeCount: number;
  amount: AmountSummaryModel;
  shared: boolean;
  createdAt: string;
}
