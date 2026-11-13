import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthButton } from "./AuthUI";
import { useTheme } from "../../app/theme/ThemeProvider";
import { spacing, typography } from "../../app/theme/tokens";

export const SIGNUP_TERMS_VERSION = "2026-11-13";

const sections = [
  ["Learners", "Use your own account and record only your own reading. When you submit a recording, Read-y Amigo saves your voice and may save the words it heard and your reading results. You and your class teacher can listen to your submitted recording. Your teacher uses it to check your reading and give feedback. If you are under 18, read this notice with a parent or legal guardian and ask their permission before recording."],
  ["Parent or guardian consent notice", "If the learner is under 18, please review this notice together before they record. Read-y Amigo stores submitted audio and may store a written transcript and reading results so the class teacher can assess the learner’s reading and give feedback. You can choose whether to give your child permission to record and submit their reading. If you prefer that they skip the recording, ask the teacher who assigned it about another way to complete the activity. The signup checkbox records the account holder’s acceptance of these terms. Give your permission directly to your child."],
  ["Teachers", "Explain why the reading will be recorded. For learners under 18, ask them to review this notice with a parent or legal guardian and obtain permission before recording. Use the recordings and results for authorized reading assessment and feedback. Keep them private and share them only as authorized."],
  ["Notifications and your account", "You can allow or turn off notifications in your device settings. Read-y Amigo uses a device token to send classroom alerts. Keep your login details private and sign out when you finish using a shared device."],
  ["Your privacy rights", "Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you may ask how personal information is used and exercise applicable rights, including access, correction, objection and erasure. For a question or request about a class recording, start with the teacher who assigned it. You may also file a complaint with the National Privacy Commission."],
];

export function SignupTerms({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const label = "I have read and agree to the Terms and Conditions";

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.md }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }}
          onPress={() => onChange(!checked)} hitSlop={6}>
          <Ionicons name={checked ? "checkbox" : "square-outline"} size={27} color={colors.primary} />
        </Pressable>
        <Text style={[typography.reading.sm, { color: colors.text, flexShrink: 1 }]}>
          I have read and agree to the{" "}
          <Text accessibilityRole="link" onPress={() => setOpen(true)}
            style={{ color: colors.primary, textDecorationLine: "underline" }}>Terms and Conditions</Text>.
        </Text>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: spacing.md }}>
          <View accessibilityViewIsModal style={{ maxHeight: "85%", backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg }}>
            <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text }]}>Terms and Conditions</Text>
            <ScrollView style={{ marginVertical: spacing.md }} keyboardShouldPersistTaps="handled">
              {sections.map(([title, body]) => (
                <View key={title} style={{ marginBottom: spacing.md }}>
                  <Text accessibilityRole="header" style={[typography.reading.md, { color: colors.text, fontWeight: "bold" }]}>{title}</Text>
                  <Text style={[typography.reading.sm, { color: colors.text }]}>{body}</Text>
                </View>
              ))}
            </ScrollView>
            <AuthButton label="Close" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
