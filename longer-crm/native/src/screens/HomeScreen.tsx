// The four big capture buttons — the entire entry point of the app.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CALL_TYPES, CallType } from "../lib/types";

export function HomeScreen({ onPick }: { onPick: (type: CallType, label: string) => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Longer CRM</Text>
      <Text style={styles.subtitle}>Tap to capture</Text>
      <View style={styles.grid}>
        {CALL_TYPES.map(({ type, label }) => (
          <Pressable key={type} style={styles.tile} onPress={() => onPick(type, label)}>
            <Text style={styles.tileText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0c", paddingTop: 80, paddingHorizontal: 20 },
  title: { color: "#fff", fontSize: 32, fontWeight: "700" },
  subtitle: { color: "#9aa0a6", fontSize: 16, marginTop: 4, marginBottom: 28 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  tile: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: "#17181b",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { color: "#fff", fontSize: 20, fontWeight: "600" },
});
