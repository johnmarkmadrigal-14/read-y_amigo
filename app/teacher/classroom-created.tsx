import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

export default function ClassroomCreated() {
  const { name, code } = useLocalSearchParams<{
    name: string;
    code: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.check}>✓</Text>

      <Text style={styles.title}>
        Classroom Created!
      </Text>

      <Text style={styles.label}>
        Classroom Name
      </Text>

      <Text style={styles.classroomName}>
        {name}
      </Text>

      <Text style={styles.label}>
        Classroom Code
      </Text>

      <Text style={styles.code}>
        {code}
      </Text>

      <Text style={styles.info}>
        Share this code with your learners so they can join your classroom.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() =>
          router.replace("/teacher/dashboard")
        }
      >
        <Text style={styles.buttonText}>
          Go to Dashboard
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F4F7F5",
  },

  check: {
    fontSize: 64,
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },

  classroomName: {
    fontSize: 22,
    fontWeight: "700",
  },

  code: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 5,
  },

  info: {
    textAlign: "center",
    color: "#666",
    marginVertical: 30,
  },

  button: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});