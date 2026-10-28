import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors, fontSize, spacing } from '@/theme';

import { useLogin } from '../hooks/useAuth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const login = useLogin();
  const useMock = useSettingsStore((s) => s.useMock);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.logo}>원클릭밋</Text>
        <Text style={styles.sub}>저장한 장소로 데이트 코스를 한 번에</Text>
      </View>

      <TextField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="8자 이상"
      />

      <ErrorBanner error={login.error} />

      <Button
        title="로그인"
        loading={login.isPending}
        disabled={!canSubmit}
        onPress={() => login.mutate({ email: email.trim(), password })}
      />

      <Button title="이메일로 회원가입" variant="secondary" onPress={() => router.push('/signup')} />

      {useMock ? (
        <Text style={styles.hint}>데모 계정: demo@oneclickmeet.app / demo1234</Text>
      ) : null}

      <Button
        title="개발자 설정 (서버 주소)"
        variant="text"
        onPress={() => router.push('/dev-settings')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.lg, gap: spacing.xs },
  logo: { fontSize: 32, fontWeight: '800', color: colors.primary },
  sub: { fontSize: fontSize.body, color: colors.textSub },
  hint: { fontSize: fontSize.caption, color: colors.textSub, textAlign: 'center' },
});
