import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { MiniButton } from '@/components/MiniButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useLogout, useMe, useUpdateMe } from '@/features/auth/hooks/useAuth';
import { useCurrentCouple } from '@/features/couple/hooks/useCouple';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontSize, radius, spacing } from '@/theme';

export function MyScreen() {
  const router = useRouter();
  const me = useMe();
  const member = useAuthStore((s) => s.member);
  const logout = useLogout();
  const { couple } = useCurrentCouple();
  const updateMe = useUpdateMe();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameInvalid = nameDraft !== null && (nameDraft.trim().length === 0 || nameDraft.length > 50);
  const coupleText = !couple
    ? '아직 커플 연결 전이에요'
    : couple.status === 'ACTIVE'
      ? `${couple.partner?.name ?? '상대'}와 연결됨`
      : `연결 해제됨 · ${couple.graceDaysLeft ?? 0}일 뒤 종료`;

  return (
    <Screen>
      <Text style={styles.heading}>마이</Text>

      <View style={styles.card}>
        {nameDraft === null ? (
          <View style={styles.nameRow}>
            <Text style={styles.name}>{member?.displayName ?? '...'}</Text>
            <MiniButton label="이름 바꾸기" onPress={() => setNameDraft(member?.displayName ?? '')} />
          </View>
        ) : (
          <>
            <TextField
              label="표시 이름 (상대에게 보여요)"
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={50}
              autoFocus
              error={nameInvalid ? '1~50자로 입력해 주세요.' : undefined}
            />
            <ErrorBanner error={updateMe.error} />
            <View style={styles.nameRow}>
              <MiniButton
                label="취소"
                onPress={() => {
                  setNameDraft(null);
                  updateMe.reset();
                }}
              />
              <MiniButton
                label={updateMe.isPending ? '저장 중…' : '저장'}
                disabled={nameInvalid || updateMe.isPending}
                onPress={() =>
                  updateMe.mutate({ displayName: nameDraft.trim() }, { onSuccess: () => setNameDraft(null) })
                }
              />
            </View>
          </>
        )}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  section: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
  desc: { fontSize: fontSize.caption, color: colors.textSub },
});
