import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

export default function TeacherSignup() {
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [learnerLevel, setLearnerLevel] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = () => {
    const numericAge = Number(age);

    if (!firstName || !secondName || !displayName || !age) {
      Alert.alert("Incomplete", "Please complete all required fields.");
      return;
    }

    if (numericAge < 15) {
      Alert.alert(
        "Age Requirement",
        "Teachers must be at least 15 years old."
      );
      return;
    }

    // Temporary navigation.
    // Later, this will send data to MongoDB through the backend.
    router.replace("/teacher/dashboard");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Teacher Account</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Second / Last Name"
        value={secondName}
        onChangeText={setSecondName}
      />

      <TextInput
        style={styles.input}
        placeholder="Middle Initial"
        value={middleInitial}
        onChangeText={setMiddleInitial}
      />

      <TextInput
        style={styles.input}
        placeholder="How should learners address you? (Ms. Santos)"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TextInput
        style={styles.input}
        placeholder="Age"
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
      />

      <TextInput
        style={styles.input}
        placeholder="Level of learners you teach"
        value={learnerLevel}
        onChangeText={setLearnerLevel}
      />

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.button}
        onPress={handleSignup}
      >
        <Text style={styles.buttonText}>Create Teacher Account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F7F5",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },
});