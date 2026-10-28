import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './problem';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // React Native에는 창 포커스 이벤트가 없다.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // 4xx는 다시 시도해도 같은 결과라 재시도하지 않는다.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // 생성 요청을 자동 재시도하면 중복 저장이 생길 수 있다(TRD 13).
      retry: false,
    },
  },
});
