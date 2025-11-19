import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { adminLogin } from '@/lib/appwrite';
import { useAuthStore } from '@/lib/useAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const clearCache = useAuthStore(state => state.clearCache);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // ✅ Clear any old cache before login
      clearCache();
      
      console.log('🔐 Attempting admin login...');
      
      // ✅ Now uses Appwrite session
      const response = await adminLogin(formData.email, formData.password);
      
      if (response.success) {
        setSuccess(true);
        
        console.log('✅ Login successful:', response);
        
        // ✅ Wait a bit for Appwrite session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to home
        router.replace('/(tabs)/home');
      } else {
        console.log('❌ Login failed:', response.error);
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card Container */}
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="login" size={28} color="#fff" />
              </View>
              <Text style={styles.title}>Admin Login</Text>
              <Text style={styles.subtitle}>Sign in to your admin account</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Success Message */}
              {success && (
                <View style={styles.successContainer}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.successText}>
                    ✅ Login successful! Redirecting...
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>❌ {error}</Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons 
                    name="email" 
                    size={20} 
                    color="#9CA3AF" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={formData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons 
                    name="lock" 
                    size={20} 
                    color="#9CA3AF" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={formData.password}
                    onChangeText={(text) => handleChange('password', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    disabled={isLoading}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Signing in...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(auth)/signUp')}
                  disabled={isLoading}
                >
                  <Text style={styles.signupLink}>Create one here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            🔒 Protected by industry-standard encryption
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF', // indigo-50
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginHorizontal: 4,
  },
  headerSection: {
    backgroundColor: '#6366F1', // indigo-600
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#C7D2FE', // indigo-200
  },
  formSection: {
    padding: 20,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5', // green-100
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6EE7B7', // green-300
  },
  successText: {
    fontSize: 13,
    color: '#047857', // green-700
    marginLeft: 8,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2', // red-100
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5', // red-300
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626', // red-600
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151', // gray-700
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827', // gray-900
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1', // indigo-600
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 13,
    color: '#6B7280', // gray-500
  },
  signupLink: {
    fontSize: 13,
    color: '#6366F1', // indigo-600
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF', // gray-400
    marginTop: 12,
    marginBottom: 8,
  },
});