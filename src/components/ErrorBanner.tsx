import { StyleSheet, Text, View } from 'react-native';

import { toUserMessage } from '@/lib/problem';
import { colors, fontSize, radius, spacing } from '@/theme';

// 오류 객체를 받아 사용자 문구로 보여 준다. 오류가 없으면 아무것도 그리지 않는다.
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{toUserMessage(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  text: { color: colors.danger, fontSize: fontSize.body },
});
