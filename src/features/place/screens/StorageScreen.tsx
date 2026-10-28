import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DemoBadge } from '@/components/DemoBadge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { useDebounced } from '@/lib/useDebounced';
import { colors, fontSize, spacing } from '@/theme';

import { PlaceRow } from '../components/PlaceRow';
import { usePlaceList } from '../hooks/usePlaces';

// 개인 보관함 목록 (P05). 공동 보관함 탭은 M4에서 추가한다.
export function StorageScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim());
  const list = usePlaceList(debounced ? { query: debounced } : {});

  const places = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DemoBadge />
      <FlatList
        data={places}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>보관함</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.sm },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  empty: {
    fontSize: fontSize.body,
    color: colors.textSub,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
    lineHeight: 22,
  },
});
