import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

export default function TeacherDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Classrooms</Text>

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          You don't have any classrooms yet.
        </Text>

        <Text style={styles.emptySubtext}>
          Create your first classroom to get started.
        </Text>
      </View>

      <Pressable
        style={styles.plusButton}
        onPress={() =>
          router.push("/teacher/create-classroom")
        }
      >
        <Text style={styles.plus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },

  emptySubtext: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
  },

  plusButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: 60,

    width: 70,
    height: 70,

    borderRadius: 35,

    backgroundColor: "#2E7D32",

    justifyContent: "center",
    alignItems: "center",

    elevation: 5,
  },

  plus: {
    color: "white",
    fontSize: 40,
    fontWeight: "300",
  },
});