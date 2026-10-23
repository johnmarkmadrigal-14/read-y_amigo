import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "../theme/ThemeProvider";

// Place this at app/teacher/_layout.tsx.
// Each <Tabs.Screen name="..."> maps to a file in app/teacher/ with the same
// name (e.g. name="dashboard" -> app/teacher/dashboard.tsx).
export default function TeacherLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* TO-DO */}
      <Tabs.Screen
        name="todo"
        options={{
          title: "To-do",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="checkbox-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* NOTIFICATIONS */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* HIDDEN ROUTES
          These screens can still be opened with router.push(),
          but they will NOT appear in the bottom navigation. */}

      <Tabs.Screen
        name="classes"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="archived-classes"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="create-class"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="classroom-created"
        options={{
          href: null,
        }}
      />

      {/* CLASS DETAILS - HIDDEN FROM BOTTOM NAV */}
      <Tabs.Screen
        name="class/[id]"
        options={{
          href: null,
        }}
      />

      {/* ANNOUNCEMENT DETAILS - HIDDEN FROM BOTTOM NAV
          The screen still works when opened from ClassStream. */}
      <Tabs.Screen
        name="class/announcement/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}