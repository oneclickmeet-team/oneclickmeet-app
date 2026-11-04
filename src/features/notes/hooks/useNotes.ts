import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CommentTargetType, MemoTargetType } from '@/types/api';
import type { CoupleId } from '@/types/ids';

import { commentApi, memoApi } from '../api/notesApi';

// queryKey는 설계서 8장: ['memos', targetType, targetId], ['couples', coupleId, 'comments', targetType, targetId]
export const noteKeys = {
  memos: (type: MemoTargetType, id: number) => ['memos', type, id] as const,
  comments: (coupleId: CoupleId, type: CommentTargetType, id: number) =>
    ['couples', coupleId, 'comments', type, id] as const,
};

// 메모·첨언은 한 대상에 많이 쌓이지 않는 걸로 보고 첫 페이지만 쓴다(필요하면 무한 목록으로 바꾼다).
export function useMemos(type: MemoTargetType, id: number | null) {
  return useQuery({
    queryKey: noteKeys.memos(type, id ?? 0),
    queryFn: () => memoApi.list(type, id!),
    enabled: id !== null,
  });
}

export function useMemoMutations(type: MemoTargetType, id: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: noteKeys.memos(type, id) });
  return {
    create: useMutation({ mutationFn: (content: string) => memoApi.create(type, id, content), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ memoId, content }: { memoId: number; content: string }) => memoApi.update(memoId, content),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (memoId: number) => memoApi.remove(memoId), onSuccess: refresh }),
  };
}

export function useComments(coupleId: CoupleId, type: CommentTargetType, id: number) {
  return useQuery({
    queryKey: noteKeys.comments(coupleId, type, id),
    queryFn: () => commentApi.list(coupleId, type, id),
  });
}

export function useCommentMutations(coupleId: CoupleId, type: CommentTargetType, id: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: noteKeys.comments(coupleId, type, id) });
  return {
    create: useMutation({
      mutationFn: (content: string) => commentApi.create(coupleId, type, id, content),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
        commentApi.update(coupleId, commentId, content),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (commentId: number) => commentApi.remove(coupleId, commentId), onSuccess: refresh }),
  };
}
