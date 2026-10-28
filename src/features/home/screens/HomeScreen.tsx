import { StyleSheet, Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/stores/authStore';
import { colors, fontSize } from '@/theme';

export function HomeScreen() {
  const member = useAuthStore((s) => s.member);
  return (
    <Screen>
      <Text style={styles.heading}>안녕하세요, {member?.displayName ?? ''}님</Text>
      <Placeholder title="최근 저장한 장소·코스" milestone="M2~M3" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
});
