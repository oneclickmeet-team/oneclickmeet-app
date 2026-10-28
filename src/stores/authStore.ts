import { create } from 'zustand';

import { queryClient } from '@/lib/queryClient';
import { readJson, remove, StorageKeys, writeJson } from '@/lib/secureStorage';
import type { Member, Session } from '@/types/model';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  member: Member | null;
  hydrate: () => Promise<void>;
  setSession: (session: Session) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setMember: (member: Member) => void;
  signOut: () => void;
}

function persist(state: Pick<AuthState, 'accessToken' | 'refreshToken' | 'member'>) {
  if (!state.accessToken || !state.refreshToken || !state.member) return;
  const session: Session = {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    member: state.member,
  };
  void writeJson(StorageKeys.session, session);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,
  member: null,

  hydrate: async () => {
    const saved = await readJson<Session>(StorageKeys.session);
    if (saved) {
      set({ ...saved, status: 'signedIn' });
    } else {
      set({ status: 'signedOut' });
    }
  },

  setSession: (session) => {
    set({ ...session, status: 'signedIn' });
    persist(get());
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    persist(get());
  },

  setMember: (member) => {
    set({ member });
    persist(get());
  },

  signOut: () => {
    set({ status: 'signedOut', accessToken: null, refreshToken: null, member: null });
    void remove(StorageKeys.session);
    // 다른 계정의 데이터가 남지 않게 서버 데이터 캐시를 모두 비운다.
    queryClient.clear();
  },
}));
