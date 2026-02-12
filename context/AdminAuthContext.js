
import { getCurrentUser, logOut } from "@/lib/appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// Create context
const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'admin' or 'student'
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const hasCheckedInitialAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on mount
    if (!hasCheckedInitialAuth.current) {
      hasCheckedInitialAuth.current = true;
      checkAuth();
    }
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (loading || isCheckingAuth) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inStudentGroup = segments[0] === "(student)";

    if (!user && !inAuthGroup) {
      // User not logged in and not on auth screen - redirect to login selection
      console.log("No active session, redirecting to login selection");
      router.replace("/signIn");
    } else if (user && userType === "admin" && inAuthGroup) {
      // Admin logged in but on auth screen - redirect to home
      console.log("Admin authenticated, redirecting to home");
      router.replace("/home");
    } else if (user && userType === "student" && inAuthGroup) {
      // Student logged in but on auth screen - redirect to student page
      console.log("Student authenticated, redirecting to student page");
      router.replace("/student");
    } else if (user && userType === "admin" && inStudentGroup) {
      // Admin trying to access student routes
      console.log("Admin cannot access student routes, redirecting to home");
      router.replace("/home");
    } else if (user && userType === "student" && inTabsGroup) {
      // Student trying to access admin routes
      console.log(
        "Student cannot access admin routes, redirecting to student page",
      );
      router.replace("/student");
    }
  }, [user, userType, loading, segments, isCheckingAuth]);

  const checkAuth = async () => {
    // Prevent concurrent auth checks
    if (isCheckingAuth) {
      console.log("⏳ Auth check already in progress");
      return;
    }

    setIsCheckingAuth(true);
    setLoading(true);

    try {
      console.log("🔍 Checking authentication...");

      // Check for student auth first (from AsyncStorage)
      const studentData = await AsyncStorage.getItem("studentData");
      const storedUserType = await AsyncStorage.getItem("userType");

      if (studentData && storedUserType === "student") {
        // Student is logged in
        const parsedStudentData = JSON.parse(studentData);
        console.log(
          "✅ Student authenticated:",
          parsedStudentData.matricNumber,
        );
        setUser(parsedStudentData);
        setUserType("student");
      } else {
        // Check for admin auth (from Appwrite session)
        const result = await getCurrentUser();

        if (result && result.username) {
          // Admin is logged in
          console.log("✅ Admin authenticated:", result.username);
          setUser(result);
          setUserType("admin");
        } else {
          // No user found
          console.log("❌ No active session");
          setUser(null);
          setUserType(null);
        }
      }
    } catch (error) {
      console.error("❌ Auth check error:", error);
      setUser(null);
      setUserType(null);
    } finally {
      setLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const clearCache = () => {
    console.log("🧹 Clearing auth cache");
    setUser(null);
    setUserType(null);
  };

  const logout = async () => {
    try {
      console.log("🔴 Logging out...");

      if (userType === "admin") {
        // Admin logout - clear Appwrite session
        await logOut();
      } else if (userType === "student") {
        // Student logout - clear AsyncStorage
        await AsyncStorage.removeItem("studentData");
        await AsyncStorage.removeItem("authId");
        await AsyncStorage.removeItem("userType");
      }

      setUser(null);
      setUserType(null);
      console.log("✅ User logged out successfully");

      // Small delay to ensure state is cleared before redirect
      setTimeout(() => {
        router.replace("/signIn");
      }, 100);
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Still clear state and redirect even if logout fails
      setUser(null);
      setUserType(null);
      router.replace("/signIn");
    }
  };

  const value = {
    user,
    userType,
    loading,
    checkAuth,
    logout,
    clearCache,
    isAuthenticated: !!user,
    isAdmin: userType === "admin",
    isStudent: userType === "student",
  };

  // Show loading screen while checking initial auth
  if (loading && !hasCheckedInitialAuth.current) {
    return null; // Or return a loading component
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Export alias for backward compatibility
export const useAdminAuth = useAuth;
