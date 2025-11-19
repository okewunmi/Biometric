import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { View, Platform, Dimensions } from 'react-native';
import Feather from '@expo/vector-icons/Ionicons';
import Foundation from '@expo/vector-icons/Foundation';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
// import { useGlobalContext } from '../../context/GlobalProvider';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const TabLayout = () => {
  // const { loading, isLogged } = useGlobalContext();
//   const { loading = true, isLogged = false } = useGlobalContext() ?? {};
const insets = useSafeAreaInsets();
//   if (!loading && !isLogged) return <Redirect href="/signIn" />;
// Define common tab bar style
  const tabBarStyle = {
    backgroundColor: '#fff',
    paddingTop: isTablet ? 12 : 8,
    height: (isTablet ? 90 : 80) + insets.bottom,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 0,
    paddingBottom: (isTablet ? 20 : 15) + insets.bottom,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  };

const iconSize = isTablet ? 28 : 24;
  const focusedIconSize = isTablet ? 32 : 28;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: false,
          tabBarStyle: {
             backgroundColor: '#fff',
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
          name="courses"
          options={{
            title: 'courses',
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
          name="verify"
          options={{
            title: 'Verify',
            tabBarIcon: ({ focused }) => (
              <MaterialIcons 
                name="verified-user" 
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

export default TabLayout;