// import React from "react";
// import { Redirect, Stack } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import { useAdminAuth } from '../../context/AdminAuthContext';
// const Layout = () => {
// const { admin, loading, logout } = useAdminAuth();
//   // const router = useRouter();

//   if (!loading && admin) return <Redirect href="/home" />;

//   return (
//     <>
//       <Stack screenOptions={{ headerShown: false }}>
        
//         <Stack.Screen name="signIn" options={{ 
//           headerShown: false,
//           gestureEnabled: false, 
//         }}  />
//         <Stack.Screen name="signUp" 
//         options={{ headerShown: false}} />
//       </Stack>
//       <StatusBar style="auto" />
//     </>
//   );
// };

// export default Layout;

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/useAuth'; // ✅ Changed from useAdminAuth

export default function AuthLayout() {
  const router = useRouter();
  const { user, loading } = useAuth(); // ✅ Changed from useAdminAuth

  // ✅ Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('✅ User already authenticated in auth layout, redirecting to home');
      router.replace('/home');
    }
  }, [user, loading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#EEF2FF' },
      }}
    >
      <Stack.Screen name="signIn" />
      <Stack.Screen name="signUp" />
    </Stack>
  );
}