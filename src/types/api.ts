// 서버 계약 그대로 (TRD v1.0 부록 A). 서버 응답 모양이 바뀌면 이 파일과
// features/*/api 의 변환 함수만 고친다. 화면에서는 이 타입을 직접 쓰지 않는다.

// 2.4 오류 응답 (application/problem+json)
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  reason?: string | null;
  errors?: { field: string; message: string }[];
}

// 4. 인증과 회원
export interface MemberResponse {
  memberId: number;
  displayName: string;
  libraryId: number;
  currentCoupleId: number | null;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  member: MemberResponse;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateMemberRequest {
  displayName: string;
}

// 2.2 목록 조회
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  hasNext: boolean;
}

// 6.1 지원 지역과 장소 후보
export type RegionId = 'JAMSIL' | 'SUNGSHIN' | 'HANSUNG' | 'HYEHWA' | 'SEOCHON' | 'YEONNAM';

export interface Region {
  regionId: RegionId;
  name: string;
}

export interface RegionsResponse {
  items: Region[];
}

export interface PlaceCandidate {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
  categoryLabel: string | null;
  openingHours: string | null;
}

export interface CandidateSearchParams {
  query?: string;
  latitude?: number;
  longitude?: number;
  regionId?: RegionId;
  radiusMeters?: number;
  page?: number;
  size?: number;
}

export type CandidateSearchResponse = PageResponse<PlaceCandidate>;

// 6.2 링크와 스크린샷 인식
export interface RecognitionRequest {
  sourceUrl?: string | null;
  sharedText?: string | null;
}

export interface RecognitionResponse {
  status: 'CANDIDATES_FOUND' | 'NEEDS_SEARCH';
  extractedQuery: string | null;
  candidates: PlaceCandidate[];
  sourceUrl: string | null;
  message: string | null;
}

// 7 개인 장소 보관함
export interface PlaceListParams {
  page?: number;
  size?: number;
  query?: string;
  regionId?: RegionId;
}

export interface PlaceInput {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
}

export interface PlaceResponse {
  placeId: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
  sharedPlaceId: number | null;
  sourceSharedPlaceId: number | null;
  createdAt: string;
  updatedAt: string;
}
