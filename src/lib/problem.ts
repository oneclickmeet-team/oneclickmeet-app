import type { ProblemDetail } from '@/types/api';

// 서버가 ProblemDetail로 응답한 오류
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly reason?: string | null;
  readonly fieldErrors: { field: string; message: string }[];

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.reason = problem.reason;
    this.fieldErrors = problem.errors ?? [];
  }
}

// 서버까지 닿지 못한 오류 (와이파이, 주소 오류, 서버 꺼짐, 시간 초과)
export class NetworkError extends Error {
  constructor(message = '서버에 연결하지 못했어요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

// reason별 사용자 문구. detail 문구는 파싱하지 않는다(TRD 2.4).
const REASON_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 맞지 않아요.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일이에요.',
  TOKEN_EXPIRED: '로그인이 만료됐어요. 다시 로그인해 주세요.',
  INVALID_INPUT: '입력한 내용을 확인해 주세요.',
  TOO_MANY_REQUESTS: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  ACTIVE_SHARE_EXISTS: '상대와 공유 중인 장소는 여기서 삭제할 수 없어요. 공유를 먼저 취소해 주세요.',
  RESOURCE_NOT_FOUND: '찾을 수 없어요. 이미 삭제됐을 수 있어요.',
  IMAGE_TOO_LARGE: '이미지가 너무 커요. 5MB 이하로 올려 주세요.',
  UNSUPPORTED_IMAGE_TYPE: 'JPEG, PNG, WebP 이미지만 올릴 수 있어요.',
  COURSE_STRUCTURE_CONFLICT: '그사이 코스가 바뀌었어요. 새로 불러온 뒤 다시 편집해 주세요.',
  ACTIVE_COUPLE_EXISTS: '이미 연결된 상대가 있어요. 연결을 해제한 뒤에 다시 시도해 주세요.',
  OWN_INVITATION: '내가 만든 코드예요. 상대에게 보내서 상대가 입력해야 해요.',
  INVITATION_USED: '이미 사용된 코드예요. 새 코드를 받아 주세요.',
  INVALID_INVITATION: '코드가 틀렸거나 기간(24시간)이 지났어요.',
  RECONNECT_REQUIRED: '이 상대와는 연결 해제 유예 중이에요. 재연결로 다시 이어 주세요.',
  NOT_ACTIVE: '이미 해제된 관계예요.',
  NOT_IN_GRACE: '유예 중인 관계에서만 재연결 코드를 만들 수 있어요.',
  COUPLE_CLOSED: '종료된 관계예요. 공동 기록은 더 볼 수 없어요.',
  SHARED_READ_ONLY: '연결 해제 유예 중에는 공동 기록을 바꿀 수 없어요.',
  ALREADY_SHARED: '이미 공유한 항목이에요.',
  AUTHOR_ONLY: '내가 쓴 글만 고치거나 지울 수 있어요.',
  PROVIDER_UNAVAILABLE: '외부 서비스가 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: '입력한 내용을 확인해 주세요.',
  401: '로그인이 필요해요.',
  403: '권한이 없어요.',
  404: '찾을 수 없어요.',
  409: '지금 상태에서는 할 수 없어요.',
  429: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  503: '서비스가 잠시 응답하지 않아요.',
};

export function toUserMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return `${error.message} 마이 탭 > 개발자 설정에서 서버 주소를 확인해 주세요.`;
  }
  if (error instanceof ApiError) {
    if (error.reason && REASON_MESSAGES[error.reason]) return REASON_MESSAGES[error.reason];
    if (error.fieldErrors.length > 0) return error.fieldErrors[0].message;
    return STATUS_MESSAGES[error.status] ?? '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  }
  return '알 수 없는 오류가 났어요.';
}
