import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/theme';

import { parseSharedContent, type SharedContent } from '../lib/parseSharedContent';

// M1: 받은 내용을 분류해서 보여 주기만 한다.
// M2에서 각 종류별로 후보 검색(P02)·링크 분석(P03)·이미지 인식(P04)으로 이어 붙인다.
const NEXT_STEP: Record<SharedContent['kind'], string> = {
  naverMap: '장소명·주소로 후보 검색(P02) → 저장(P06)',
  instagram: '서버에 링크 분석 요청(P03) → 후보 확인 → 저장',
  image: '서버에 이미지 업로드(P04) → 후보 확인 → 저장',
  url: '서버에 링크 분석 요청(P03)',
  text: '직접 검색 화면으로 이동',
  unsupported: '지원하지 않는 형식',
};

const KIND_LABEL: Record<SharedContent['kind'], string> = {
  naverMap: '네이버지도',
  instagram: '인스타그램',
  image: '이미지',
  url: '링크',
  text: '텍스트',
  unsupported: '알 수 없음',
};

export function ShareReceiveScreen() {
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const content = useMemo(() => parseSharedContent(shareIntent), [shareIntent]);

  const done = () => {
    resetShareIntent();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <Text style={styles.kind}>{KIND_LABEL[content.kind]}</Text>
        <ContentBody content={content} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>다음 단계 (M2)</Text>
        <Text style={styles.value}>{NEXT_STEP[content.kind]}</Text>
      </View>

      <Button title="닫기" variant="secondary" onPress={done} />
    </Screen>
  );
}

function ContentBody({ content }: { content: SharedContent }) {
  switch (content.kind) {
    case 'naverMap':
      return (
        <>
          <Field label="장소명" value={content.name} />
          <Field label="주소" value={content.address} />
          <Field label="링크" value={content.url} />
        </>
      );
    case 'instagram':
      return <Field label="링크" value={content.url} />;
    case 'image':
      return <Image source={{ uri: content.uri }} style={styles.image} />;
    case 'url':
      return (
        <>
          <Field label="링크" value={content.url} />
          <Field label="함께 온 글" value={content.text} />
        </>
      );
    case 'text':
      return <Field label="글" value={content.text} />;
    case 'unsupported':
      return <Text style={styles.value}>받은 내용이 없어요.</Text>;
  }
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value ?? '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  kind: { fontSize: fontSize.title, fontWeight: '800', color: colors.primary },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textSub },
  value: { fontSize: fontSize.body, color: colors.text },
  image: { width: '100%', height: 320, resizeMode: 'contain', backgroundColor: colors.background },
});
