import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>READ-Y AMIGO</Text>

      <Text style={styles.subtitle}>
        Learn, read, and improve together.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/auth/choose-role")}
      >
        <Text style={styles.primaryButtonText}>
          Create Account
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/auth/login")}
      >
        <Text style={styles.secondaryButtonText}>
          Log In
        </Text>
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

  logo: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#2E7D32",
    marginBottom: 12,
  },

  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },

  primaryButton: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
  },

  secondaryButtonText: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});