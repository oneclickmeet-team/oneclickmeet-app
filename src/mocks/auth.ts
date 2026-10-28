// A01, A02, A04, A05, M01, M02 mock. 앱을 껐다 켜면 새로 가입한 계정은 사라진다.
// 데모 계정은 항상 있다: demo@oneclickmeet.app / demo1234
import type {
  LoginRequest,
  MemberResponse,
  RefreshTokenRequest,
  SignupRequest,
  TokenResponse,
  UpdateMemberRequest,
} from '@/types/api';

import { badRequest, delay, fail, issueTokens, memberIdFromToken, nowIso, requireMemberId } from './core';

interface MockAccount {
  email: string;
  password: string;
  member: MemberResponse;
}

const accounts: MockAccount[] = [
  {
    email: 'demo@oneclickmeet.app',
    password: 'demo1234',
    member: {
      memberId: 1,
      displayName: '데모',
      libraryId: 10,
      currentCoupleId: null,
      createdAt: '2026-10-18T08:00:00Z',
    },
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateDisplayName(name: string) {
  if (name.trim().length === 0 || name.length > 50) {
    badRequest('displayName', '이름은 1~50자로 입력해 주세요.');
  }
}

function tokenResponse(member: MemberResponse): TokenResponse {
  return { ...issueTokens(member.memberId), tokenType: 'Bearer', expiresIn: 3600, member };
}

function findById(memberId: number) {
  return accounts.find((a) => a.member.memberId === memberId);
}

export const mockAuth = {
  async signup(req: SignupRequest): Promise<MemberResponse> {
    await delay();
    if (!EMAIL_RE.test(req.email)) badRequest('email', '이메일 형식이 아니에요.');
    if (req.password.length < 8 || req.password.length > 64) {
      badRequest('password', '비밀번호는 8~64자로 입력해 주세요.');
    }
    validateDisplayName(req.displayName);
    if (accounts.some((a) => a.email === req.email)) {
      fail({ status: 409, title: 'Conflict', code: 'AUTH-0409', reason: 'EMAIL_ALREADY_EXISTS' });
    }
    const nextId = Math.max(...accounts.map((a) => a.member.memberId)) + 1;
    const member: MemberResponse = {
      memberId: nextId,
      displayName: req.displayName.trim(),
      libraryId: nextId * 10,
      currentCoupleId: null,
      createdAt: nowIso(),
    };
    accounts.push({ email: req.email, password: req.password, member });
    return member;
  },

  async login(req: LoginRequest): Promise<TokenResponse> {
    await delay();
    const account = accounts.find((a) => a.email === req.email && a.password === req.password);
    if (!account) {
      fail({ status: 401, title: 'Unauthorized', code: 'AUTH-0401', reason: 'INVALID_CREDENTIALS' });
    }
    return tokenResponse(account.member);
  },

  async refresh(req: RefreshTokenRequest): Promise<TokenResponse> {
    await delay(200);
    const account = findById(memberIdFromToken(req.refreshToken) ?? -1);
    if (!account) {
      fail({ status: 401, title: 'Unauthorized', code: 'AUTH-0401', reason: 'TOKEN_EXPIRED' });
    }
    return tokenResponse(account.member);
  },

  async logout(_req: RefreshTokenRequest): Promise<void> {
    await delay(200);
  },

  async me(): Promise<MemberResponse> {
    await delay(200);
    const account = findById(requireMemberId());
    if (!account) {
      // 앱 재시작으로 mock 가입 계정이 사라진 경우
      fail({ status: 401, title: 'Unauthorized', code: 'AUTH-0401', reason: 'TOKEN_EXPIRED' });
    }
    return account.member;
  },

  async updateMe(req: UpdateMemberRequest): Promise<MemberResponse> {
    await delay();
    validateDisplayName(req.displayName);
    const account = findById(requireMemberId());
    if (!account) {
      fail({ status: 401, title: 'Unauthorized', code: 'AUTH-0401', reason: 'TOKEN_EXPIRED' });
    }
    account.member = { ...account.member, displayName: req.displayName.trim() };
    return account.member;
  },
};
