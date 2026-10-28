import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/theme';

// 순서: ShareIntentProvider(가장 바깥) > QueryClientProvider > 로그인 분기
export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </ShareIntentProvider>
  );
}

function useBootstrap() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // 설정을 먼저 읽어야 서버 주소·mock 여부가 정해진다.
    void (async () => {
      await useSettingsStore.getState().hydrate();
      await useAuthStore.getState().hydrate();
      setReady(true);
    })();
  }, []);
  return ready;
}

// 공유로 들어온 데이터는 로그인된 뒤에 처리한다.
// 로그인 전이면 Provider가 들고 있다가, 로그인하는 순간 이동한다.
function useShareRedirect(enabled: boolean) {
  const router = useRouter();
  const { hasShareIntent, shareIntent } = useShareIntentContext();
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!enabled || !hasShareIntent || handled.current === shareIntent) return;
    handled.current = shareIntent;
    router.push('/share-receive');
  }, [enabled, hasShareIntent, shareIntent, router]);
}

function RootNavigator() {
  const ready = useBootstrap();
  const status = useAuthStore((s) => s.status);
  const signedIn = ready && status === 'signedIn';
  useShareRedirect(signedIn);

  if (!ready || status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, headerTintColor: colors.text }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="share-receive" options={{ headerShown: true, title: '공유 받은 내용' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="dev-settings" options={{ headerShown: true, title: '개발자 설정' }} />
    </Stack>
  );
}
