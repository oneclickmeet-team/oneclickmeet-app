// 화면이 쓰는 모델. 서버 계약(api.ts)과 분리해 둔다.
import type { CoupleId, LibraryId, MemberId } from './ids';

export interface Member {
  id: MemberId;
  displayName: string;
  libraryId: LibraryId;
  currentCoupleId: CoupleId | null;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  member: Member;
}
