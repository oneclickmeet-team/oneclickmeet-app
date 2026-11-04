import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

// 연결 해제 유예(GRACE) 중인 공동 기록 위에 띄운다.
export function GraceBanner({ daysLeft }: { daysLeft: number | null }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>연결 해제됨 · 읽기 전용</Text>
      <Text style={styles.text}>
        {daysLeft !== null ? `${daysLeft}일 안에 재연결하면 다시 같이 편집할 수 있어요.` : '재연결하면 다시 같이 편집할 수 있어요.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.warning },
  text: { fontSize: fontSize.caption, color: colors.warning },
});
