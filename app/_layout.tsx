// export default RootLayout;
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import "react-native-url-polyfill/auto";

// ✅ No AdminAuthProvider needed - Zustand works globally!

// Prevent auto hiding of splash screen
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const [fontsLoaded, error] = useFonts({
    regular: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || error) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  useEffect(() => {
    if (error) {
      console.error("Font loading error:", error);
    }
  }, [error]);

  if (!fontsLoaded && !error) {
    return null; // Keep showing splash screen
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* ✅ No provider wrapper needed - Zustand is global */}
      <Stack
        screenOptions={{
          title: "",
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTintColor: "#000",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
};

export default RootLayout;
