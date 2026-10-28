// mock 서버 공통 도구. mock은 반드시 types/api.ts 타입으로 응답한다.
import { ApiError } from '@/lib/problem';
import { useAuthStore } from '@/stores/authStore';
import type { ProblemDetail } from '@/types/api';

// 실제 네트워크처럼 약간 늦게 응답한다(로딩 화면 확인용).
export function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fail(problem: ProblemDetail): never {
  throw new ApiError({ type: 'about:blank', ...problem });
}

export function badRequest(field: string, message: string): never {
  return fail({
    status: 400,
    title: 'Bad Request',
    code: 'COMMON-0400',
    reason: 'INVALID_INPUT',
    errors: [{ field, message }],
  });
}

export function nowIso() {
  return new Date().toISOString();
}

// mock 토큰 형식: mock-access.{memberId}.{순번}
let tokenSeq = 0;
export function issueTokens(memberId: number) {
  tokenSeq += 1;
  return {
    accessToken: `mock-access.${memberId}.${tokenSeq}`,
    refreshToken: `mock-refresh.${memberId}.${tokenSeq}`,
  };
}

export function memberIdFromToken(token: string | null): number | null {
  if (!token) return null;
  const [, id] = token.split('.');
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 인증이 필요한 mock API에서 현재 로그인한 회원 ID를 꺼낸다.
export function requireMemberId(): number {
  const id = memberIdFromToken(useAuthStore.getState().accessToken);
  if (!id) {
    fail({ status: 401, title: 'Unauthorized', code: 'AUTH-0401', reason: 'TOKEN_EXPIRED' });
  }
  return id;
}
