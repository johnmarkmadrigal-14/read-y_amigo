// components/CaptchaModal.tsx
// Simple math CAPTCHA — no external scripts, works fully offline.
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Generates a random math question and its answer.
function generateChallenge() {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 20) + 10;
    b = Math.floor(Math.random() * a) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

type Props = {
  visible: boolean;
  onVerified: (token: string) => void;
  onDismiss: () => void;
};

export function CaptchaModal({ visible, onVerified, onDismiss }: Props) {
  const { colors } = useTheme();
  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fresh challenge every time the modal opens.
  useEffect(() => {
    if (visible) {
      setChallenge(generateChallenge());
      setInput("");
      setError(null);
    }
  }, [visible]);

  const handleVerify = () => {
    const userAnswer = parseInt(input.trim(), 10);

    if (isNaN(userAnswer)) {
      setError("Please enter a number.");
      return;
    }

    if (userAnswer !== challenge.answer) {
      setError("That's not right. Try again.");
      setChallenge(generateChallenge());
      setInput("");
      return;
    }

    // Correct — generate a simple token the backend can validate.
    // For stronger security, move validation server-side.
    const token = `math-captcha-${Date.now()}`;
    onVerified(token);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          {/* Header */}
          <Text
            style={[
              typography.display.md,
              { color: colors.text, marginBottom: spacing.xs ?? 4 },
            ]}
          >
            One quick check
          </Text>
          <Text
            style={[
              typography.reading.sm,
              { color: colors.textMuted, marginBottom: spacing.lg },
            ]}
          >
            Solve the problem to continue.
          </Text>

          {/* Challenge box */}
          <View
            style={[
              styles.challengeBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                typography.display.lg,
                { color: colors.primary, textAlign: "center" },
              ]}
            >
              {challenge.question}
            </Text>
          </View>

          {/* Answer input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.retry : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Your answer"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(null);
            }}
            autoFocus
          />

          {/* Error message */}
          {error && (
            <Text
              style={[
                typography.reading.sm,
                { color: colors.retry, marginBottom: spacing.sm },
              ]}
            >
              {error}
            </Text>
          )}

          {/* Buttons */}
          <Pressable
            onPress={handleVerify}
            style={[styles.verifyButton, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                typography.display.md,
                { color: colors.primaryText, textAlign: "center" },
              ]}
            >
              Verify
            </Text>
          </Pressable>

          <Pressable onPress={onDismiss} style={styles.cancelButton}>
            <Text
              style={[
                typography.reading.sm,
                { color: colors.textMuted, fontWeight: "600" },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  challengeBox: {
    borderWidth: 3,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  input: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 20,
    textAlign: "center",
  },
  verifyButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.xs ?? 4,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
});