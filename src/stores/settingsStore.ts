import { create } from 'zustand';

import { readJson, StorageKeys, writeJson } from '@/lib/secureStorage';

// 개발자 설정: 서버 주소와 mock 전환.
// 노트북 IP가 바뀌어도 앱 재빌드 없이 마이 탭에서 바꿀 수 있게 한다.
const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.0.10:8080/api/v1';
// 서버가 준비되기 전까지 기본은 mock. .env에서 EXPO_PUBLIC_USE_MOCK=false로 바꾼다.
const DEFAULT_USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

interface PersistedSettings {
  apiBaseUrl: string;
  useMock: boolean;
}

interface SettingsState extends PersistedSettings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setApiBaseUrl: (url: string) => void;
  setUseMock: (useMock: boolean) => void;
}

function persist(state: PersistedSettings) {
  void writeJson(StorageKeys.settings, {
    apiBaseUrl: state.apiBaseUrl,
    useMock: state.useMock,
  });
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiBaseUrl: DEFAULT_API_BASE_URL,
  useMock: DEFAULT_USE_MOCK,
  hydrated: false,

  hydrate: async () => {
    const saved = await readJson<PersistedSettings>(StorageKeys.settings);
    set({ ...(saved ?? {}), hydrated: true });
  },

  setApiBaseUrl: (url) => {
    set({ apiBaseUrl: url.trim().replace(/\/+$/, '') });
    persist(get());
  },

  setUseMock: (useMock) => {
    set({ useMock });
    persist(get());
  },
}));

export const isMockMode = () => useSettingsStore.getState().useMock;
