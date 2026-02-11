import { useAuth } from "@/lib/useAuth"; // ✅ Changed from useAdminAuth
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthLayout() {
  const router = useRouter();
  const { user, loading } = useAuth(); // ✅ Changed from useAdminAuth

  // ✅ Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log(
        "✅ User already authenticated in auth layout, redirecting to home",
      );
      router.replace("/home");
    }
  }, [user, loading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#EEF2FF" },
      }}
    >
      <Stack.Screen name="signIn" />
      <Stack.Screen name="signUp" />
    </Stack>
  );
}
