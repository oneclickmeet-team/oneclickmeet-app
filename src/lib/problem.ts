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
