import { AuthButton, AuthCanvas, AuthHeader, authStyles } from '../../components/auth/AuthUI';
import { TextAction } from "../components/InterfaceChrome";
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
import { SignupTerms, SIGNUP_TERMS_VERSION } from "../../components/auth/SignupTerms";
import { signupTeacher } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";
import { CaptchaModal } from "../components/CaptchaModal";

// Each step lists which fields belong to it and its heading.
// Add/remove/reorder steps here without touching the render logic below.
const STEPS = [
  { key: "name", title: "What's your name?" },
  { key: "display", title: "How should learners address you?" },
  { key: "profile", title: "Tell us about your teaching" },
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

const DEFAULT_PICKER_DATE = new Date(new Date().getFullYear() - 20, 0, 1);

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

export default function TeacherSignup() {
  const { colors } = useTheme();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [learnerLevel, setLearnerLevel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [captchaVisible, setCaptchaVisible] = useState(false);

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
          return "Please let us know what learners should call you.";
        }
        return null;
      case "profile": {
        if (!birthDate) {
          return "Please select your birthdate.";
        }
        if (calculateAge(birthDate) < 15) {
          return "Teachers must be at least 15 years old.";
        }
        return null;
      }
      case "account": {
        if (!email || !password) {
          return "Please enter an email and password.";
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

  if (!termsAccepted) return;

  // Last step — show CAPTCHA before touching the backend.
  setCaptchaVisible(true);
};

const handleCaptchaVerified = async (captchaToken: string) => {
  setCaptchaVisible(false);
  if (!termsAccepted || loading) return;
  setLoading(true);
  try {
    await signupTeacher({
      firstName,
      secondName,
      middleInitial,
      displayName,
      age: String(calculateAge(birthDate as Date)),
      learnerLevel,
      email,
      password,
      termsAccepted,
      termsVersion: SIGNUP_TERMS_VERSION,
      captchaToken,           // ← sent to backend for verification
    });
    router.replace("/teacher/dashboard");
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
    <AuthCanvas>
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
        <AuthHeader title="Teacher sign up" onBack={handleBack} />
        <Text style={[typography.reading.sm, { color: colors.textMuted, marginBottom: 6 }]}>Step {stepIndex + 1} of {STEPS.length}</Text>
        <Text accessibilityRole="header" style={[typography.display.md, { color: colors.text, marginBottom: 22 }]}>{currentStep.title}</Text>

        {currentStep.key === "name" && (
          <View>
            <TextInput
              style={inputStyle}
              accessibilityLabel="First Name" placeholder="First Name"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={inputStyle}
              accessibilityLabel="Second / Last Name" placeholder="Second / Last Name"
              placeholderTextColor={colors.textMuted}
              value={secondName}
              onChangeText={setSecondName}
            />
            <TextInput
              style={inputStyle}
              accessibilityLabel="Middle Initial" placeholder="Middle Initial"
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
              placeholder="How should learners address you?"
              placeholderTextColor={colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
        )}

        {currentStep.key === "profile" && (
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

            <TextInput
              style={inputStyle}
              placeholder="Level of learners you teach"
              placeholderTextColor={colors.textMuted}
              value={learnerLevel}
              onChangeText={setLearnerLevel}
            />
          </View>
        )}

        {currentStep.key === "account" && (
          <View>
            <TextInput
              style={inputStyle}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View
              style={[
                styles.passwordContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, typography.reading.sm, { color: colors.text }]}
                accessibilityLabel="Password" placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TextAction accessibilityLabel="Show or hide password" onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textMuted}
                />
              </TextAction>
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

        {isLastStep && <SignupTerms checked={termsAccepted} onChange={setTermsAccepted} />}
        <AuthButton label={isLastStep ? "Create account" : "Next"} onPress={handleNext}
          disabled={isLastStep && !termsAccepted} busy={loading} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/login')} style={[authStyles.link, { marginTop: 12 }]}><Text style={[typography.reading.sm, { color: colors.primary }]}>Already have an account? Log in</Text></Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
      <CaptchaModal
        visible={captchaVisible}
        onVerified={handleCaptchaVerified}
        onDismiss={() => setCaptchaVisible(false)}
      />
    </AuthCanvas>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 50,
    marginBottom: spacing.sm,
  },

  passwordContainer: {
    borderWidth: 1,
    borderRadius: 10,
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
