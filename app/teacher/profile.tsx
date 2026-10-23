import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { ApiUser, getMyProfile, logout, updateMyProfile } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export default function ProfileScreen() {
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields, seeded from the fetched profile once it loads.
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [learnerLevel, setLearnerLevel] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await getMyProfile();
        setProfile(user);
        setFirstName((user.firstName as string) ?? "");
        setSecondName((user.secondName as string) ?? "");
        setMiddleInitial((user.middleInitial as string) ?? "");
        setDisplayName((user.displayName as string) ?? "");
        setAge(user.age ? String(user.age) : "");
        setLearnerLevel((user.learnerLevel as string) ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedMessage(null);
    setError(null);
    try {
      const updated = await updateMyProfile({
        firstName,
        secondName,
        middleInitial: middleInitial || undefined,
        displayName,
        age,
        learnerLevel: learnerLevel || undefined,
      });
      setProfile(updated);
      setSavedMessage("Saved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[typography.display.lg, { color: colors.text, marginBottom: spacing.lg }]}>
          Profile
        </Text>

        <Field label="First name" value={firstName} onChangeText={setFirstName} colors={colors} />
        <Field label="Last name" value={secondName} onChangeText={setSecondName} colors={colors} />
        <Field
          label="Middle initial"
          value={middleInitial}
          onChangeText={setMiddleInitial}
          colors={colors}
        />
        <Field
          label="How learners address you"
          value={displayName}
          onChangeText={setDisplayName}
          colors={colors}
        />
        <Field
          label="Age"
          value={age}
          onChangeText={setAge}
          colors={colors}
          keyboardType="number-pad"
        />
        <Field
          label="Level of learners you teach"
          value={learnerLevel}
          onChangeText={setLearnerLevel}
          colors={colors}
        />

        {/* Read-only for now - editing email/username needs extra
            verification, so it's left out of this screen. */}
        <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.lg }]}>
          {profile?.email ?? profile?.username}
        </Text>

        {error && (
          <Text style={[typography.reading.sm, { color: "#B3261E", marginBottom: spacing.sm }]}>
            {error}
          </Text>
        )}
        {savedMessage && (
          <Text style={[typography.reading.sm, { color: colors.success, marginBottom: spacing.sm }]}>
            {savedMessage}
          </Text>
        )}

        <Button
          label={saving ? "Saving..." : "Save changes"}
          onPress={handleSave}
          disabled={saving}
        />

        <Button
          label="Log out"
          variant="secondary"
          onPress={handleLogout}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  colors: ReturnType<typeof useTheme>["colors"];
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: spacing.xs ?? 4 }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
});