import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DemoBadge } from '@/components/DemoBadge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { SegmentTabs } from '@/components/SegmentTabs';
import { TextField } from '@/components/TextField';
import { GraceBanner } from '@/features/couple/components/GraceBanner';
import { useCurrentCouple, useSharedPlaces } from '@/features/couple/hooks/useCouple';
import { useDebounced } from '@/lib/useDebounced';
import { colors, fontSize, spacing } from '@/theme';
import type { Couple } from '@/types/model';

import { PlaceRow } from '../components/PlaceRow';
import { usePlaceList } from '../hooks/usePlaces';

type Tab = 'mine' | 'ours';

// 보관함 탭: 내 보관함(P05) / 우리 보관함(S01). 연결 전이면 내 보관함만 보인다.
export function StorageScreen() {
  const { couple } = useCurrentCouple();
  const [tab, setTab] = useState<Tab>('mine');
  const showOurs = couple !== null && tab === 'ours';

  const tabs = couple ? (
    <SegmentTabs<Tab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'mine', label: '내 보관함' },
        { value: 'ours', label: `${couple.partner?.name ?? '상대'}와 우리` },
      ]}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DemoBadge />
      {showOurs ? <OurPlaces couple={couple} tabs={tabs} /> : <MyPlaces tabs={tabs} />}
    </SafeAreaView>
  );
}

function OurPlaces({ couple, tabs }: { couple: Couple; tabs: React.ReactNode }) {
  const router = useRouter();
  const list = useSharedPlaces(couple.id);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const name = couple.partner?.name ?? '상대';

  return (
    <FlatList
      data={items}
      keyExtractor={(s) => String(s.sharedId)}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>보관함</Text>
          {tabs}
          {couple.status === 'GRACE' ? <GraceBanner daysLeft={couple.graceDaysLeft} /> : null}
          <ErrorBanner error={list.error} />
        </View>
      }
      renderItem={({ item }) => (
        <View>
          <Text style={styles.by}>{item.sharedByMe ? '내가 공유' : `${name}가 공유`}</Text>
          <PlaceRow
            place={item.place}
            onPress={() => router.push(`/couples/${couple.id}/places/${item.sharedId}`)}
          />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        list.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.empty}>
            아직 같이 보는 장소가 없어요.{'\n'}장소 상세에서 "{name}와 공유하기"를 눌러 보세요.
          </Text>
        )
      }
      onEndReached={() => {
        if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => void list.refetch()}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function MyPlaces({ tabs }: { tabs: React.ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim());
  const list = usePlaceList(debounced ? { query: debounced } : {});

  const places = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
      <FlatList
        data={places}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>보관함</Text>
            {tabs}
            <Button title="+ 장소 추가" onPress={() => router.push('/place/add')} />
            <TextField label="저장한 장소 검색" value={query} onChangeText={setQuery} placeholder="이름·주소" />
            <ErrorBanner error={list.error} />
          </View>
        }
        renderItem={({ item }) => (
          <PlaceRow place={item} onPress={() => router.push(`/place/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>
              {debounced
                ? '검색 결과가 없어요.'
                : '아직 저장한 장소가 없어요.\n인스타·네이버지도에서 공유하거나 직접 추가해 보세요.'}
            </Text>
          )
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            tintColor={colors.primary}
          />
        }
      />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.sm },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  by: { fontSize: fontSize.caption, color: colors.textSub, marginBottom: 2 },
  empty: {
    fontSize: fontSize.body,
    color: colors.textSub,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
    lineHeight: 22,
  },
});
