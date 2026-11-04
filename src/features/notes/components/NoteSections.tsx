import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { MiniButton } from '@/components/MiniButton';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { CommentTargetType, MemoTargetType } from '@/types/api';
import type { CoupleId } from '@/types/ids';

import { useCommentMutations, useComments, useMemoMutations, useMemos } from '../hooks/useNotes';

function timeText(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 글 입력칸 + 등록 버튼 (메모·첨언 공용) */
function Composer({
  placeholder,
  max,
  loading,
  onSubmit,
}: {
  placeholder: string;
  max: number;
  loading: boolean;
  onSubmit: (text: string, clear: () => void) => void;
}) {
  const [text, setText] = useState('');
  return (
    <View style={styles.composer}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSub}
        multiline
        maxLength={max}
      />
      <Button
        title="등록"
        variant="secondary"
        disabled={!text.trim()}
        loading={loading}
        onPress={() => onSubmit(text.trim(), () => setText(''))}
      />
    </View>
  );
}

/** 글 하나: 보기 / 수정 모드 (메모·첨언 공용) */
function NoteRow({
  meta,
  content,
  editable,
  max,
  saving,
  onSave,
  onDelete,
}: {
  meta: string;
  content: string;
  editable: boolean;
  max: number;
  saving: boolean;
  onSave: (text: string, done: () => void) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft !== null) {
    return (
      <View style={styles.row}>
        <TextInput style={styles.input} value={draft} onChangeText={setDraft} multiline maxLength={max} autoFocus />
        <View style={styles.actions}>
          <MiniButton label="취소" onPress={() => setDraft(null)} />
          <MiniButton
            label={saving ? '저장 중…' : '저장'}
            disabled={!draft.trim() || saving}
            onPress={() => onSave(draft.trim(), () => setDraft(null))}
          />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.content} selectable>
        {content}
      </Text>
      {editable ? (
        <View style={styles.actions}>
          <MiniButton label="수정" onPress={() => setDraft(content)} />
          <MiniButton
            label="삭제"
            danger
            onPress={() =>
              Alert.alert('삭제', '이 글을 지울까요?', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: onDelete },
              ])
            }
          />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- 비공개 메모 (N01~N05)
/** 나만 보는 메모. 상대에게 보이지 않는다. targetId는 장소·코스 본문 ID */
export function MemoSection({ targetType, targetId }: { targetType: MemoTargetType; targetId: number }) {
  const memos = useMemos(targetType, targetId);
  const m = useMemoMutations(targetType, targetId);
  const items = memos.data?.items ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>내 메모</Text>
      <Text style={styles.hint}>나만 볼 수 있어요. 상대에게는 보이지 않아요.</Text>
      {memos.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      <ErrorBanner error={memos.error ?? m.create.error ?? m.update.error ?? m.remove.error} />
      {items.map((memo) => (
        <NoteRow
          key={memo.id}
          meta={timeText(memo.updatedAt)}
          content={memo.content}
          editable
          max={5000}
          saving={m.update.isPending}
          onSave={(content, done) => m.update.mutate({ memoId: memo.id, content }, { onSuccess: done })}
          onDelete={() => m.remove.mutate(memo.id)}
        />
      ))}
      <Composer
        placeholder="예: 창가 자리 있는지 확인하기"
        max={5000}
        loading={m.create.isPending}
        onSubmit={(text, clear) => m.create.mutate(text, { onSuccess: clear })}
      />
    </View>
  );
}

// ---------------------------------------------------------------- 공동 첨언 (N06~N09)
/** 두 사람이 같이 보는 글. targetId는 공유 기록 ID. 유예 중(readOnly)에는 읽기만 */
export function CommentSection({
  coupleId,
  targetType,
  targetId,
  readOnly,
}: {
  coupleId: CoupleId;
  targetType: CommentTargetType;
  targetId: number;
  readOnly: boolean;
}) {
  const comments = useComments(coupleId, targetType, targetId);
  const c = useCommentMutations(coupleId, targetType, targetId);
  const items = comments.data?.items ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>같이 남기는 말</Text>
      {comments.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      <ErrorBanner error={comments.error ?? c.create.error ?? c.update.error ?? c.remove.error} />
      {items.length === 0 && !comments.isPending ? (
        <Text style={styles.hint}>아직 남긴 말이 없어요.</Text>
      ) : null}
      {items.map((cm) => (
        <NoteRow
          key={cm.id}
          meta={`${cm.mine ? '나' : cm.authorName} · ${timeText(cm.createdAt)}${cm.edited ? ' (수정됨)' : ''}`}
          content={cm.content}
          editable={cm.mine && !readOnly}
          max={2000}
          saving={c.update.isPending}
          onSave={(content, done) => c.update.mutate({ commentId: cm.id, content }, { onSuccess: done })}
          onDelete={() => c.remove.mutate(cm.id)}
        />
      ))}
      {readOnly ? (
        <Text style={styles.hint}>연결 해제 유예 중에는 읽기만 할 수 있어요.</Text>
      ) : (
        <Composer
          placeholder="상대에게 남길 말"
          max={2000}
          loading={c.create.isPending}
          onSubmit={(text, clear) => c.create.mutate(text, { onSuccess: clear })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.caption, color: colors.textSub },
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  meta: { fontSize: fontSize.caption, color: colors.textSub },
  content: { fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  composer: { gap: spacing.sm, marginTop: spacing.xs },
  input: {
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
