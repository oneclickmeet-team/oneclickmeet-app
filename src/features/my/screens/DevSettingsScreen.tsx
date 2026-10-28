import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors, fontSize, radius, spacing } from '@/theme';

type CheckResult = { ok: boolean; message: string } | null;

// 시연 때 노트북 IP가 바뀌면 여기서 고친다. 재빌드 필요 없음.
export function DevSettingsScreen() {
  const { apiBaseUrl, useMock, setApiBaseUrl, setUseMock } = useSettingsStore();
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult>(null);

  const dirty = draftUrl.trim().replace(/\/+$/, '') !== apiBaseUrl;

  // 서버가 살아 있는지만 본다. 어떤 응답이든 오면 연결은 된 것이다.
  const checkConnection = async () => {
    setChecking(true);
    setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${draftUrl.trim().replace(/\/+$/, '')}/members/me`, {
        signal: controller.signal,
      });
      setResult({ ok: true, message: `연결됨 (HTTP ${res.status})` });
    } catch {
      setResult({
        ok: false,
        message: '연결 실패. 같은 와이파이인지, 주소·포트가 맞는지, 서버가 켜져 있는지 확인하세요.',
      });
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  };

  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.title}>mock 서버 사용</Text>
            <Text style={styles.desc}>켜면 앱 안의 가짜 데이터로 동작해요. 서버 없이 시연할 때 씁니다.</Text>
          </View>
          <Switch
            value={useMock}
            onValueChange={setUseMock}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <TextField
          label="서버 주소 (기본 경로 포함)"
          value={draftUrl}
          onChangeText={setDraftUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.0.10:8080/api/v1"
        />
        <Button title="연결 확인" variant="secondary" loading={checking} onPress={checkConnection} />
        {result ? (
          <Text style={[styles.result, { color: result.ok ? colors.text : colors.danger }]}>
            {result.message}
          </Text>
        ) : null}
        <Button title="주소 저장" disabled={!dirty} onPress={() => setApiBaseUrl(draftUrl)} />
        <Text style={styles.desc}>현재: {apiBaseUrl}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  desc: { fontSize: fontSize.caption, color: colors.textSub },
  result: { fontSize: fontSize.caption },
});
