import { StyleSheet, Text, View } from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';
import { colors, fontSize, spacing } from '@/theme';

// mock 모드일 때 화면 위에 띄워 실서버 결과와 헷갈리지 않게 한다.
export function DemoBadge() {
  const useMock = useSettingsStore((s) => s.useMock);
  if (!useMock) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>데모 데이터 (mock 서버)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.warningSoft,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  text: { color: colors.warning, fontSize: fontSize.caption, fontWeight: '700' },
});
