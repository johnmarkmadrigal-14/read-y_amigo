import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function ChooseRole() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who are you?</Text>

      <Text style={styles.subtitle}>
        Choose how you will use READ-Y AMIGO.
      </Text>

      <Pressable
        style={styles.card}
        onPress={() => router.push("/auth/teacher-signup")}
      >
        <Text style={styles.cardTitle}>👩‍🏫 Teacher</Text>

        <Text style={styles.cardText}>
          Create classrooms and guide your learners.
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => router.push("/auth/learner-signup")}
      >
        <Text style={styles.cardTitle}>📚 Learner</Text>

        <Text style={styles.cardText}>
          Join a classroom and improve your reading skills.
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F7F5",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  cardText: {
    color: "#666",
    lineHeight: 20,
  },

  back: {
    textAlign: "center",
    marginTop: 16,
    color: "#2E7D32",
  },
});