import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { NotificationItem } from '@/types/model';

import { useMarkRead, useNotifications } from '../hooks/useActivity';

function timeText(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 알림 목록(H02). 누르면 읽음 처리(H03)하고, 볼 수 있는 대상이면 그 화면으로 간다.
export function NotificationsScreen() {
  const router = useRouter();
  const list = useNotifications();
  const markRead = useMarkRead();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = items.filter((n) => !n.read);

  const open = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    // 대상 API에서도 권한을 다시 검사하므로, 이동한 화면에서 404가 나면 그 화면이 안내한다(TRD 12.2).
    if (n.href) router.push(n.href);
  };

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <ErrorBanner error={list.error ?? markRead.error} />
          {unread.length > 0 ? (
            <Button
              title={`보이는 알림 모두 읽음 (${unread.length})`}
              variant="text"
              onPress={() => unread.forEach((n) => markRead.mutate(n.id))}
            />
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => open(item)}
          style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && { opacity: 0.7 }]}
        >
          {!item.read ? <View style={styles.dot} /> : null}
          <View style={styles.body}>
            <Text style={[styles.message, item.read && styles.readText]}>{item.message}</Text>
            <Text style={styles.meta}>
              {timeText(item.createdAt)}
              {item.hasTarget && !item.href ? ' · 지금은 볼 수 없는 항목이에요' : ''}
            </Text>
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        list.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.empty}>알림이 없어요.</Text>
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
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  unread: { backgroundColor: colors.primarySoft },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  body: { flex: 1, gap: 2 },
  message: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },
  readText: { fontWeight: '400', color: colors.textSub },
  meta: { fontSize: fontSize.caption, color: colors.textSub },
  empty: { fontSize: fontSize.body, color: colors.textSub, textAlign: 'center', paddingVertical: spacing.xxl },
});
