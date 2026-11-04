import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { useLogout, useMe } from '@/features/auth/hooks/useAuth';
import { useCurrentCouple } from '@/features/couple/hooks/useCouple';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontSize, radius, spacing } from '@/theme';

export function MyScreen() {
  const router = useRouter();
  const me = useMe();
  const member = useAuthStore((s) => s.member);
  const logout = useLogout();
  const { couple } = useCurrentCouple();
  const coupleText = !couple
    ? '아직 커플 연결 전이에요'
    : couple.status === 'ACTIVE'
      ? `${couple.partner?.name ?? '상대'}와 연결됨`
      : `연결 해제됨 · ${couple.graceDaysLeft ?? 0}일 뒤 종료`;

  return (
    <Screen>
      <Text style={styles.heading}>마이</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{member?.displayName ?? '...'}</Text>
        <Text style={styles.desc}>{coupleText}</Text>
        <Button
          title={couple ? '커플 연결 관리' : '커플 연결하기'}
          variant="secondary"
          onPress={() => router.push('/couple')}
        />
      </View>
      <ErrorBanner error={me.error} />

      <View style={styles.card}>
        <Text style={styles.section}>설정</Text>
        <Button title="알림" variant="secondary" onPress={() => router.push('/notifications')} />
        <Button
          title="개발자 설정 (서버 주소, mock)"
          variant="secondary"
          onPress={() => router.push('/dev-settings')}
        />
        <Button title="로그아웃" variant="text" loading={logout.isPending} onPress={() => logout.mutate()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  name: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  section: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
  desc: { fontSize: fontSize.caption, color: colors.textSub },
});
