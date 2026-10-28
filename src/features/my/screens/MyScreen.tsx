import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { useLogout, useMe } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontSize, radius, spacing } from '@/theme';

export function MyScreen() {
  const router = useRouter();
  const me = useMe();
  const member = useAuthStore((s) => s.member);
  const logout = useLogout();

  return (
    <Screen>
      <Text style={styles.heading}>마이</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{member?.displayName ?? '...'}</Text>
        <Text style={styles.desc}>
          {member?.currentCoupleId ? '커플 연결됨' : '아직 커플 연결 전이에요'}
        </Text>
      </View>
      <ErrorBanner error={me.error} />

      <View style={styles.card}>
        <Text style={styles.section}>설정</Text>
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
