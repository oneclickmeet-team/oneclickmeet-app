import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useDebounced } from '@/lib/useDebounced';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { RegionId } from '@/types/api';
import type { Candidate } from '@/types/model';

import { parseSharedContent } from '@/features/share/lib/parseSharedContent';

import { toPlaceInput } from '../api/placeApi';
import { CandidateList } from '../components/CandidateList';
import {
  useCandidateSearch,
  useCreatePlace,
  useRecognizeLink,
  useRegions,
} from '../hooks/usePlaces';

// 직접 검색(P02), 링크 붙여넣기(P03), 직접 입력(P06) 세 가지 방법으로 장소를 추가한다.
export function AddPlaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string; sourceUrl?: string }>();

  const [query, setQuery] = useState(params.query ?? '');
  const [regionId, setRegionId] = useState<RegionId | undefined>(undefined);
  const [link, setLink] = useState('');
  const [linkCandidates, setLinkCandidates] = useState<Candidate[] | null>(null);
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState(params.query ?? '');
  const [manualAddress, setManualAddress] = useState('');

  const debouncedQuery = useDebounced(query.trim());
  const regions = useRegions();
  const search = useCandidateSearch({ query: debouncedQuery || undefined, regionId });
  const recognize = useRecognizeLink();
  const create = useCreatePlace();

  const sourceUrl = params.sourceUrl ?? (link.trim() || null);

  const save = (c: Candidate) =>
    create.mutate(toPlaceInput({ ...c, sourceUrl: c.sourceUrl ?? sourceUrl }), {
      onSuccess: (place) => router.replace(`/place/${place.id}`),
    });

  const findByLink = () => {
    setLinkCandidates(null);
    recognize.reset();
    const text = link.trim();
    // 공유 문구 전체를 붙여 넣은 경우: 네이버지도면 이름을 바로 검색한다.
    const parsed = parseSharedContent({ text, webUrl: null, files: null, type: 'text', meta: null });
    if (parsed.kind === 'naverMap') {
      setQuery(parsed.name);
      return;
    }
    const url = text.match(/https?:\/\/\S+/)?.[0] ?? null;
    recognize.mutate(
      { sourceUrl: url, sharedText: url === text ? null : text },
      {
        onSuccess: (r) => {
          if (r.found) setLinkCandidates(r.candidates);
          else if (r.extractedQuery) setQuery(r.extractedQuery);
        },
      },
    );
  };

  const hasSearchInput = Boolean(debouncedQuery) || regionId !== undefined;

  return (
    <Screen edges={[]}>
      <View style={styles.section}>
        <TextField
          label="장소 이름으로 검색"
          value={query}
          onChangeText={setQuery}
          placeholder="예: 한성대입구역 카페"
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="전체 지역" selected={regionId === undefined} onPress={() => setRegionId(undefined)} />
          {regions.data?.map((r) => (
            <Chip
              key={r.regionId}
              label={r.name}
              selected={regionId === r.regionId}
              onPress={() => setRegionId(r.regionId)}
            />
          ))}
        </ScrollView>
      </View>

      <ErrorBanner error={create.error} />

      {hasSearchInput ? (
        <CandidateList
          candidates={search.data?.items ?? []}
          loading={search.isFetching}
          error={search.error}
          savingName={create.isPending ? create.variables?.name : null}
          onSave={save}
          emptyText="검색 결과가 없어요. 아래에서 직접 입력할 수 있어요."
        />
      ) : null}

      <View style={styles.box}>
        <Text style={styles.boxTitle}>링크로 찾기</Text>
        <TextField
          label="링크 또는 공유 문구"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          multiline
          placeholder="네이버지도 '공유 > 복사'한 문구를 통째로 붙여 넣으면 가장 잘 찾아요"
        />
        <Button
          title="링크에서 장소 찾기"
          variant="secondary"
          disabled={!link.trim()}
          loading={recognize.isPending}
          onPress={findByLink}
        />
        <ErrorBanner error={recognize.error} />
        {recognize.data && !recognize.data.found ? (
          <Text style={styles.note}>
            {recognize.data.message ?? '장소를 찾지 못했어요.'} 위에서 이름으로 검색해 주세요.
          </Text>
        ) : null}
        {linkCandidates ? (
          <CandidateList
            candidates={linkCandidates}
            savingName={create.isPending ? create.variables?.name : null}
            onSave={save}
          />
        ) : null}
      </View>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>목록에 없나요?</Text>
        {manual ? (
          <>
            <TextField label="장소 이름" value={manualName} onChangeText={setManualName} />
            <TextField label="주소 (선택)" value={manualAddress} onChangeText={setManualAddress} />
            <Text style={styles.note}>직접 입력한 장소는 위치 정보가 없어서 코스 추천 기준으로는 못 써요.</Text>
            <Button
              title="이대로 저장"
              disabled={!manualName.trim()}
              loading={create.isPending && create.variables?.name === manualName.trim()}
              onPress={() =>
                save({
                  name: manualName.trim(),
                  address: manualAddress.trim() || null,
                  coords: null,
                  sourceUrl: null,
                  categoryLabel: null,
                  openingHours: null,
                })
              }
            />
          </>
        ) : (
          <Button title="직접 입력하기" variant="text" onPress={() => setManual(true)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  boxTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  note: { fontSize: fontSize.caption, color: colors.textSub },
});
