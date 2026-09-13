import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { Screen } from "../components/Screen";
import { StepIndicator } from "../components/StepIndicator";
import { signupLearner } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

// Each step lists which fields belong to it and its heading.
// Add/remove/reorder steps here without touching the render logic below.
const STEPS = [
  { key: "name", title: "What's your name?" },
  { key: "display", title: "What do you want to be called?" },
  { key: "age", title: "How old are you?" },
  { key: "account", title: "Set up your login" },
];

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const DEFAULT_PICKER_DATE = new Date(new Date().getFullYear() - 8, 0, 1);

// Returns an error message if the password doesn't meet requirements, or null.
function validatePassword(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include both letters and numbers.";
  }
  return null;
}

export default function LearnerSignup() {
  const { colors } = useTheme();

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // Returns an error message for the current step, or null if it's valid.
  const validateStep = () => {
    switch (currentStep.key) {
      case "name":
        if (!firstName || !secondName) {
          return "Please enter your first and last name.";
        }
        return null;
      case "display":
        if (!displayName) {
          return "Please tell us what you'd like to be called.";
        }
        return null;
      case "age": {
        if (!birthDate) {
          return "Please select your birthdate.";
        }
        if (calculateAge(birthDate) < 3) {
          return "Learners must be at least 3 years old.";
        }
        return null;
      }
      case "account": {
        if (!username || !password) {
          return "Please choose a username and password.";
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
          return passwordError;
        }
        return null;
      }
      default:
        return null;
    }
  };

  const handleNext = async () => {
    const error = validateStep();
    if (error) {
      Alert.alert("Hold on", error);
      return;
    }

    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }

    setLoading(true);
    try {
      await signupLearner({
        firstName,
        secondName,
        middleInitial,
        displayName,
        age: String(calculateAge(birthDate as Date)),
        username,
        password,
      });
      router.replace("/learner/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      Alert.alert("Couldn't create account", message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "set" && selectedDate) {
      setBirthDate(selectedDate);
    }
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
    typography.reading.sm,
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? spacing.xl ?? 32 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            typography.display.xl,
            { color: colors.primary, textAlign: "center", marginBottom: spacing.lg },
          ]}
        >
          Learner Account
        </Text>

        {stepIndex === 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <GoogleSignInButton
              roleForNewAccount="learner"
              onSuccess={() => router.replace("/learner/dashboard")}
              onNeedsProfile={(pendingToken, suggestedDisplayName) =>
                router.push({
                  pathname: "/auth/complete-google-profile",
                  params: { pendingToken, suggestedDisplayName, role: "learner" },
                })
              }
              onError={(message) => Alert.alert("Google sign-in failed", message)}
            />
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[typography.reading.sm, { color: colors.textMuted, marginHorizontal: spacing.sm }]}>
                or
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
          </View>
        )}

        <StepIndicator
          currentStep={stepIndex}
          totalSteps={STEPS.length}
          title={currentStep.title}
        />

        {currentStep.key === "name" && (
          <View>
            <TextInput
              style={inputStyle}
              placeholder="First Name"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
              autoFocus
            />
            <TextInput
              style={inputStyle}
              placeholder="Second / Last Name"
              placeholderTextColor={colors.textMuted}
              value={secondName}
              onChangeText={setSecondName}
            />
            <TextInput
              style={inputStyle}
              placeholder="Middle Initial"
              placeholderTextColor={colors.textMuted}
              value={middleInitial}
              onChangeText={setMiddleInitial}
            />
          </View>
        )}

        {currentStep.key === "display" && (
          <View>
            <TextInput
              style={inputStyle}
              placeholder="What do you want to be called?"
              placeholderTextColor={colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
            />
          </View>
        )}

        {currentStep.key === "age" && (
          <View>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  typography.reading.sm,
                  { color: birthDate ? colors.text : colors.textMuted },
                ]}
              >
                {birthDate ? formatDate(birthDate) : "Select your birthdate"}
              </Text>
            </Pressable>

            {birthDate && (
              <Text
                style={[
                  typography.reading.sm,
                  { color: colors.textMuted, marginBottom: spacing.sm },
                ]}
              >
                Age: {calculateAge(birthDate)}
              </Text>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={birthDate ?? DEFAULT_PICKER_DATE}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={handleDateChange}
                accentColor={colors.primary}
                textColor={colors.primary}
              />
            )}
          </View>
        )}

        {currentStep.key === "account" && (
          <View>
            <TextInput
              style={inputStyle}
              placeholder="Choose a Username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              autoFocus
            />
            <View
              style={[
                styles.passwordContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, typography.reading.sm, { color: colors.text }]}
                placeholder="Choose a Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            <Text
              style={[
                typography.reading.sm,
                { color: colors.textMuted, marginTop: -spacing.xs, marginBottom: spacing.sm },
              ]}
            >
              At least 8 characters, with letters and numbers.
            </Text>
          </View>
        )}

        <Button
          label={isLastStep ? "Create Learner Account" : "Next"}
          variant="primary"
          onPress={handleNext}
          loading={loading}
          style={{ marginTop: spacing.sm }}
        />

        <Button
          label="← Back"
          variant="secondary"
          onPress={handleBack}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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

  passwordContainer: {
    borderWidth: 3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs ?? 4,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs ?? 8,
  },

  passwordInput: {
    flex: 1,
    padding: 0,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },

  dividerLine: {
    flex: 1,
    height: 1,
  },
});