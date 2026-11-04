import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DemoBadge } from '@/components/DemoBadge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { SegmentTabs } from '@/components/SegmentTabs';
import { GraceBanner } from '@/features/couple/components/GraceBanner';
import { useCurrentCouple, useSharedCourses } from '@/features/couple/hooks/useCouple';
import { colors, fontSize, radius, spacing } from '@/theme';

import { useCourseList } from '../hooks/useCourses';
import { amountText } from './CourseDetailScreen';
import type { Couple } from '@/types/model';

type Tab = 'mine' | 'ours';

// 코스 탭: 내 코스(T01) / 우리 코스(S05)
export function CourseTabScreen() {
  const { couple } = useCurrentCouple();
  const [tab, setTab] = useState<Tab>('mine');
  const tabs = couple ? (
    <SegmentTabs<Tab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'mine', label: '내 코스' },
        { value: 'ours', label: `${couple.partner?.name ?? '상대'}와 우리` },
      ]}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DemoBadge />
      {couple && tab === 'ours' ? <OurCourses couple={couple} tabs={tabs} /> : <MyCourses tabs={tabs} />}
    </SafeAreaView>
  );
}

function OurCourses({ couple, tabs }: { couple: Couple; tabs: ReactNode }) {
  const router = useRouter();
  const list = useSharedCourses(couple.id);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const name = couple.partner?.name ?? '상대';

  return (
    <FlatList
      data={items}
      keyExtractor={(s) => String(s.sharedId)}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>코스</Text>
          {tabs}
          {couple.status === 'GRACE' ? <GraceBanner daysLeft={couple.graceDaysLeft} /> : null}
          <ErrorBanner error={list.error} />
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/couples/${couple.id}/courses/${item.sharedId}`)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.sub}>{item.sharedByMe ? '내가 공유' : `${name}가 공유`}</Text>
          <Text style={styles.title}>{item.course.title}</Text>
          <Text style={styles.sub}>
            {item.course.places.length}곳 · {amountText(item.course.amount)}
          </Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        list.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.empty}>아직 같이 보는 코스가 없어요.{'\n'}코스 상세에서 "{name}와 공유하기"를 눌러 보세요.</Text>
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

function MyCourses({ tabs }: { tabs: ReactNode }) {
  const router = useRouter();
  const list = useCourseList();
  const courses = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
      <FlatList
        data={courses}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>코스</Text>
            {tabs}
            <Button title="코스 추천받기" onPress={() => router.push('/courses/builder')} />
            <ErrorBanner error={list.error} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/courses/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>
              {item.placeCount}곳 · {amountText(item.amount)}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>아직 저장한 코스가 없어요.{'\n'}추천받아서 첫 코스를 만들어 보세요.</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  heading: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  sub: { fontSize: fontSize.caption, color: colors.textSub },
  empty: {
    fontSize: fontSize.body,
    color: colors.textSub,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
    lineHeight: 22,
  },
});
