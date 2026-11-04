import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MiniButton } from '@/components/MiniButton';
import { colors, fontSize, radius, spacing } from '@/theme';

import { newKey, type DraftItem } from '../lib/editDraft';

const MAX_AMOUNT = 999_999_999;
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

interface ItemListProps {
  items: DraftItem[];
  editable: boolean;
  onChange?: (items: DraftItem[]) => void;
}

// 장소별 메뉴·활동 항목. 금액은 2인 기준이고, 미입력(null)과 0원을 구분한다(TRD 9.2).
export function ItemList({ items, editable, onChange }: ItemListProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const update = (key: string, patch: Partial<DraftItem>) =>
    onChange?.(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const add = () => {
    const item: DraftItem = { key: newKey('i'), courseItemId: null, name: '', twoPersonAmount: null, isChecked: true };
    onChange?.([...items, item]);
    setEditingKey(item.key);
  };

  const finish = (key: string) => {
    // 이름 없이 완료하면 그 항목은 지운다.
    const item = items.find((i) => i.key === key);
    if (item && !item.name.trim()) onChange?.(items.filter((i) => i.key !== key));
    setEditingKey(null);
  };

  if (!editable && items.length === 0) return <Text style={styles.empty}>메뉴·활동 없음</Text>;

  return (
    <View style={styles.list}>
      {items.map((item) =>
        editable && editingKey === item.key ? (
          <View key={item.key} style={styles.editor}>
            <TextInput
              style={styles.input}
              value={item.name}
              onChangeText={(name) => update(item.key, { name })}
              placeholder="메뉴나 활동 (예: 파스타 2개)"
              placeholderTextColor={colors.textSub}
              maxLength={255}
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={item.twoPersonAmount === null ? '' : String(item.twoPersonAmount)}
              onChangeText={(t) => {
                const digits = t.replace(/[^0-9]/g, '');
                update(item.key, {
                  twoPersonAmount: digits === '' ? null : Math.min(Number(digits), MAX_AMOUNT),
                });
              }}
              placeholder="2인 금액 (모르면 비워 두세요)"
              placeholderTextColor={colors.textSub}
              keyboardType="number-pad"
            />
            <View style={styles.row}>
              <MiniButton
                label="삭제"
                danger
                onPress={() => {
                  onChange?.(items.filter((i) => i.key !== item.key));
                  setEditingKey(null);
                }}
              />
              <MiniButton label="완료" onPress={() => finish(item.key)} />
            </View>
          </View>
        ) : (
          <View key={item.key} style={styles.item}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.isChecked }}
              disabled={!editable}
              hitSlop={8}
              onPress={() => update(item.key, { isChecked: !item.isChecked })}
              style={[styles.box, item.isChecked && styles.boxOn]}
            >
              {item.isChecked ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              style={styles.itemBody}
              disabled={!editable}
              onPress={() => setEditingKey(item.key)}
            >
              <Text style={[styles.name, !item.isChecked && styles.unchecked]}>{item.name}</Text>
              <Text style={styles.amount}>
                {item.twoPersonAmount === null ? '금액 미입력' : won(item.twoPersonAmount)}
              </Text>
            </Pressable>
          </View>
        ),
      )}
      {editable ? (
        <Pressable onPress={add} style={styles.addBtn} accessibilityRole="button">
          <Text style={styles.addText}>+ 메뉴·활동 추가</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, marginTop: spacing.xs },
  empty: { fontSize: fontSize.caption, color: colors.textSub },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.white, fontSize: 12, fontWeight: '800' },
  itemBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, fontSize: fontSize.body, color: colors.text },
  unchecked: { color: colors.textSub },
  amount: { fontSize: fontSize.caption, color: colors.textSub },
  editor: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    fontSize: fontSize.body,
    color: colors.text,
  },
  addBtn: { paddingVertical: spacing.xs },
  addText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
});
