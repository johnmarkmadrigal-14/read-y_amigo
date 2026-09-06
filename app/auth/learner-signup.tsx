import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function startsWithCapital(value: string): boolean {
  return /^[A-Z]/.test(value);
}

const PASSWORD_RULES = [
  {
    key: "length",
    label: "At least 8 characters",
    test: (v: string) => v.length >= 8,
  },
  {
    key: "number",
    label: "At least one number",
    test: (v: string) => /\d/.test(v),
  },
  {
    key: "special",
    label: "At least one special character (e.g. @, #, !)",
    test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(v),
  },
];

function isValidPassword(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

// Reusable password input row with eye toggle
function PasswordField({
  placeholder,
  value,
  onChangeText,
  hasError,
  borderColor,
  surfaceColor,
  textColor,
  mutedColor,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  hasError: boolean;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <View
      style={[
        styles.passwordRow,
        {
          backgroundColor: surfaceColor,
          borderColor: hasError ? "#FF8A00" : borderColor,
        },
      ]}
    >
      <TextInput
        style={[
          styles.passwordInput,
          { color: textColor, fontSize: typography.reading.sm.fontSize },
        ]}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        secureTextEntry={hidden}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} style={styles.eyeButton}>
        <Ionicons
          name={hidden ? "eye-outline" : "eye-off-outline"}
          size={20}
          color={mutedColor}
        />
      </Pressable>
    </View>
  );
}

// Live requirement checklist shown below the first password field
function PasswordRequirements({ value }: { value: string }) {
  return (
    <View style={styles.requirementsBox}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <View key={rule.key} style={styles.requirementRow}>
            <Text style={[styles.requirementIcon, { color: met ? "#34A853" : "#8A7A6A" }]}>
              {met ? "✓" : "○"}
            </Text>
            <Text style={[styles.requirementText, { color: met ? "#34A853" : "#8A7A6A" }]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function LearnerSignup() {
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = (field: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearError = (field: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleFirstName = (value: string) => {
    const capped = capitalizeFirst(value);
    setFirstName(capped);
    if (capped && !startsWithCapital(capped)) {
      setError("firstName", "First name must start with a capital letter.");
    } else {
      clearError("firstName");
    }
  };

  const handleSecondName = (value: string) => {
    const capped = capitalizeFirst(value);
    setSecondName(capped);
    if (capped && !startsWithCapital(capped)) {
      setError("secondName", "Last name must start with a capital letter.");
    } else {
      clearError("secondName");
    }
  };

  const handleDisplayName = (value: string) => {
    const capped = capitalizeFirst(value);
    setDisplayName(capped);
    if (capped && !startsWithCapital(capped)) {
      setError("displayName", "Display name must start with a capital letter.");
    } else {
      clearError("displayName");
    }
  };

  const handleUsername = (value: string) => {
    const capped = capitalizeFirst(value);
    setUsername(capped);
    if (capped && !startsWithCapital(capped)) {
      setError("username", "Username must start with a capital letter.");
    } else {
      clearError("username");
    }
  };

  const handlePassword = (value: string) => {
    setPassword(value);
    if (value && !isValidPassword(value)) {
      setError("password", "Please meet all the password requirements.");
    } else {
      clearError("password");
    }
    // Re-check confirm match live
    if (confirmPassword && value !== confirmPassword) {
      setError("confirmPassword", "Passwords do not match.");
    } else if (confirmPassword) {
      clearError("confirmPassword");
    }
  };

  const handleConfirmPassword = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== password) {
      setError("confirmPassword", "Passwords do not match.");
    } else {
      clearError("confirmPassword");
    }
  };

  const handleSignup = async () => {
    const numericAge = Number(age);
    const newErrors: Record<string, string> = {};

    if (!firstName) newErrors.firstName = "First name is required.";
    else if (!startsWithCapital(firstName))
      newErrors.firstName = "First name must start with a capital letter.";

    if (!secondName) newErrors.secondName = "Last name is required.";
    else if (!startsWithCapital(secondName))
      newErrors.secondName = "Last name must start with a capital letter.";

    if (!displayName) newErrors.displayName = "Display name is required.";
    else if (!startsWithCapital(displayName))
      newErrors.displayName = "Display name must start with a capital letter.";

    if (!age) newErrors.age = "Age is required.";
    else if (numericAge < 3)
      newErrors.age = "Learners must be at least 3 years old.";

    if (!username) newErrors.username = "Username is required.";
    else if (!startsWithCapital(username))
      newErrors.username = "Username must start with a capital letter.";

    if (!password) newErrors.password = "Password is required.";
    else if (!isValidPassword(password))
      newErrors.password = "Please meet all the password requirements.";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Please fix the errors before continuing.");
      return;
    }

    setLoading(true);
    try {
      router.replace("/learner/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
    typography.reading.sm,
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.xl },
          ]}
        >
          Learner Account
        </Text>

        {/* First Name */}
        <TextInput
          style={[inputStyle, errors.firstName && { borderColor: colors.retry }]}
          placeholder="First Name"
          placeholderTextColor={colors.textMuted}
          value={firstName}
          onChangeText={handleFirstName}
        />
        {errors.firstName ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.firstName}</Text>
        ) : null}

        {/* Last Name */}
        <TextInput
          style={[inputStyle, errors.secondName && { borderColor: colors.retry }]}
          placeholder="Second / Last Name"
          placeholderTextColor={colors.textMuted}
          value={secondName}
          onChangeText={handleSecondName}
        />
        {errors.secondName ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.secondName}</Text>
        ) : null}

        {/* Middle Initial (optional) */}
        <TextInput
          style={inputStyle}
          placeholder="Middle Initial (optional)"
          placeholderTextColor={colors.textMuted}
          value={middleInitial}
          onChangeText={setMiddleInitial}
          maxLength={1}
        />

        {/* Display Name */}
        <TextInput
          style={[inputStyle, errors.displayName && { borderColor: colors.retry }]}
          placeholder="What do you want to be called?"
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={handleDisplayName}
        />
        {errors.displayName ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.displayName}</Text>
        ) : null}

        {/* Age */}
        <TextInput
          style={[inputStyle, errors.age && { borderColor: colors.retry }]}
          placeholder="Age"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={age}
          onChangeText={(v) => { setAge(v); clearError("age"); }}
        />
        {errors.age ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.age}</Text>
        ) : null}

        {/* Username */}
        <TextInput
          style={[inputStyle, errors.username && { borderColor: colors.retry }]}
          placeholder="Choose a Username"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={handleUsername}
        />
        {errors.username ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.username}</Text>
        ) : null}

        {/* Password */}
        <PasswordField
          placeholder="Choose a Password"
          value={password}
          onChangeText={handlePassword}
          hasError={!!errors.password}
          borderColor={colors.border}
          surfaceColor={colors.surface}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        {/* Live requirements checklist */}
        <PasswordRequirements value={password} />
        {errors.password ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.password}</Text>
        ) : null}

        {/* Confirm Password */}
        <PasswordField
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={handleConfirmPassword}
          hasError={!!errors.confirmPassword}
          borderColor={colors.border}
          surfaceColor={colors.surface}
          textColor={colors.text}
          mutedColor={colors.textMuted}
        />
        {errors.confirmPassword ? (
          <Text style={[styles.errorText, { color: colors.retryText }]}>{errors.confirmPassword}</Text>
        ) : null}
        {!errors.confirmPassword && confirmPassword.length > 0 && confirmPassword === password ? (
          <Text style={[styles.errorText, { color: "#34A853" }]}>✓ Passwords match</Text>
        ) : null}

        <Button
          label="Create Learner Account"
          variant="primary"
          onPress={handleSignup}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        <Text
          onPress={() => router.back()}
          style={[
            typography.reading.sm,
            { textAlign: "center", color: colors.success, marginTop: spacing.md },
          ]}
        >
          ← Back
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  input: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    marginTop: -spacing.sm + 2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  // Password row
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 3,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
  // Requirements
  requirementsBox: {
    marginTop: -4,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
    gap: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requirementIcon: {
    fontSize: 12,
    width: 14,
    textAlign: "center",
  },
  requirementText: {
    fontSize: 12,
    fontFamily: "AtkinsonHyperlegible_400Regular",
  },
});