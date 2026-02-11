// import { create } from 'zustand';
// import { getCurrentAdmin, adminLogout } from './appwrite';

// // ✅ Define types to match what getCurrentAdmin() actually returns
// interface User {
//   id: string;
//   username: string;
//   email: string;
//   isActive: boolean;
//   createdAt?: string;
// }

// interface AuthState {
//   user: User | null;
//   loading: boolean;
//   lastChecked: number | null;
//   setUser: (user: User | null) => void;
//   setLoading: (loading: boolean) => void;
//   checkAuth: (forceRefresh?: boolean) => Promise<{ success: boolean; user?: User }>;
//   logout: () => Promise<void>;
//   clearCache: () => void;
// }

// // ✅ Global state management (persists across components)
// export const useAuthStore = create<AuthState>((set, get) => ({
//   user: null,
//   loading: true,
//   lastChecked: null,

//   setUser: (user) => set({ user, loading: false }),
//   setLoading: (loading) => set({ loading }),

//   // ✅ Check auth with caching (5 minute cache)
//   checkAuth: async (forceRefresh = false) => {
//     const state = get();
//     const now = Date.now();
//     const fiveMinutes = 5 * 60 * 1000;

//     // Return cached user if within 5 minutes
//     if (
//       !forceRefresh &&
//       state.user &&
//       state.lastChecked &&
//       (now - state.lastChecked) < fiveMinutes
//     ) {
//       console.log('✅ Using cached user session');
//       return { success: true, user: state.user };
//     }

//     // Fetch fresh data
//     set({ loading: true });
//     const result = await getCurrentAdmin();

//     if (result.success && result.user) {
//       set({
//         user: result.user,
//         loading: false,
//         lastChecked: now
//       });
//       return { success: true, user: result.user };
//     } else {
//       set({ user: null, loading: false });
//       return { success: false };
//     }
//   },

//   // ✅ Logout and clear cache
//   logout: async () => {
//     await adminLogout();
//     set({ user: null, loading: false, lastChecked: null });
//   },

//   // ✅ Clear cache manually
//   clearCache: () => set({ user: null, lastChecked: null })
// }));

// // ✅ Custom hook for easy usage
// export const useAuth = () => {
//   const { user, loading, checkAuth, logout, clearCache } = useAuthStore();

//   return {
//     user,
//     loading,
//     isAuthenticated: !!user,
//     checkAuth,
//     logout,
//     clearCache
//   };
// };

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  adminLogout,
  getCurrentAdmin
} from "./appwrite";

// ✅ Define types for Admin and Student
interface AdminUser {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
}

interface StudentUser {
  $id: string;
  matricNumber: string;
  surname: string;
  firstName: string;
  middleName?: string;
  email: string;
  department: string;
  course: string;
  level: string;
  profilePictureUrl?: string;
  isActive: boolean;
}

type User = AdminUser | StudentUser;

interface AuthState {
  user: User | null;
  userType: "admin" | "student" | null;
  loading: boolean;
  lastChecked: number | null;
  setUser: (user: User | null, userType: "admin" | "student" | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: (
    forceRefresh?: boolean,
  ) => Promise<{
    success: boolean;
    user?: User;
    userType?: "admin" | "student";
  }>;
  logout: () => Promise<void>;
  clearCache: () => void;
}

// ✅ Global state management (persists across components)
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userType: null,
  loading: true,
  lastChecked: null,

  setUser: (user, userType) => set({ user, userType, loading: false }),
  setLoading: (loading) => set({ loading }),

  // ✅ Check auth with caching (5 minute cache) - supports both Admin and Student
  checkAuth: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Return cached user if within 5 minutes
    if (
      !forceRefresh &&
      state.user &&
      state.userType &&
      state.lastChecked &&
      now - state.lastChecked < fiveMinutes
    ) {
      console.log("✅ Using cached user session");
      return { success: true, user: state.user, userType: state.userType };
    }

    // Fetch fresh data
    set({ loading: true });

    try {
      // Check for Student auth first (from AsyncStorage)
      const studentData = await AsyncStorage.getItem("studentData");
      const storedUserType = await AsyncStorage.getItem("userType");

      if (studentData && storedUserType === "student") {
        // Student is logged in
        const parsedStudentData = JSON.parse(studentData);
        console.log(
          "✅ Student authenticated:",
          parsedStudentData.matricNumber,
        );

        set({
          user: parsedStudentData,
          userType: "student",
          loading: false,
          lastChecked: now,
        });

        return {
          success: true,
          user: parsedStudentData,
          userType: "student",
        };
      }

      // Check for Admin auth (from Appwrite session)
      const adminResult = await getCurrentAdmin();

      if (adminResult.success && adminResult.user) {
        console.log("✅ Admin authenticated:", adminResult.user.username);

        set({
          user: adminResult.user,
          userType: "admin",
          loading: false,
          lastChecked: now,
        });

        return {
          success: true,
          user: adminResult.user,
          userType: "admin",
        };
      }

      // No user found
      console.log("❌ No active session");
      set({ user: null, userType: null, loading: false });
      return { success: false };
    } catch (error) {
      console.error("❌ Auth check error:", error);
      set({ user: null, userType: null, loading: false });
      return { success: false };
    }
  },

  // ✅ Logout and clear cache - handles both Admin and Student
  logout: async () => {
    const state = get();

    try {
      console.log("🔴 Logging out...");

      if (state.userType === "admin") {
        // Admin logout - clear Appwrite session
        await adminLogout();
      } else if (state.userType === "student") {
        // Student logout - clear AsyncStorage
        await AsyncStorage.removeItem("studentData");
        await AsyncStorage.removeItem("authId");
        await AsyncStorage.removeItem("userType");
      }

      set({ user: null, userType: null, loading: false, lastChecked: null });
      console.log("✅ User logged out successfully");
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Still clear state even if logout fails
      set({ user: null, userType: null, loading: false, lastChecked: null });
    }
  },

  // ✅ Clear cache manually
  clearCache: () => {
    console.log("🧹 Clearing auth cache");
    set({ user: null, userType: null, lastChecked: null });
  },
}));

// ✅ Custom hook for easy usage
export const useAuth = () => {
  const { user, userType, loading, checkAuth, logout, clearCache } =
    useAuthStore();

  return {
    user,
    userType,
    loading,
    isAuthenticated: !!user,
    isAdmin: userType === "admin",
    isStudent: userType === "student",
    checkAuth,
    logout,
    clearCache,
  };
};

// Export alias for backward compatibility
export const useAdminAuth = useAuth;
