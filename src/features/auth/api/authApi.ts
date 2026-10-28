// 인증·회원 API (TRD A01, A02, A04, A05, M01, M02)
// mock/실서버 전환은 이 파일 안에서만 일어난다.
import { apiRequest } from '@/lib/apiClient';
import { mockAuth } from '@/mocks/auth';
import { isMockMode } from '@/stores/settingsStore';
import type {
  LoginRequest,
  MemberResponse,
  SignupRequest,
  TokenResponse,
  UpdateMemberRequest,
} from '@/types/api';
import type { Member, Session } from '@/types/model';

import { toMember, toSession } from './convert';

export const authApi = {
  // A01
  async signup(req: SignupRequest): Promise<Member> {
    const res = isMockMode()
      ? await mockAuth.signup(req)
      : await apiRequest<MemberResponse>('/auth/signups', { method: 'POST', body: req, auth: false });
    return toMember(res);
  },

  // A02
  async login(req: LoginRequest): Promise<Session> {
    const res = isMockMode()
      ? await mockAuth.login(req)
      : await apiRequest<TokenResponse>('/auth/tokens', { method: 'POST', body: req, auth: false });
    return toSession(res);
  },

  // A05
  async logout(refreshToken: string): Promise<void> {
    if (isMockMode()) return mockAuth.logout({ refreshToken });
    await apiRequest<void>('/auth/logouts', { method: 'POST', body: { refreshToken } });
  },

  // M01
  async me(): Promise<Member> {
    const res = isMockMode() ? await mockAuth.me() : await apiRequest<MemberResponse>('/members/me');
    return toMember(res);
  },

  // M02
  async updateMe(req: UpdateMemberRequest): Promise<Member> {
    const res = isMockMode()
      ? await mockAuth.updateMe(req)
      : await apiRequest<MemberResponse>('/members/me', { method: 'PATCH', body: req });
    return toMember(res);
  },
};
