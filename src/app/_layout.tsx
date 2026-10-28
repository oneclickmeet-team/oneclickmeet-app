import { Stack } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <Stack screenOptions={{ title: "원클릭밋" }} />
    </ShareIntentProvider>
  );
}