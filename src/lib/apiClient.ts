import { toMember } from '@/features/auth/api/convert';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ProblemDetail, TokenResponse } from '@/types/api';

import { ApiError, NetworkError } from './problem';

// 실제 서버 호출은 전부 이 함수를 거친다. features/*/api 안에서만 부른다.

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** 인증이 필요 없는 API(A01, A02, A04)는 false */
  auth?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function rawFetch(path: string, opts: RequestOptions, accessToken: string | null) {
  const baseUrl = useSettingsStore.getState().apiBaseUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(`${baseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new NetworkError(aborted ? '서버 응답이 너무 늦어요.' : '서버에 연결하지 못했어요.');
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const problem = (await res.json()) as ProblemDetail;
    return new ApiError({ ...problem, status: problem.status ?? res.status });
  } catch {
    return new ApiError({ status: res.status, title: res.statusText });
  }
}

// 동시에 여러 요청이 401을 받아도 갱신(A04)은 한 번만 한다.
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const { refreshToken, setTokens, setMember } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await rawFetch(
      '/auth/token-refreshes',
      { method: 'POST', body: { refreshToken }, auth: false },
      null,
    );
    if (!res.ok) return false;
    const data = (await res.json()) as TokenResponse;
    setTokens(data.accessToken, data.refreshToken);
    setMember(toMember(data.member));
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const needsAuth = opts.auth ?? true;
  let res = await rawFetch(path, opts, needsAuth ? useAuthStore.getState().accessToken : null);

  if (res.status === 401 && needsAuth) {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (!ok) {
      useAuthStore.getState().signOut();
      throw await toApiError(res);
    }
    res = await rawFetch(path, opts, useAuthStore.getState().accessToken);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
