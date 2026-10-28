import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { toPlaceInput } from '@/features/place/api/placeApi';
import { CandidateList } from '@/features/place/components/CandidateList';
import {
  useCandidateSearch,
  useCreatePlace,
  useRecognizeImage,
  useRecognizeLink,
} from '@/features/place/hooks/usePlaces';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Candidate } from '@/types/model';

import { parseSharedContent, type SharedContent } from '../lib/parseSharedContent';

const KIND_LABEL: Record<SharedContent['kind'], string> = {
  naverMap: '네이버지도에서 받은 장소',
  instagram: '인스타그램 링크',
  image: '스크린샷',
  url: '링크',
  text: '텍스트',
  unsupported: '알 수 없는 형식',
};

// 공유 → 후보 확인 → 저장(P06). 인식만으로는 저장하지 않는다(TRD 6.2).
export function ShareReceiveScreen() {
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const content = useMemo(() => parseSharedContent(shareIntent), [shareIntent]);

  const create = useCreatePlace();
  const recognizeLink = useRecognizeLink();
  const recognizeImage = useRecognizeImage();

  // 네이버지도는 이름을 이미 알고 있으니 바로 후보 검색(P02)
  const naverQuery = content.kind === 'naverMap' ? content.name : undefined;
  const naverSearch = useCandidateSearch({ query: naverQuery }, content.kind === 'naverMap');

  // 링크·이미지는 화면에 들어오자마자 한 번만 인식 요청
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (content.kind === 'instagram' || content.kind === 'url') {
      recognizeLink.mutate({
        sourceUrl: content.url,
        sharedText: content.kind === 'url' ? content.text : null,
      });
    } else if (content.kind === 'image') {
      recognizeImage.mutate({ uri: content.uri, mimeType: content.mimeType, fileName: content.fileName });
    }
  }, [content, recognizeLink, recognizeImage]);

  const sharedUrl =
    content.kind === 'naverMap' || content.kind === 'instagram' || content.kind === 'url'
      ? content.url
      : null;

  const finish = (path: `/place/${string}` | '/place/add', query?: string) => {
    resetShareIntent();
    if (path === '/place/add') {
      router.replace({ pathname: '/place/add', params: { query: query ?? '', sourceUrl: sharedUrl ?? '' } });
    } else {
      router.replace(path);
    }
  };

  const save = (c: Candidate) =>
    create.mutate(toPlaceInput({ ...c, sourceUrl: sharedUrl ?? c.sourceUrl }), {
      onSuccess: (place) => finish(`/place/${place.id}`),
    });

  const savingName = create.isPending ? create.variables?.name : null;

  // 종류별 후보·상태
  let candidates: Candidate[] = [];
  let loading = false;
  let error: unknown = null;
  let fallbackQuery: string | undefined;
  let notFoundMessage: string | null = null;

  if (content.kind === 'naverMap') {
    candidates = naverSearch.data?.items ?? [];
    loading = naverSearch.isFetching;
    error = naverSearch.error;
    fallbackQuery = content.name;
  } else if (content.kind === 'instagram' || content.kind === 'url') {
    const r = recognizeLink.data;
    candidates = r?.candidates ?? [];
    loading = recognizeLink.isPending;
    error = recognizeLink.error;
    fallbackQuery = r?.extractedQuery ?? undefined;
    if (r && !r.found) notFoundMessage = r.message ?? '링크에서 장소를 찾지 못했어요.';
  } else if (content.kind === 'image') {
    const r = recognizeImage.data;
    candidates = r?.candidates ?? [];
    loading = recognizeImage.isPending;
    error = recognizeImage.error;
    fallbackQuery = r?.extractedQuery ?? undefined;
    if (r && !r.found) notFoundMessage = r.message ?? '이미지에서 장소를 찾지 못했어요.';
  } else if (content.kind === 'text') {
    fallbackQuery = content.text.split('\n')[0]?.slice(0, 50);
  }

  return (
    <Screen edges={[]}>
      <View style={styles.card}>
        <Text style={styles.kind}>{KIND_LABEL[content.kind]}</Text>
        <SharedPreview content={content} />
      </View>

      {content.kind === 'naverMap' ? (
        <View style={styles.card}>
          <Text style={styles.label}>공유된 정보 그대로 저장</Text>
          <Text style={styles.note}>위치 정보 없이 저장돼요. 코스 추천에 쓰려면 아래 후보에서 고르세요.</Text>
          <Button
            title="이 정보로 저장"
            variant="secondary"
            loading={savingName === content.name && !candidates.some((c) => c.name === content.name)}
            disabled={Boolean(savingName)}
            onPress={() =>
              save({
                name: content.name,
                address: content.address,
                coords: null,
                sourceUrl: content.url,
                categoryLabel: null,
                openingHours: null,
              })
            }
          />
        </View>
      ) : null}

      {content.kind !== 'text' && content.kind !== 'unsupported' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이 장소가 맞나요?</Text>
          {notFoundMessage ? <Text style={styles.note}>{notFoundMessage}</Text> : null}
          <CandidateList
            candidates={candidates}
            loading={loading}
            error={error}
            savingName={savingName}
            onSave={save}
            emptyText={notFoundMessage ? '' : '찾은 후보가 없어요.'}
          />
        </View>
      ) : null}

      <ErrorBanner error={create.error} />

      <Button
        title="직접 검색해서 고르기"
        variant="secondary"
        onPress={() => finish('/place/add', fallbackQuery)}
      />
      <Button
        title="저장하지 않고 닫기"
        variant="text"
        onPress={() => {
          resetShareIntent();
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
    </Screen>
  );
}

function SharedPreview({ content }: { content: SharedContent }) {
  switch (content.kind) {
    case 'naverMap':
      return (
        <>
          <Text style={styles.value}>{content.name}</Text>
          <Text style={styles.note}>{content.address ?? '주소 없음'}</Text>
        </>
      );
    case 'instagram':
    case 'url':
      return (
        <Text style={styles.note} numberOfLines={2}>
          {content.url}
        </Text>
      );
    case 'image':
      return <Image source={{ uri: content.uri }} style={styles.image} />;
    case 'text':
      return <Text style={styles.value}>{content.text}</Text>;
    case 'unsupported':
      return <Text style={styles.note}>받은 내용이 없어요.</Text>;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  kind: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
  label: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  value: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  note: { fontSize: fontSize.caption, color: colors.textSub },
  image: { width: '100%', height: 220, resizeMode: 'contain', backgroundColor: colors.background },
});
