
// import React from 'react';
// import { Redirect, Tabs } from 'expo-router';
// import { View, Platform, Dimensions, StyleSheet } from 'react-native';
// import Feather from '@expo/vector-icons/Ionicons';
// import Foundation from '@expo/vector-icons/Foundation';
// import { StatusBar } from 'expo-status-bar';
// import { Ionicons, MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
// import Entypo from '@expo/vector-icons/Entypo';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const { width } = Dimensions.get('window');
// const isTablet = width >= 768;

// const TabLayout = () => {
//   const insets = useSafeAreaInsets();

//   const iconSize = isTablet ? 28 : 24;
//   const focusedIconSize = isTablet ? 32 : 28;

//   return (
//     <>
//       <Tabs
//         screenOptions={{
//           tabBarShowLabel: true,
//           tabBarActiveTintColor: '#4F46E5',
//           tabBarInactiveTintColor: '#9CA3AF',
//           headerShown: false,
//           tabBarStyle: {
//             backgroundColor: '#ffffffff',
//             paddingTop: isTablet ? 12 : 8,
//             height: (isTablet ? 90 : 80) + insets.bottom,
//             borderTopWidth: 1,
//             borderColor: '#E0E0E0',
//             elevation: 0,
//             paddingBottom: (isTablet ? 20 : 15) + insets.bottom,
//             width: '100%',
//             alignSelf: 'center',
//             justifyContent: 'center',
//           },
//           tabBarLabelStyle: {
//             fontSize: isTablet ? 13 : 11,
//             fontWeight: '600',
//           },
//         }}
//       >
//         <Tabs.Screen
//           name="home"
//           options={{
//             title: 'Home',
//             tabBarIcon: ({ focused }) => (
//               <Foundation
//                 name={'home'}
//                 size={focused ? focusedIconSize : iconSize}
//                 color={focused ? '#4F46E5' : '#9CA3AF'}
//               />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="students"
//           options={{
//             title: 'Students',
//             tabBarIcon: ({ focused }) => (
//               <Ionicons
//                 name="people"
//                 size={focused ? focusedIconSize : iconSize}
//                 color={focused ? '#4F46E5' : '#9CA3AF'}
//               />
//             ),
//           }}
//         />

//         {/* CALL TO ACTION VERIFY TAB */}
//         <Tabs.Screen
//           name="verify"
//           options={{
//             title: 'Verify',
//             tabBarIcon: ({ focused }) => (
//               <View style={styles.ctaButtonContainer}>
//                 <View style={[
//                   styles.ctaButton,
//                   focused && styles.ctaButtonFocused
//                 ]}>
//                   <MaterialIcons 
//                     name="verified-user" 
//                     size={isTablet ? 32 : 28}
//                     color="#FFFFFF"
//                   />
//                 </View>
//               </View>
//             ),
//             tabBarLabel: ({ focused }) => (
//               <View style={styles.ctaLabelContainer}>
//                 <View style={[
//                   styles.ctaLabel,
//                   focused && styles.ctaLabelFocused
//                 ]}>
//                   {/* Label is hidden but you can add text here if needed */}
//                 </View>
//               </View>
//             ),
//             tabBarLabelStyle: {
//               fontSize: isTablet ? 13 : 11,
//               fontWeight: '700',
//               color: '#4F46E5',
//             },
//           }}
//         />

//         <Tabs.Screen
//           name="courses"
//           options={{
//             title: 'Courses',
//             tabBarIcon: ({ focused }) => (
//               <Ionicons
//                 name="book"
//                 size={focused ? focusedIconSize : iconSize}
//                 color={focused ? '#4F46E5' : '#9CA3AF'}
//               />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="mark-attendance"
//           options={{
//             title: 'Attendance',
//             tabBarIcon: ({ focused }) => (
//               <FontAwesome6 
//                 name={'calendar-check'} 
//                 size={focused ? focusedIconSize : iconSize}
//                 color={focused ? '#4F46E5' : '#9CA3AF'}
//               />
//             ),
//           }}
//         />

//         {/* Additional screens that won't show in tabs */}
//         <Tabs.Screen
//           name="reports"
//           options={{
//             href: null, // This hides it from the tab bar
//           }}
//         />

//         <Tabs.Screen
//           name="registered-courses"
//           options={{
//             href: null,
//           }}
//         />

//         <Tabs.Screen
//           name="sub-admin"
//           options={{
//             href: null,
//           }}
//         />

//         <Tabs.Screen
//           name="manage-admins"
//           options={{
//             href: null,
//           }}
//         />

//         <Tabs.Screen
//           name="exam-sessions"
//           options={{
//             href: null,
//           }}
//         /> 
//       </Tabs>

//       <StatusBar style="dark" />
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   ctaButtonContainer: {
//     position: 'relative',
//     top: -15, // Elevate the button above tab bar
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   ctaButton: {
//     width: isTablet ? 80 : 70,
//     height: isTablet ? 80 : 70,
//     borderRadius: isTablet ? 40 : 35,
//     backgroundColor: '#4F46E5', // Primary indigo color
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#4F46E5',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//     borderWidth: 8,
//     borderColor: '#F3F4F6',
//   },
//   ctaButtonFocused: {
//     backgroundColor: '#6366F1', // Lighter indigo when focused
//     transform: [{ scale: 1.05 }],
//     shadowOpacity: 0.4,
//     shadowRadius: 12,
//     elevation: 12,
//   },
//   ctaLabelContainer: {
//     marginTop: -5,
//   },
//   ctaLabel: {
//     fontSize: isTablet ? 11 : 10,
//     fontWeight: '700',
//     color: '#4F46E5',
//   },
//   ctaLabelFocused: {
//     color: '#6366F1',
//   },
// });

// export default TabLayout;

import React, { useEffect, useState } from 'react';
import { Redirect, Tabs, useRouter, useSegments } from 'expo-router';
import { View, Platform, Dimensions, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Foundation from '@expo/vector-icons/Foundation';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/useAuth';
// Or if you're using context:
// import { useAdminAuth } from '@/context/AdminAuthContext';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const TabLayout = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  // Choose your auth method:
  const { user, loading, checkAuth } = useAuth();
  // OR: const { admin: user, loading, checkAuth } = useAdminAuth();

  const iconSize = isTablet ? 28 : 24;
  const focusedIconSize = isTablet ? 32 : 28;

  // Check authentication on mount (only once)
  useEffect(() => {
    const initAuth = async () => {
      if (!hasCheckedAuth) {
        console.log('🔍 Initial auth check for tabs...');
        await checkAuth(false); // Don't force refresh
        setHasCheckedAuth(true);
      }
    };

    initAuth();
  }, []);

  // Handle navigation based on auth state (only after initial check)
  useEffect(() => {
    if (!hasCheckedAuth || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && inTabsGroup) {
      console.log('🔒 No session in tabs - redirecting to login');
      router.replace('/signIn');
    }
  }, [user, loading, segments, hasCheckedAuth]);

  // Show loading screen during initial auth check
  if (loading || !hasCheckedAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If not authenticated after loading, redirect to login
  if (!user) {
    console.log('🔒 Not authenticated - redirecting to login');
    return <Redirect href="/signIn" />;
  }

  // User is authenticated, render tabs
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            paddingTop: isTablet ? 12 : 8,
            height: (isTablet ? 90 : 80) + insets.bottom,
            borderTopWidth: 1,
            borderColor: '#E0E0E0',
            elevation: 0,
            paddingBottom: (isTablet ? 20 : 15) + insets.bottom,
            width: '100%',
            alignSelf: 'center',
            justifyContent: 'center',
          },
          tabBarLabelStyle: {
            fontSize: isTablet ? 13 : 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Foundation
                name={'home'}
                size={focused ? focusedIconSize : iconSize}
                color={focused ? '#4F46E5' : '#9CA3AF'}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="students"
          options={{
            title: 'Students',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="people"
                size={focused ? focusedIconSize : iconSize}
                color={focused ? '#4F46E5' : '#9CA3AF'}
              />
            ),
          }}
        />

        {/* CALL TO ACTION VERIFY TAB */}
        <Tabs.Screen
          name="verify"
          options={{
            title: 'Verify',
            tabBarIcon: ({ focused }) => (
              <View style={styles.ctaButtonContainer}>
                <View style={[
                  styles.ctaButton,
                  focused && styles.ctaButtonFocused
                ]}>
                  <MaterialIcons 
                    name="verified-user" 
                    size={isTablet ? 32 : 28}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            ),
            tabBarLabel: ({ focused }) => (
              <View style={styles.ctaLabelContainer}>
                <View style={[
                  styles.ctaLabel,
                  focused && styles.ctaLabelFocused
                ]}>
                  {/* Label is hidden but you can add text here if needed */}
                </View>
              </View>
            ),
            tabBarLabelStyle: {
              fontSize: isTablet ? 13 : 11,
              fontWeight: '700',
              color: '#4F46E5',
            },
          }}
        />

        <Tabs.Screen
          name="courses"
          options={{
            title: 'Courses',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="book"
                size={focused ? focusedIconSize : iconSize}
                color={focused ? '#4F46E5' : '#9CA3AF'}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="mark-attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ focused }) => (
              <FontAwesome6 
                name={'calendar-check'} 
                size={focused ? focusedIconSize : iconSize}
                color={focused ? '#4F46E5' : '#9CA3AF'}
              />
            ),
          }}
        />

        {/* Additional screens that won't show in tabs */}
        <Tabs.Screen
          name="reports"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />

        <Tabs.Screen
          name="registered-courses"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="sub-admin"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="manage-admins"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="exam-sessions"
          options={{
            href: null,
          }}
        /> 
      </Tabs>

      <StatusBar style="dark" />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  ctaButtonContainer: {
    position: 'relative',
    top: -15, // Elevate the button above tab bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    width: isTablet ? 80 : 70,
    height: isTablet ? 80 : 70,
    borderRadius: isTablet ? 40 : 35,
    backgroundColor: '#4F46E5', // Primary indigo color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 8,
    borderColor: '#F3F4F6',
  },
  ctaButtonFocused: {
    backgroundColor: '#6366F1', // Lighter indigo when focused
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  ctaLabelContainer: {
    marginTop: -5,
  },
  ctaLabel: {
    fontSize: isTablet ? 11 : 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  ctaLabelFocused: {
    color: '#6366F1',
  },
});

export default TabLayout;