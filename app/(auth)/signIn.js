// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import { MaterialIcons } from '@expo/vector-icons';
// import { adminLogin } from '@/lib/appwrite';
// import { useAuth } from '@/lib/useAuth';

// export default function AdminLoginPage() {
//   const router = useRouter();
//   const { user, clearCache, checkAuth } = useAuth();

//   const [formData, setFormData] = useState({
//     email: '',
//     password: ''
//   });
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');

//   // ✅ If already logged in, redirect immediately
//   useEffect(() => {
//     if (user) {
//       console.log('✅ User already logged in, redirecting to home');
//       router.replace('/home');
//     }
//   }, [user]);

//   const handleChange = (name, value) => {
//     setFormData({
//       ...formData,
//       [name]: value
//     });
//     setError('');
//   };

//   const handleSubmit = async () => {
//     if (!formData.email || !formData.password) {
//       setError('Please fill in all fields');
//       return;
//     }

//     setError('');
//     setIsLoading(true);

//     try {
//       // ✅ Clear any old cache before login
//       clearCache();

//       console.log('🔐 Attempting admin login...');

//       // ✅ Perform login
//       const response = await adminLogin(formData.email, formData.password);

//       if (response.success) {
//         console.log('✅ Login successful, checking auth...');

//         // ✅ CRITICAL: Force refresh auth state from server
//         await new Promise(resolve => setTimeout(resolve, 300));
//         const authResult = await checkAuth(true);

//         if (authResult.success && authResult.user) {
//           console.log('✅ Auth verified, redirecting to home');

//           // ✅ Small delay to ensure state propagates
//           await new Promise(resolve => setTimeout(resolve, 200));

//           // Navigate to home using replace to prevent back navigation
//           router.replace('/home');
//         } else {
//           console.error('❌ Auth verification failed after login');
//           setError('Login succeeded but verification failed. Please try again.');
//         }
//       } else {
//         console.log('❌ Login failed:', response.error);
//         setError(response.error || 'Login failed');
//       }
//     } catch (err) {
//       console.error('❌ Login error:', err);
//       const errorMessage = err.message || 'Login failed. Please check your credentials.';
//       setError(errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.keyboardView}
//       >
//         <ScrollView
//           contentContainerStyle={styles.scrollContent}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           <View style={styles.cardContainer}>
//             {/* Header Section */}
//             <View style={styles.headerSection}>
//               <View style={styles.iconWrapper}>
//                 <MaterialIcons name="login" size={28} color="#fff" />
//               </View>
//               <Text style={styles.title}>Admin Login</Text>
//               <Text style={styles.subtitle}>Sign in to your admin account</Text>
//             </View>

//             {/* Form Section */}
//             <View style={styles.formSection}>
//               {/* Error Message */}
//               {error && (
//                 <View style={styles.errorContainer}>
//                   <MaterialIcons name="error-outline" size={20} color="#DC2626" />
//                   <Text style={styles.errorText}>❌ {error}</Text>
//                 </View>
//               )}

//               {/* Email Input */}
//               <View style={styles.inputGroup}>
//                 <Text style={styles.label}>Email Address</Text>
//                 <View style={styles.inputContainer}>
//                   <MaterialIcons
//                     name="email"
//                     size={20}
//                     color="#9CA3AF"
//                     style={styles.inputIcon}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Enter your email"
//                     placeholderTextColor="#9CA3AF"
//                     value={formData.email}
//                     onChangeText={(text) => handleChange('email', text)}
//                     keyboardType="email-address"
//                     autoCapitalize="none"
//                     autoCorrect={false}
//                     editable={!isLoading}
//                   />
//                 </View>
//               </View>

//               {/* Password Input */}
//               <View style={styles.inputGroup}>
//                 <Text style={styles.label}>Password</Text>
//                 <View style={styles.inputContainer}>
//                   <MaterialIcons
//                     name="lock"
//                     size={20}
//                     color="#9CA3AF"
//                     style={styles.inputIcon}
//                   />
//                   <TextInput
//                     style={[styles.input, styles.passwordInput]}
//                     placeholder="Enter your password"
//                     placeholderTextColor="#9CA3AF"
//                     value={formData.password}
//                     onChangeText={(text) => handleChange('password', text)}
//                     secureTextEntry={!showPassword}
//                     autoCapitalize="none"
//                     autoCorrect={false}
//                     editable={!isLoading}
//                   />
//                   <TouchableOpacity
//                     onPress={() => setShowPassword(!showPassword)}
//                     style={styles.eyeIcon}
//                     disabled={isLoading}
//                   >
//                     <MaterialIcons
//                       name={showPassword ? 'visibility-off' : 'visibility'}
//                       size={20}
//                       color="#9CA3AF"
//                     />
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               {/* Submit Button */}
//               <TouchableOpacity
//                 style={[styles.button, isLoading && styles.buttonDisabled]}
//                 onPress={handleSubmit}
//                 disabled={isLoading}
//               >
//                 {isLoading ? (
//                   <>
//                     <ActivityIndicator color="#fff" size="small" />
//                     <Text style={styles.buttonText}>Signing in...</Text>
//                   </>
//                 ) : (
//                   <>
//                     <MaterialIcons name="login" size={20} color="#fff" />
//                     <Text style={styles.buttonText}>Sign In</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>

//           <Text style={styles.footer}>
//             🔒 Protected by industry-standard encryption
//           </Text>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#EEF2FF',
//   },
//   keyboardView: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 16,
//   },
//   cardContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 12,
//     elevation: 5,
//     marginHorizontal: 4,
//   },
//   headerSection: {
//     backgroundColor: '#6366F1',
//     paddingVertical: 20,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//   },
//   iconWrapper: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 13,
//     color: '#C7D2FE',
//   },
//   formSection: {
//     padding: 20,
//   },
//   errorContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FEE2E2',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: '#FCA5A5',
//   },
//   errorText: {
//     fontSize: 13,
//     color: '#DC2626',
//     marginLeft: 8,
//     flex: 1,
//   },
//   inputGroup: {
//     marginBottom: 16,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 6,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 8,
//     backgroundColor: '#fff',
//   },
//   inputIcon: {
//     marginLeft: 10,
//   },
//   input: {
//     flex: 1,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     fontSize: 14,
//     color: '#111827',
//   },
//   passwordInput: {
//     paddingRight: 40,
//   },
//   eyeIcon: {
//     position: 'absolute',
//     right: 12,
//     padding: 4,
//   },
//   button: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#6366F1',
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginTop: 8,
//     shadowColor: '#6366F1',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.4,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   buttonDisabled: {
//     opacity: 0.5,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   footer: {
//     textAlign: 'center',
//     fontSize: 12,
//     color: '#9CA3AF',
//     marginTop: 12,
//     marginBottom: 8,
//   },
// });

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function SignInSelection() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="school" size={64} color="#6366F1" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Please select your login type to continue
          </Text>
        </View>

        {/* Login Options */}
        <View style={styles.optionsContainer}>
          {/* Admin Login Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/(auth)/adminLogin")}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.adminIconCircle]}>
              <MaterialIcons
                name="admin-panel-settings"
                size={40}
                color="#fff"
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Admin Login</Text>
              <Text style={styles.optionDescription}>
                For administrators and staff members
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Student Login Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push("/(auth)/studentLogin")}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.studentIconCircle]}>
              <MaterialIcons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Student Login</Text>
              <Text style={styles.optionDescription}>
                For registered students
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialIcons name="security" size={16} color="#9CA3AF" />
          <Text style={styles.footerText}>Secure authentication system</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  adminIconCircle: {
    backgroundColor: "#6366F1",
  },
  studentIconCircle: {
    backgroundColor: "#8B5CF6",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 48,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
