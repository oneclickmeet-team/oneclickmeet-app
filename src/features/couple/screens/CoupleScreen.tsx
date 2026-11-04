import { useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Couple, Invitation } from '@/types/model';

import { useAcceptInvite, useCurrentCouple, useDisconnect, useInvite, useReconnect } from '../hooks/useCouple';

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 커플 연결은 개인 기능의 선행 조건이 아니다. 연결 없이도 앱을 다 쓸 수 있다.
export function CoupleScreen() {
  const { couple, isPending, error } = useCurrentCouple();

  if (isPending) {
    return (
      <Screen edges={[]} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <ErrorBanner error={error} />
      {couple?.status === 'ACTIVE' ? <Connected couple={couple} /> : null}
      {couple?.status === 'GRACE' ? <Grace couple={couple} /> : null}
      {!couple ? (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>아직 연결 전이에요</Text>
            <Text style={styles.sub}>
              연결하면 고른 장소와 코스를 상대와 같이 보고 편집할 수 있어요. 내 보관함 전체가 보이지는 않아요.
            </Text>
          </View>
          <ConnectSection />
        </>
      ) : null}
    </Screen>
  );
}

function InvitationBox({ invitation }: { invitation: Invitation }) {
  return (
    <View style={styles.codeBox}>
      <Text style={styles.code} selectable>
        {invitation.code}
      </Text>
      <Text style={styles.sub}>{formatTime(invitation.expiresAt)}까지 쓸 수 있어요 (24시간)</Text>
      <Button
        title="코드 보내기"
        variant="secondary"
        onPress={() =>
          void Share.share({
            message: `원클릭밋에서 나랑 연결하자! 코드: ${invitation.code}`,
          })
        }
      />
    </View>
  );
}

function ConnectSection({ warning }: { warning?: string }) {
  const invite = useInvite();
  const accept = useAcceptInvite();
  const [code, setCode] = useState('');

  return (
    <>
      {warning ? <Text style={styles.warn}>{warning}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.section}>내 코드를 상대에게 보내기</Text>
        {invite.data ? <InvitationBox invitation={invite.data} /> : null}
        <ErrorBanner error={invite.error} />
        <Button
          title={invite.data ? '새 코드 만들기' : '초대 코드 만들기'}
          loading={invite.isPending}
          onPress={() => invite.mutate({ purpose: 'CONNECT' })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>상대 코드 입력하기</Text>
        <TextField
          label="초대 코드"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="예: AB7K2QXM"
          maxLength={16}
        />
        <ErrorBanner error={accept.error} />
        <Button
          title="연결하기"
          disabled={code.trim().length < 4}
          loading={accept.isPending}
          onPress={() => accept.mutate(code, { onSuccess: () => setCode('') })}
        />
      </View>
    </>
  );
}

function Connected({ couple }: { couple: Couple }) {
  const disconnect = useDisconnect();
  const name = couple.partner?.name ?? '상대';

  const confirm = () =>
    Alert.alert(
      '연결 해제',
      `${name}와 연결을 해제할까요?\n\n· 30일 동안은 공동 기록을 읽기만 할 수 있어요.\n· 내가 공유한 장소·코스는 내 보관함에 따로 남아요.\n· 30일 안에 재연결하면 다시 같이 편집할 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '해제', style: 'destructive', onPress: () => disconnect.mutate(couple.id) },
      ],
    );

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.badge}>연결됨</Text>
        <Text style={styles.title}>{name}와 연결되어 있어요</Text>
        <Text style={styles.sub}>
          보관함·코스 탭의 "우리" 쪽에서 공유한 장소와 코스를 같이 볼 수 있어요. 장소나 코스 상세에서 "공유하기"를 누르면 추가돼요.
        </Text>
      </View>
      <ErrorBanner error={disconnect.error} />
      <Button title="연결 해제" variant="text" loading={disconnect.isPending} onPress={confirm} />
    </>
  );
}

function Grace({ couple }: { couple: Couple }) {
  const invite = useInvite();
  const reconnect = useReconnect();
  const [code, setCode] = useState('');
  const name = couple.partner?.name ?? '상대';

  return (
    <>
      <View style={[styles.card, styles.graceCard]}>
        <Text style={[styles.badge, styles.graceBadge]}>연결 해제됨</Text>
        <Text style={styles.title}>{couple.graceDaysLeft ?? 0}일 뒤에 완전히 종료돼요</Text>
        <Text style={styles.sub}>
          지금은 공동 기록을 읽기만 할 수 있어요. 종료되면 공동 장소·코스는 두 사람 보관함에 각자 사본으로 남아요.
        </Text>
      </View>

      {couple.canReconnect ? (
        <>
          <View style={styles.card}>
            <Text style={styles.section}>{name}와 재연결하기</Text>
            <Text style={styles.sub}>한 사람이 재연결 코드를 만들고, 다른 사람이 입력하면 돼요.</Text>
            {invite.data ? <InvitationBox invitation={invite.data} /> : null}
            <ErrorBanner error={invite.error} />
            <Button
              title="재연결 코드 만들기"
              variant="secondary"
              loading={invite.isPending}
              onPress={() => invite.mutate({ purpose: 'RECONNECT', coupleId: couple.id })}
            />
            <TextField
              label="상대의 재연결 코드"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
            />
            <ErrorBanner error={reconnect.error} />
            <Button
              title="재연결"
              disabled={code.trim().length < 4}
              loading={reconnect.isPending}
              onPress={() => reconnect.mutate({ id: couple.id, code }, { onSuccess: () => setCode('') })}
            />
          </View>
        </>
      ) : null}

      <ConnectSection warning={`다른 사람과 새로 연결하면 ${name}와의 공동 기록은 바로 종료되고 각자 사본으로 남아요.`} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  graceCard: { backgroundColor: colors.warningSoft },
  title: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  section: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  sub: { fontSize: fontSize.caption, color: colors.textSub, lineHeight: 18 },
  warn: { fontSize: fontSize.caption, color: colors.warning },
  badge: {
    alignSelf: 'flex-start',
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  graceBadge: { color: colors.warning, backgroundColor: colors.surface },
  codeBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 4, color: colors.text },
});
