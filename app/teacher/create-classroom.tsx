import { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

export default function CreateClassroom() {
  const [classroomName, setClassroomName] = useState("");

  const handleCreate = () => {
    if (!classroomName.trim()) {
      Alert.alert(
        "Classroom Name Required",
        "Please enter a name for your classroom."
      );

      return;
    }

    // Temporary classroom code for Phase 1
    const classroomCode = "ABC123";

    router.replace({
      pathname: "/teacher/classroom-created",
      params: {
        name: classroomName,
        code: classroomCode,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Classroom</Text>

      <TextInput
        style={styles.input}
        placeholder="Classroom Name"
        value={classroomName}
        onChangeText={setClassroomName}
      />

      <Pressable
        style={styles.button}
        onPress={handleCreate}
      >
        <Text style={styles.buttonText}>
          Create Classroom
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
    marginBottom: 24,
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 16,
    borderRadius: 12,
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