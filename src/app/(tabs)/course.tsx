import { Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { Screen } from '@/components/Screen';
import { colors, fontSize } from '@/theme';

export default function CourseTab() {
  return (
    <Screen>
      <Text style={{ fontSize: fontSize.heading, fontWeight: '800', color: colors.text }}>코스</Text>
      <Placeholder title="코스 추천·저장" milestone="M3" />
    </Screen>
  );
}
