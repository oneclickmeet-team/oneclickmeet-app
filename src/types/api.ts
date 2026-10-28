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
