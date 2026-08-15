import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { LocationProvider } from "@/src/LocationContext";

const haragedekTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: "#e67e35", background: "#1f2937", card: "#2d3748", border: "rgba(230,126,53,0.2)" },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={haragedekTheme}>
      <LocationProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#1f2937" } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="light" />
      </LocationProvider>
    </ThemeProvider>
  );
}
