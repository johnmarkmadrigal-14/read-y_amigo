import { useState } from "react";

import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";

export default function JoinClassroom() {
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (!code.trim()) {
      Alert.alert(
        "Classroom Code Required",
        "Please enter the code given by your teacher."
      );
      return;
    }

    // Temporary Phase 1 behavior
    router.replace("/learner/classroom-joined");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Classroom</Text>

      <Text style={styles.subtitle}>
        Enter the classroom code given by your teacher.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Classroom Code"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />

      <Pressable
        style={styles.button}
        onPress={handleJoin}
      >
        <Text style={styles.buttonText}>
          Join Classroom
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

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 18,
    borderRadius: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 16,
  },

  button: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },
});