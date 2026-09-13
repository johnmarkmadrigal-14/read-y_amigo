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
      {/* Home now IS the classes list (greeting + "My classes" cards) - see
          dashboard.tsx. The old standalone "Classes" tab was dropped since
          it duplicated this content; the file still exists but is hidden
          below so nothing 404s if something still links to it directly. */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: "To-do",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden from the tab bar - still reachable via router.push, just not
          a swipeable/tappable tab of its own anymore. */}
      <Tabs.Screen name="classes" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="archived-classes" options={{ href: null }} />
      <Tabs.Screen name="create-class" options={{ href: null }} />
      <Tabs.Screen name="classroom-created" options={{ href: null }} />
      <Tabs.Screen
        name="class/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}