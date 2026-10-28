import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/problem';
import { colors, fontSize } from '@/theme';

import { useSignup } from '../hooks/useAuth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TRD 4.1 입력 제한: 이메일 형식, 비밀번호 8~64자(초안), 이름 1~50자
function validate(email: string, password: string, displayName: string) {
  const errors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) errors.email = '이메일 형식이 아니에요.';
  if (password.length < 8 || password.length > 64) errors.password = '8~64자로 입력해 주세요.';
  if (displayName.trim().length === 0 || displayName.length > 50) {
    errors.displayName = '1~50자로 입력해 주세요.';
  }
  return errors;
}

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const signup = useSignup();

  const localErrors = validate(email.trim(), password, displayName);
  // 서버가 돌려준 필드 오류도 해당 칸에 표시한다.
  const serverErrors: Record<string, string> = {};
  if (signup.error instanceof ApiError) {
    for (const e of signup.error.fieldErrors) serverErrors[e.field] = e.message;
  }
  const fieldError = (field: string) =>
    (submitted ? localErrors[field] : undefined) ?? serverErrors[field];

  const onSubmit = () => {
    setSubmitted(true);
    if (Object.keys(localErrors).length > 0) return;
    signup.mutate({ email: email.trim(), password, displayName: displayName.trim() });
  };

  return (
    <Screen edges={[]}>
      <TextField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={fieldError('email')}
      />
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="8~64자"
        error={fieldError('password')}
      />
      <TextField
        label="표시 이름"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="상대에게 보이는 이름"
        error={fieldError('displayName')}
      />

      <ErrorBanner error={signup.error} />

      <Button title="가입하고 시작하기" loading={signup.isPending} onPress={onSubmit} />
      <Text style={styles.hint}>가입하면 바로 로그인돼요.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: fontSize.caption, color: colors.textSub, textAlign: 'center' },
});
