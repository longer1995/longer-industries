// Minimal screen switcher (Home → Record). Kept dependency-light on purpose so
// the skeleton runs without a navigation library; swap in expo-router later.
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { CallType } from "./src/lib/types";

type Screen = { name: "home" } | { name: "record"; type: CallType; label: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen.name === "home" ? (
        <HomeScreen onPick={(type, label) => setScreen({ name: "record", type, label })} />
      ) : (
        <RecordScreen
          type={screen.type}
          label={screen.label}
          onDone={() => setScreen({ name: "home" })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b0c" },
});
