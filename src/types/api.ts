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

// 8 코스 추천 (R01). categorySequence·requiredPlaceOrder·placeCount는 TRD의 제안 필드명이다.
export type CategoryCode = 'MEAL' | 'CAFE' | 'BAR' | 'ACTIVITY' | 'CULTURE' | 'WALK' | 'SHOPPING';

export type RecommendationAnchor =
  | { type: 'REGION'; regionId: RegionId }
  | { type: 'PLACE'; source: 'PERSONAL'; placeId: number }
  | { type: 'PLACE'; source: 'SHARED'; coupleId: number; sharedPlaceId: number };

export interface RecommendationRequest {
  anchor: RecommendationAnchor;
  placeCount: number;
  categorySequence: CategoryCode[];
  requiredPlaceOrder?: number;
  sourceCoupleId?: number;
}

/** PlaceSnapshot: 코스 안의 장소 정보. 좌표 필수, sourceUrl 없음. */
export interface PlaceSnapshot {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface WalkingLeg {
  fromVisitOrder: number;
  toVisitOrder: number;
  estimatedMinutes: number;
}

export interface RecommendedCourse {
  candidateKey: string;
  title: string;
  places: (PlaceSnapshot & { visitOrder: number })[];
  walkingLegs: WalkingLeg[];
}

export interface RecommendationResponse {
  courses: RecommendedCourse[];
  reason: 'INSUFFICIENT_PLACES' | 'UNSUPPORTED_REGION' | null;
  walkingTimeMethod: 'COORDINATE_ESTIMATE';
}

// 9 코스 저장과 편집
export interface CourseItemInput {
  name: string;
  twoPersonAmount: number | null;
  isChecked: boolean;
}

export interface CourseCreateRequest {
  title: string;
  places: (PlaceSnapshot & { visitOrder: number; items: CourseItemInput[] })[];
}

export interface AmountSummary {
  currency: 'KRW';
  knownTotalAmount: number;
  placesWithoutCheckedItems: number;
  checkedItemsWithoutAmount: number;
  status: 'EMPTY' | 'PARTIAL' | 'COMPLETE';
  amountSource: 'USER_INPUT';
}

export interface CourseItemResponse extends CourseItemInput {
  courseItemId: number;
}

export interface CoursePlaceResponse extends PlaceSnapshot {
  coursePlaceId: number;
  visitOrder: number;
  items: CourseItemResponse[];
  checkedSubtotal: number;
}

export interface CourseResponse {
  courseId: number;
  title: string;
  sharedCourseId: number | null;
  sourceSharedCourseId: number | null;
  places: CoursePlaceResponse[];
  walkingLegs: WalkingLeg[];
  walkingTimeMethod: 'COORDINATE_ESTIMATE';
  amountSummary: AmountSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummary {
  courseId: number;
  title: string;
  placeCount: number;
  sharedCourseId: number | null;
  sourceSharedCourseId: number | null;
  amountSummary: AmountSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CourseListParams {
  page?: number;
  size?: number;
  query?: string;
}

// 9.3 코스 편집 요청 (T04). 최종 저장 때 변경분만 명령 묶음으로 보낸다.
export type PlaceWithItems = PlaceSnapshot & { items: CourseItemInput[] };

export type CourseEditOperation =
  | { type: 'UPDATE_TITLE'; title: string }
  | { type: 'ADD_PLACE'; clientPlaceKey: string; place: PlaceWithItems }
  | { type: 'REPLACE_PLACE'; coursePlaceId: number; clientPlaceKey: string; place: PlaceWithItems }
  | { type: 'REMOVE_PLACE'; coursePlaceId: number }
  | {
      type: 'REORDER_PLACES';
      places: ({ coursePlaceId: number } | { clientPlaceKey: string })[];
    }
  | { type: 'ADD_ITEM'; coursePlaceId: number; item: CourseItemInput }
  | ({ type: 'UPDATE_ITEM'; courseItemId: number } & Partial<CourseItemInput>)
  | { type: 'REMOVE_ITEM'; courseItemId: number };

export interface CourseEditRequest {
  operations: CourseEditOperation[];
}

// 5 커플 연결과 수명주기 (C01~C06)
export type CoupleStatus = 'ACTIVE' | 'GRACE' | 'CLOSED';

export interface CoupleMember {
  memberId: number;
  displayName: string;
}

export interface CoupleResponse {
  coupleId: number;
  status: CoupleStatus;
  members: CoupleMember[];
  disconnectedAt: string | null;
  graceExpiresAt: string | null;
  closedAt: string | null;
  readOnly: boolean;
  canReconnect: boolean;
  serverTime: string;
}

export interface InvitationRequest {
  purpose: 'CONNECT' | 'RECONNECT';
  coupleId?: number;
}

export interface InvitationResponse {
  invitationCode: string;
  purpose: 'CONNECT' | 'RECONNECT';
  coupleId: number | null;
  expiresAt: string;
}

export interface DisconnectionResponse {
  couple: CoupleResponse;
  personalCopies: {
    targetType: 'PLACE' | 'COURSE';
    sourceSharedId: number;
    previousContentId: number;
    personalContentId: number;
  }[];
  reloadPersonalLibrary: boolean;
}

// 10 공동 장소와 코스 (S01~S09)
export interface SharedPageResponse<T> extends PageResponse<T> {
  coupleId: number;
  relationshipStatus: CoupleStatus;
  readOnly: boolean;
  graceExpiresAt: string | null;
}

interface SharedBase {
  coupleId: number;
  sharedByMemberId: number;
  sharedAt: string;
  relationshipStatus: CoupleStatus;
  readOnly: boolean;
  graceExpiresAt: string | null;
}

export interface SharedPlaceResponse extends SharedBase {
  sharedPlaceId: number;
  place: PlaceResponse;
}

export interface SharedCourseResponse extends SharedBase {
  sharedCourseId: number;
  course: CourseResponse;
}

export type UnshareScope = 'SHARED_ONLY' | 'PERSONAL_AND_SHARED';

// 11.1 비공개 메모 (N01~N05). targetId는 PLACE면 placeId, COURSE면 courseId(본문 ID)
export type MemoTargetType = 'PLACE' | 'COURSE';

export interface MemoResponse {
  memoId: number;
  targetType: MemoTargetType;
  targetId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoCreateRequest {
  targetType: MemoTargetType;
  targetId: number;
  content: string;
}

// 11.2 공동 첨언 (N06~N09). targetId는 공유 기록 ID(sharedPlaceId·sharedCourseId)
export type CommentTargetType = 'SHARED_PLACE' | 'SHARED_COURSE';

export interface CommentResponse {
  commentId: number;
  coupleId: number;
  targetType: CommentTargetType;
  targetId: number;
  author: CoupleMember;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentCreateRequest {
  targetType: CommentTargetType;
  targetId: number;
  content: string;
}

// 12 활동 기록과 알림 (H01~H03)
export type ActivityActionType =
  | 'PLACE_SHARED'
  | 'PLACE_SHARE_REVOKED'
  | 'PLACE_DELETED'
  | 'COURSE_SHARED'
  | 'COURSE_UPDATED'
  | 'COURSE_SHARE_REVOKED'
  | 'COURSE_DELETED'
  | 'COMMENT_CREATED'
  | 'COUPLE_DISCONNECTED'
  | 'COUPLE_RECONNECTED';

export interface ActivityResponse {
  activityId: number;
  coupleId: number;
  /** 시스템 처리면 null */
  actor: CoupleMember | null;
  actionType: ActivityActionType;
  /** 관계 사건이면 대상 필드는 null */
  targetType: CommentTargetType | null;
  targetId: number | null;
  targetLabel: string | null;
  targetAccessible: boolean;
  occurredAt: string;
}

export interface NotificationResponse {
  notificationId: number;
  type: ActivityActionType;
  message: string;
  activityId: number | null;
  target: { coupleId: number; targetType: CommentTargetType; targetId: number } | null;
  targetAccessible: boolean;
  readAt: string | null;
  createdAt: string;
}
