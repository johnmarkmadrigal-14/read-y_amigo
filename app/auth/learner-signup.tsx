import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

export default function LearnerSignup() {
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [age, setAge] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = () => {
    const numericAge = Number(age);

    if (
      !firstName ||
      !secondName ||
      !displayName ||
      !age ||
      !username ||
      !password
    ) {
      Alert.alert(
        "Incomplete",
        "Please complete all required fields."
      );

      return;
    }

    if (numericAge < 3) {
      Alert.alert(
        "Age Requirement",
        "Learners must be at least 3 years old."
      );

      return;
    }

    // Temporary navigation.
    // Later this will create the learner in MongoDB.
    router.replace("/learner/dashboard");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Learner Account</Text>

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
        placeholder="What do you want to be called?"
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
        placeholder="Choose a Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Choose a Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.button}
        onPress={handleSignup}
      >
        <Text style={styles.buttonText}>
          Create Learner Account
        </Text>
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