import { Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { Screen } from '@/components/Screen';
import { colors, fontSize } from '@/theme';

export default function StorageTab() {
  return (
    <Screen>
      <Text style={{ fontSize: fontSize.heading, fontWeight: '800', color: colors.text }}>보관함</Text>
      <Placeholder title="저장한 장소 목록" milestone="M2" />
    </Screen>
  );
}
