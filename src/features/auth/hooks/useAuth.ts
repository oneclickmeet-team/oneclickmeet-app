import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { ApiError } from '@/lib/problem';
import { useAuthStore } from '@/stores/authStore';
import type { LoginRequest, SignupRequest, UpdateMemberRequest } from '@/types/api';

import { authApi } from '../api/authApi';

export const meQueryKey = ['me'] as const;

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (req: LoginRequest) => authApi.login(req),
    onSuccess: (session) => setSession(session),
  });
}

// TRD: 가입 응답 이후 A02로 로그인하는 흐름
export function useSignup() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (req: SignupRequest) => {
      await authApi.signup(req);
      return authApi.login({ email: req.email, password: req.password });
    },
    onSuccess: (session) => setSession(session),
  });
}

export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);
  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      // 서버 로그아웃이 실패해도 앱에서는 로그아웃시킨다.
      if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    },
    onSettled: () => signOut(),
  });
}

export function useMe() {
  const status = useAuthStore((s) => s.status);
  const setMember = useAuthStore((s) => s.setMember);
  const signOut = useAuthStore((s) => s.signOut);

  const query = useQuery({
    queryKey: meQueryKey,
    queryFn: () => authApi.me(),
    enabled: status === 'signedIn',
  });

  useEffect(() => {
    if (query.data) setMember(query.data);
  }, [query.data, setMember]);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) signOut();
  }, [query.error, signOut]);

  return query;
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateMemberRequest) => authApi.updateMe(req),
    onSuccess: (member) => queryClient.setQueryData(meQueryKey, member),
  });
}
