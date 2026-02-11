import { useAuth } from "@/lib/useAuth";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function StudentLayout() {
  const router = useRouter();
  const { isStudent, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Redirect non-students away from this route group
    if (!loading && !isStudent && isAuthenticated) {
      console.log(
        "⚠️ Non-student trying to access student routes, redirecting...",
      );
      router.replace("/(tabs)/home");
    } else if (!loading && !isAuthenticated) {
      console.log("⚠️ Unauthenticated user, redirecting to login...");
      router.replace("/(auth)/signIn");
    }
  }, [isStudent, isAuthenticated, loading]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="student"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
