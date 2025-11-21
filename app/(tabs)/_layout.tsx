import React, { useEffect, useState } from 'react';
import { Redirect, Tabs, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Text, Dimensions } from 'react-native';
import Foundation from '@expo/vector-icons/Foundation';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/useAuth';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const TabLayout = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { user, loading, checkAuth } = useAuth();

  const iconSize = isTablet ? 28 : 24;
  const focusedIconSize = isTablet ? 32 : 28;

  // ✅ CRITICAL FIX: Single auth check on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('🔍 Tab Layout: Initializing auth...');
      
      try {
        // Force a fresh auth check
        const result = await checkAuth(true);
        
        if (!isMounted) return;

        console.log('✅ Auth check complete:', result.success ? 'Authenticated' : 'Not authenticated');
        
        // Small delay to ensure state propagates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsInitializing(false);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - only run once

  // ✅ Handle navigation AFTER initialization completes
  useEffect(() => {
    // Don't do anything while initializing
    if (isInitializing || loading) {
      console.log('⏳ Still initializing or loading...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('📍 Current location:', segments[0], '| User:', user ? 'Logged in' : 'Not logged in');

    // If no user and we're in tabs, redirect to login
    if (!user && inTabsGroup) {
      console.log('🔒 No session in tabs - redirecting to login');
      router.replace('/signIn');
    }
    // If user exists and we're in auth screens, redirect to home
    else if (user && inAuthGroup) {
      console.log('✅ User authenticated in auth screen - redirecting to home');
      router.replace('/home');
    }
  }, [user, isInitializing, loading, segments]);

  // Show loading while initializing
  if (isInitializing || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If not authenticated after initialization, show redirect component
  if (!user) {
    console.log('🔒 Not authenticated after init - redirecting to login');
    return <Redirect href="/signIn" />;
  }

  // User is authenticated, render tabs
  console.log('✅ Rendering tabs for authenticated user');
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
              <Ionicons 
                name={'clipboard'} 
                size={focused ? focusedIconSize : iconSize}
                color={focused ? '#4F46E5' : '#9CA3AF'}
              />
            ),
          }}
        />

        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="registered-courses" options={{ href: null }} />
        <Tabs.Screen name="sub-admin" options={{ href: null }} />
        <Tabs.Screen name="manage-admins" options={{ href: null }} />
        <Tabs.Screen name="exam-sessions" options={{ href: null }} />
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
    top: -15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    width: isTablet ? 80 : 70,
    height: isTablet ? 80 : 70,
    borderRadius: isTablet ? 40 : 35,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 8,
    borderColor: '#F3F4F6',
  },
  ctaButtonFocused: {
    backgroundColor: '#6366F1',
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