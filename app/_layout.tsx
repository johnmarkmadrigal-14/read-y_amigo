import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/choose-role" />
      <Stack.Screen name="auth/teacher-signup" />
      <Stack.Screen name="auth/learner-signup" />

      <Stack.Screen name="teacher/dashboard" />
      <Stack.Screen name="teacher/create-classroom" />
      <Stack.Screen name="teacher/classroom-created" />

      <Stack.Screen name="learner/dashboard" />
      <Stack.Screen name="learner/join-classroom" />
      <Stack.Screen name="learner/classroom-joined" />
    </Stack>
  );
}