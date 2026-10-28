// A01, A02, A04, A05, M01, M02 mock. 계정은 mock 저장소(db.ts)에 남는다.
// 데모 계정은 항상 있다: demo@oneclickmeet.app / demo1234
import type {
  LoginRequest,
  MemberResponse,
  RefreshTokenRequest,
  SignupRequest,
  TokenResponse,
  UpdateMemberRequest,
} from '@/types/api';

import { db, saveDb } from './db';
import { badRequest, delay, fail, issueTokens, memberIdFromToken, nowIso, requireMemberId } from './core';

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
  return db().accounts.find((a) => a.member.memberId === memberId);
}

export const mockAuth = {
  async signup(req: SignupRequest): Promise<MemberResponse> {
    await delay();
    if (!EMAIL_RE.test(req.email)) badRequest('email', '이메일 형식이 아니에요.');
    if (req.password.length < 8 || req.password.length > 64) {
      badRequest('password', '비밀번호는 8~64자로 입력해 주세요.');
    }
    validateDisplayName(req.displayName);
    if (db().accounts.some((a) => a.email === req.email)) {
      fail({ status: 409, title: 'Conflict', code: 'AUTH-0409', reason: 'EMAIL_ALREADY_EXISTS' });
    }
    const nextId = Math.max(...db().accounts.map((a) => a.member.memberId)) + 1;
    const member: MemberResponse = {
      memberId: nextId,
      displayName: req.displayName.trim(),
      libraryId: nextId * 10,
      currentCoupleId: null,
      createdAt: nowIso(),
    };
    db().accounts.push({ email: req.email, password: req.password, member });
    saveDb();
    return member;
  },

  async login(req: LoginRequest): Promise<TokenResponse> {
    await delay();
    const account = db().accounts.find((a) => a.email === req.email && a.password === req.password);
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
      // mock 데이터를 초기화한 경우
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
    saveDb();
    return account.member;
  },
};
