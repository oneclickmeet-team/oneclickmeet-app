import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { CandidateList } from '@/features/place/components/CandidateList';
import { useCandidateSearch } from '@/features/place/hooks/usePlaces';
import { useDebounced } from '@/lib/useDebounced';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Coords, CourseStop } from '@/types/model';

// 기준 좌표 근처(1km)에서 코스에 넣을 장소를 고른다(P02 좌표 검색).
export function NearbyPicker({
  title,
  pivot,
  excludeNames,
  onPick,
  onClose,
}: {
  title: string;
  pivot: Coords;
  excludeNames: string[];
  onPick: (stop: CourseStop) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim());
  const search = useCandidateSearch({
    query: debounced || undefined,
    latitude: pivot.latitude,
    longitude: pivot.longitude,
    radiusMeters: 1000,
  });
  // 코스에는 좌표가 있는 후보만 넣을 수 있다(PlaceSnapshot 좌표 필수).
  const candidates = (search.data?.items ?? []).filter((c) => c.coords && !excludeNames.includes(c.name));

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <TextField
        label="이름으로 좁히기 (선택)"
        value={query}
        onChangeText={setQuery}
        placeholder="비워 두면 근처 장소를 모두 보여 줘요"
      />
      <CandidateList
        candidates={candidates}
        loading={search.isFetching}
        error={search.error}
        actionLabel="이 장소로"
        emptyText="근처에서 찾은 장소가 없어요."
        onSave={(c) => c.coords && onPick({ name: c.name, address: c.address, coords: c.coords })}
      />
      <Button title="닫기" variant="text" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
});
