import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthButton } from "./AuthUI";
import { useTheme } from "../../app/theme/ThemeProvider";
import { spacing, typography } from "../../app/theme/tokens";

export const SIGNUP_TERMS_VERSION = "2026-11-13";

const sections = [
  ["Learners", "Use your own account and submit only your own reading. When you record and submit a reading, Read-y Amigo stores your voice recording and may store a transcript and reading results. You and the teacher responsible for that class can access the submitted audio. Your teacher uses it to check your reading and give feedback. If you are under 18, read this with your parent or guardian and ask your teacher if you need help."],
  ["Parents and guardians", "Read-y Amigo uses account and class details to provide classroom access and uses submitted recordings, transcripts, quiz answers and results to assess reading. Ask your school who manages these records, the basis for processing them, how long they are kept, and which service providers handle them. If your school requires permission for a learner to record, follow the school’s parent or guardian consent process before the learner records."],
  ["Teachers", "Use learner recordings and results for the classroom assessment and feedback you are authorized to provide. Keep learner information private. Follow your school’s rules for recordings, access, sharing, retention and disposal, and direct privacy requests to the school’s designated privacy contact."],
  ["Notifications and your account", "You can allow or turn off notifications in your device settings. Read-y Amigo uses a device token to send classroom alerts. Keep your login details private and sign out when you finish using a shared device."],
  ["Your privacy rights", "Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you may ask about how your information is processed, request access or correction, and exercise other applicable rights, including objecting or requesting erasure where allowed. Contact your school’s designated privacy contact for questions about classroom records or to make a request. You may also file a complaint with the National Privacy Commission."],
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
