import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DemoBadge } from '@/components/DemoBadge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors, fontSize, radius, spacing } from '@/theme';

import { useCourseList } from '../hooks/useCourses';
import { amountText } from './CourseDetailScreen';

// 내 코스 목록(T01). 공동 코스는 M4에서 추가한다.
export function CourseTabScreen() {
  const router = useRouter();
  const list = useCourseList();
  const courses = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DemoBadge />
      <FlatList
        data={courses}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>코스</Text>
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
    </SafeAreaView>
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
