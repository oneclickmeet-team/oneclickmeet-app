// 서버 계약(api.ts) → 화면 모델(model.ts) 변환
import type { MemberResponse, TokenResponse } from '@/types/api';
import type { CoupleId, LibraryId, MemberId } from '@/types/ids';
import type { Member, Session } from '@/types/model';

export function toMember(res: MemberResponse): Member {
  return {
    id: res.memberId as MemberId,
    displayName: res.displayName,
    libraryId: res.libraryId as LibraryId,
    currentCoupleId: res.currentCoupleId === null ? null : (res.currentCoupleId as CoupleId),
    createdAt: res.createdAt,
  };
}

export function toSession(res: TokenResponse): Session {
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    member: toMember(res.member),
  };
}
