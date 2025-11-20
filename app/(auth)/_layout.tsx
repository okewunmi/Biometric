import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
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
          gestureEnabled: false, 
        }}  />
        <Stack.Screen name="signUp" 
        options={{ headerShown: false}} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
};

export default Layout;