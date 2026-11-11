import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../app/theme/ThemeProvider';
import { radius, spacing, typography } from '../app/theme/tokens';

type Confirmation = {
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmationController() {
  const current = useRef<Confirmation | null>(null);
  const [request, setRequest] = useState<Confirmation | null>(null);

  const confirm = useCallback((next: Confirmation) => {
    if (current.current) return;
    current.current = next;
    setRequest(next);
  }, []);

  const close = useCallback((confirmed: boolean) => {
    const pending = current.current;
    current.current = null;
    setRequest(null);
    if (confirmed) void pending?.onConfirm();
    else pending?.onCancel?.();
  }, []);

  return { request, confirm, close };
}

const ConfirmationContext = createContext<((request: Confirmation) => void) | null>(null);

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('ConfirmationProvider is missing.');
  return confirm;
}

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const { request, confirm, close } = useConfirmationController();
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Modal transparent visible={request !== null} onRequestClose={() => close(false)}>
        {request && <ConfirmationOverlay request={request} close={close} />}
      </Modal>
    </ConfirmationContext.Provider>
  );
}

export function ConfirmationOverlay({ request, close }: {
  request: Confirmation;
  close: (confirmed: boolean) => void;
}) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.secondaryShadow }]}>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={[styles.icon, { backgroundColor: colors.border }]}>
            <Ionicons name={request.icon} size={28} color={colors.primary} accessible={false} />
          </View>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite"
            style={[typography.display.lg, styles.center, { color: colors.primary }]}>{request.title}</Text>
          <Text style={[typography.reading.sm, styles.center, { color: colors.text }]}>{request.message}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => close(false)}
              style={({ pressed }) => [styles.button, { borderColor: colors.secondaryShadow, opacity: pressed ? 0.75 : 1 }]}>
              <Text style={[typography.display.md, styles.center, { color: colors.primary }]}>{request.cancelLabel ?? 'Cancel'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => close(true)}
              style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
              <Text style={[typography.display.md, styles.center, { color: colors.primaryText }]}>{request.confirmLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(36, 26, 18, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    borderRadius: radius.lg,
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#241A12',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  content: { gap: spacing.sm, padding: spacing.lg },
  icon: { alignSelf: 'center', borderRadius: radius.full, padding: spacing.md, marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
});
