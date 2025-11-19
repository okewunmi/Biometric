import React from "react";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAdminAuth } from '../../context/AdminAuthContext';
const Layout = () => {
const { admin, loading, logout } = useAdminAuth();
  // const router = useRouter();

  if (!loading && admin) return <Redirect href="/home" />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        
        <Stack.Screen name="signIn" options={{ 
          headerShown: false,
          gestureEnabled: false, // Prevent swipe back
        }}  />
        <Stack.Screen name="signUp" 
        options={{ headerBackVisible: true, headerTitle: '' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
};

export default Layout;