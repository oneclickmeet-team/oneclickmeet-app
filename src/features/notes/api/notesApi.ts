// 비공개 메모(N01~N05)와 공동 첨언(N06~N09) API
import { apiRequest } from '@/lib/apiClient';
import { mockComments, mockMemos } from '@/mocks/notes';
import { useAuthStore } from '@/stores/authStore';
import { isMockMode } from '@/stores/settingsStore';
import type {
  CommentResponse,
  CommentTargetType,
  MemoResponse,
  MemoTargetType,
  PageResponse,
} from '@/types/api';
import type { CoupleId } from '@/types/ids';
import type { Comment, Memo, Page } from '@/types/model';

function toMemo(res: MemoResponse): Memo {
  return { id: res.memoId, content: res.content, createdAt: res.createdAt, updatedAt: res.updatedAt };
}

function toComment(res: CommentResponse): Comment {
  return {
    id: res.commentId,
    authorName: res.author.displayName,
    mine: res.author.memberId === useAuthStore.getState().member?.id,
    content: res.content,
    createdAt: res.createdAt,
    edited: res.updatedAt !== res.createdAt,
  };
}

const toPage = <A, B>(res: PageResponse<A>, map: (a: A) => B): Page<B> => ({
  items: res.items.map(map),
  page: res.page,
  hasNext: res.hasNext,
});

export const memoApi = {
  // N01
  async list(targetType: MemoTargetType, targetId: number, page = 0): Promise<Page<Memo>> {
    const res = isMockMode()
      ? await mockMemos.list(targetType, targetId, page)
      : await apiRequest<PageResponse<MemoResponse>>('/private-memos', { query: { targetType, targetId, page } });
    return toPage(res, toMemo);
  },
  // N02
  async create(targetType: MemoTargetType, targetId: number, content: string): Promise<Memo> {
    const body = { targetType, targetId, content };
    const res = isMockMode()
      ? await mockMemos.create(body)
      : await apiRequest<MemoResponse>('/private-memos', { method: 'POST', body });
    return toMemo(res);
  },
  // N04
  async update(memoId: number, content: string): Promise<Memo> {
    const res = isMockMode()
      ? await mockMemos.update(memoId, content)
      : await apiRequest<MemoResponse>(`/private-memos/${memoId}`, { method: 'PATCH', body: { content } });
    return toMemo(res);
  },
  // N05
  async remove(memoId: number): Promise<void> {
    if (isMockMode()) return mockMemos.remove(memoId);
    await apiRequest<void>(`/private-memos/${memoId}`, { method: 'DELETE' });
  },
};

export const commentApi = {
  // N06
  async list(coupleId: CoupleId, targetType: CommentTargetType, targetId: number, page = 0): Promise<Page<Comment>> {
    const res = isMockMode()
      ? await mockComments.list(coupleId, targetType, targetId, page)
      : await apiRequest<PageResponse<CommentResponse>>(`/couples/${coupleId}/comments`, {
          query: { targetType, targetId, page },
        });
    return toPage(res, toComment);
  },
  // N07
  async create(coupleId: CoupleId, targetType: CommentTargetType, targetId: number, content: string): Promise<Comment> {
    const body = { targetType, targetId, content };
    const res = isMockMode()
      ? await mockComments.create(coupleId, body)
      : await apiRequest<CommentResponse>(`/couples/${coupleId}/comments`, { method: 'POST', body });
    return toComment(res);
  },
  // N08
  async update(coupleId: CoupleId, commentId: number, content: string): Promise<Comment> {
    const res = isMockMode()
      ? await mockComments.update(coupleId, commentId, content)
      : await apiRequest<CommentResponse>(`/couples/${coupleId}/comments/${commentId}`, {
          method: 'PATCH',
          body: { content },
        });
    return toComment(res);
  },
  // N09
  async remove(coupleId: CoupleId, commentId: number): Promise<void> {
    if (isMockMode()) return mockComments.remove(coupleId, commentId);
    await apiRequest<void>(`/couples/${coupleId}/comments/${commentId}`, { method: 'DELETE' });
  },
};
