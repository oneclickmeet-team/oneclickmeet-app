import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

import { DemoBadge } from './DemoBadge';

interface ScreenProps {
  children: ReactNode;
  /** 헤더가 있는 화면은 위쪽 안전 영역을 헤더가 처리하므로 'top'을 뺀다. */
  edges?: Edge[];
  scroll?: boolean;
}

export function Screen({ children, edges = ['top'], scroll = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <DemoBadge />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
});
