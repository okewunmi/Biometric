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
import { create } from 'zustand';
import { getCurrentAdmin, adminLogout } from './appwrite';

// ✅ Define types to match what getCurrentAdmin() actually returns
interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  lastChecked: number | null;
  isCheckingAuth: boolean; // NEW: Prevent multiple simultaneous checks
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: (forceRefresh?: boolean) => Promise<{ success: boolean; user?: User }>;
  logout: () => Promise<void>;
  clearCache: () => void;
}

// ✅ Global state management (persists across components)
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  lastChecked: null,
  isCheckingAuth: false, // NEW: Track if auth check is in progress
  
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  
  // ✅ Check auth with caching (5 minute cache) and prevent concurrent checks
  checkAuth: async (forceRefresh = false) => {
    const state = get();
    
    // CRITICAL FIX: Prevent multiple simultaneous auth checks
    if (state.isCheckingAuth && !forceRefresh) {
      console.log('⏳ Auth check already in progress, skipping...');
      return { success: !!state.user, user: state.user || undefined };
    }
    
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Return cached user if within 5 minutes
    if (
      !forceRefresh && 
      state.user && 
      state.lastChecked && 
      (now - state.lastChecked) < fiveMinutes
    ) {
      console.log('✅ Using cached user session');
      return { success: true, user: state.user };
    }
    
    // CRITICAL FIX: Mark as checking to prevent concurrent calls
    set({ loading: true, isCheckingAuth: true });
    
    try {
      console.log('🔍 Checking authentication...');
      const result = await getCurrentAdmin();
      
      if (result.success && result.user) {
        console.log('✅ Authentication successful:', result.user.username);
        set({ 
          user: result.user, 
          loading: false, 
          lastChecked: now,
          isCheckingAuth: false 
        });
        return { success: true, user: result.user };
      } else {
        console.log('❌ No active session');
        set({ 
          user: null, 
          loading: false, 
          isCheckingAuth: false 
        });
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      set({ 
        user: null, 
        loading: false, 
        isCheckingAuth: false 
      });
      return { success: false };
    }
  },
  
  // ✅ Logout and clear cache
  logout: async () => {
    console.log('🔴 Logging out...');
    
    try {
      await adminLogout();
      console.log('✅ Admin logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
    
    // Always clear state regardless of logout success
    set({ 
      user: null, 
      loading: false, 
      lastChecked: null,
      isCheckingAuth: false 
    });
  },
  
  // ✅ Clear cache manually
  clearCache: () => set({ 
    user: null, 
    lastChecked: null,
    isCheckingAuth: false 
  })
}));

// ✅ Custom hook for easy usage
export const useAuth = () => {
  const { user, loading, checkAuth, logout, clearCache } = useAuthStore();
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    checkAuth,
    logout,
    clearCache
  };
};