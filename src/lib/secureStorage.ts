import * as SecureStore from 'expo-secure-store';

// 토큰과 설정을 기기에 저장한다. 실패해도 앱이 죽지 않게 감싼다.
export const StorageKeys = {
  session: 'ocm.session',
  settings: 'ocm.settings',
} as const;

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시한다. 다음 실행 때 다시 로그인하면 된다.
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // 무시
  }
}
