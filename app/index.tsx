//  import Entypo from '@expo/vector-icons/Entypo';
// import { router, useNavigation } from 'expo-router';
// import React, { useEffect } from 'react';
// import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { LinearGradient } from 'expo-linear-gradient';
// import 'react-native-url-polyfill/auto'
// const index = () => {
//   const navigation = useNavigation();

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       router.push('/home'); // Navigate to intro1.js after 3 seconds
//     }, 3000);

//     return () => clearTimeout(timer); // Clear timer on component unmount
//   }, [navigation]);

//   return (
//     <SafeAreaView style={styles.safe}>
//       <LinearGradient
//                 colors={['#4F46E5', '#9333EA']}

//               >
//       <View style={styles.view}>
//         <View style={styles.Logo}>
//           <Entypo name="fingerprint" size={32} color="black" />
//         </View>

//         <Text style={styles.txt}>Biometrics System</Text>
//         <ActivityIndicator
//           size="large"
//           color="#fff"
//           style={styles.customIndicator}
//         />
//       </View>
//       </LinearGradient>
//     </SafeAreaView>
//   );
// };

// export default index;

// const styles = StyleSheet.create({
//   safe: {
//     flex: 1,
//     // backgroundColor: '#3273F6',
//     color: '#fff',
//   },
//   view: {
//     height: '100%',
//     display: 'flex',
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//     paddingBottom: 90,
//   },
//   txt: {
//     color: '#fff',
//     fontSize: 30,
//     marginTop: 35,

//   },
//   customIndicator: {
//     marginTop: 180,
//     transform: [{ scale: 1.3 }],
//   },
//   Logo: {
//     backgroundColor: '#fff',
//     borderRadius: 100,
//     padding: 15,
//   },
// });

import { useAuth } from "@/lib/useAuth";
import Entypo from "@expo/vector-icons/Entypo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "react-native-url-polyfill/auto";

const Index = () => {
  const { isAuthenticated, isAdmin, isStudent, checkAuth, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check authentication on mount
    const verifyAuth = async () => {
      console.log("🔍 Checking authentication status...");
      await checkAuth(true); // Force refresh on app start
      setAuthChecked(true);
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    // Show splash screen for 3 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    // Route user after splash screen and auth check are complete
    if (!showSplash && authChecked && !loading) {
      console.log("🚀 Routing user...", {
        isAuthenticated,
        isAdmin,
        isStudent,
      });

      if (!isAuthenticated) {
        // Not logged in - go to login selection
        router.replace("/(auth)/signIn");
      } else if (isAdmin) {
        // Admin logged in - go to admin home
        router.replace("/(tabs)/home");
      } else if (isStudent) {
        // Student logged in - go to student page
        router.replace("/(student)/index");
      } else {
        // Fallback
        router.replace("/(auth)/signIn");
      }
    }
  }, [showSplash, authChecked, loading, isAuthenticated, isAdmin, isStudent]);

  // Always show splash screen during initial load
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#4F46E5", "#9333EA"]} style={styles.gradient}>
        <View style={styles.view}>
          <View style={styles.Logo}>
            <Entypo name="fingerprint" size={32} color="black" />
          </View>

          <Text style={styles.txt}>Biometrics System</Text>

          <ActivityIndicator
            size="large"
            color="#fff"
            style={styles.customIndicator}
          />

          {!authChecked && (
            <Text style={styles.loadingText}>Checking authentication...</Text>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default Index;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  view: {
    height: "100%",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 90,
  },
  txt: {
    color: "#fff",
    fontSize: 30,
    marginTop: 35,
    fontWeight: "600",
  },
  customIndicator: {
    marginTop: 180,
    transform: [{ scale: 1.3 }],
  },
  Logo: {
    backgroundColor: "#fff",
    borderRadius: 100,
    padding: 15,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 20,
    opacity: 0.8,
  },
});
