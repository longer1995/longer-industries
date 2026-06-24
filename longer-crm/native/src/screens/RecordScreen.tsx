// Records a call of the chosen type via the device mic (works with AirPods),
// shows a timer + required consent toggle, then submits to the pipeline.
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Audio } from "expo-av";
import { submitRecording } from "../lib/api";
import { CallType } from "../lib/types";

export function RecordScreen({
  type,
  label,
  onDone,
}: {
  type: CallType;
  label: string;
  onDone: () => void;
}) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    start();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    setRecording(recording);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function stopAndSubmit() {
    if (!recording) return;
    setBusy(true);
    if (timer.current) clearInterval(timer.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      await submitRecording({ type, consent, localUri: uri, durationSec: seconds });
    }
    setBusy(false);
    onDone();
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <Text style={styles.kind}>{label}</Text>
      <Text style={styles.timer}>{mmss}</Text>

      <View style={styles.consentRow}>
        <Switch value={consent} onValueChange={setConsent} />
        <Text style={styles.consentText}>I have consent to record</Text>
      </View>

      <Pressable
        style={[styles.stop, (!consent || busy) && styles.stopDisabled]}
        disabled={!consent || busy}
        onPress={stopAndSubmit}
      >
        <Text style={styles.stopText}>{busy ? "Processing…" : "Stop & Save"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0c" },
  kind: { color: "#9aa0a6", fontSize: 18, marginBottom: 8 },
  timer: { color: "#fff", fontSize: 64, fontVariant: ["tabular-nums"], marginBottom: 40 },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 40 },
  consentText: { color: "#e8eaed", fontSize: 16 },
  stop: { backgroundColor: "#d9534f", paddingHorizontal: 48, paddingVertical: 18, borderRadius: 16 },
  stopDisabled: { opacity: 0.4 },
  stopText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
