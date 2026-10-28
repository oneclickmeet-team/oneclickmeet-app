import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

// 아직 만들지 않은 화면 자리. 어느 마일스톤에서 채울지 적어 둔다.
export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{milestone}에서 만들 예정</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  desc: { fontSize: fontSize.caption, color: colors.textSub },
});
