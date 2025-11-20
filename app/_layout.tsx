import React, { useEffect, useCallback } from "react";
import { SplashScreen, Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import {  View } from "react-native";
import 'react-native-url-polyfill/auto'
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
       <AdminAuthProvider>
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
        </Stack>
        {/* <StatusBar style="light" /> */}
        </AdminAuthProvider>
  
    </View>
  );
};

export default RootLayout;
