import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useShareIntentContext } from "expo-share-intent";

export default function Index() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();
  const images = (shareIntent.files ?? []).filter((f) => f.mimeType?.startsWith("image/"));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>공유 수신 테스트</Text>

      {!hasShareIntent && <Text>다른 앱에서 원클릭밋으로 공유해 보세요.</Text>}

      {hasShareIntent && (
        <View style={styles.box}>
          <Row label="type" value={shareIntent.type} />
          <Row label="webUrl" value={shareIntent.webUrl} />
          <Row label="text" value={shareIntent.text} />
          <Row label="meta" value={shareIntent.meta ? JSON.stringify(shareIntent.meta, null, 2) : null} />
          <Row label="files" value={shareIntent.files ? JSON.stringify(shareIntent.files, null, 2) : null} />
          {images.map((f) => (
            <Image key={f.path} source={{ uri: f.path }} style={styles.image} />
          ))}
          <Pressable style={styles.button} onPress={() => resetShareIntent()}>
            <Text style={styles.buttonText}>초기화</Text>
          </Pressable>
        </View>
      )}

      {error && <Row label="error" value={String(error)} />}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  box: { gap: 12 },
  row: { gap: 4 },
  label: { fontWeight: "700", color: "#C93553" },
  image: { width: "100%", height: 240, resizeMode: "contain", backgroundColor: "#eee" },
  button: { backgroundColor: "#C93553", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
});