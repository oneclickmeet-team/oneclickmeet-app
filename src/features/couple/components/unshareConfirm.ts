import { Alert } from 'react-native';

import type { UnshareScope } from '@/types/api';

// 공유 취소 범위는 필수이고 기본값이 없다(TRD 10.2). 실행 전에 범위를 고르게 한다.
export function confirmUnshare(kind: '장소' | '코스', sharedByMe: boolean, run: (scope: UnshareScope) => void) {
  const owner = sharedByMe ? '내 보관함의 원본' : '상대 보관함의 원본';
  Alert.alert(`공동 ${kind}에서 빼기`, `어떻게 뺄까요?\n\n· 공동에서만 빼기: ${owner}은 그대로 남아요.\n· 원본까지 삭제: ${owner}도 지워져요. 메모는 각자에게 남아요.`, [
    { text: '취소', style: 'cancel' },
    { text: '공동에서만 빼기', onPress: () => run('SHARED_ONLY') },
    { text: '원본까지 삭제', style: 'destructive', onPress: () => run('PERSONAL_AND_SHARED') },
  ]);
}
