import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";

export default function ClassroomJoined() {
  return (
    <View style={styles.container}>
      <Text style={styles.check}>✓</Text>

      <Text style={styles.title}>
        Classroom Joined!
      </Text>

      <Text style={styles.text}>
        You have successfully joined the classroom.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() =>
          router.replace("/learner/dashboard")
        }
      >
        <Text style={styles.buttonText}>
          Go to My Classrooms
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
    marginBottom: 16,
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
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