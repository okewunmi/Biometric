import { changeStudentPassword, studentLogin } from "@/lib/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudentLoginPage() {
  const router = useRouter();
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Login form state
  const [formData, setFormData] = useState({
    matricNumber: "",
    password: "",
  });

  // Password change form state
  const [passwordChangeData, setPasswordChangeData] = useState({
    matricNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check if student is already logged in
  useEffect(() => {
    checkStudentAuth();
  }, []);

  const checkStudentAuth = async () => {
    try {
      const studentData = await AsyncStorage.getItem("studentData");
      if (studentData) {
        console.log("✅ Student already logged in, redirecting");
        router.replace("/(student)/student");
      }
    } catch (error) {
      console.error("Error checking student auth:", error);
    }
  };

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
    setError("");
  };

  const handlePasswordChangeInput = (name, value) => {
    setPasswordChangeData({
      ...passwordChangeData,
      [name]: value,
    });
    setError("");
  };

  const handleLogin = async () => {
    if (!formData.matricNumber || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      console.log("🔐 Attempting student login...");

      const result = await studentLogin(
        formData.matricNumber.trim(),
        formData.password.trim(),
      );

      if (result.success) {
        console.log("✅ Student login successful");

        // Store student data in AsyncStorage
        await AsyncStorage.setItem("studentData", JSON.stringify(result.user));
        await AsyncStorage.setItem("authId", result.authId);
        await AsyncStorage.setItem("userType", "student");

        // Small delay to ensure state is saved
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Navigate to student screen
        router.replace("/(student)/student");
      } else {
        console.log("❌ Student login failed:", result.error);
        setError(result.error || "Login failed");
      }
    } catch (err) {
      console.error("❌ Student login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setError("");
    setSuccessMessage("");

    // Validate inputs
    if (
      !passwordChangeData.matricNumber ||
      !passwordChangeData.currentPassword ||
      !passwordChangeData.newPassword ||
      !passwordChangeData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    // Validate new password and confirmation match
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password length
    if (passwordChangeData.newPassword.trim().length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const result = await changeStudentPassword(
        passwordChangeData.matricNumber.trim(),
        passwordChangeData.currentPassword.trim(),
        passwordChangeData.newPassword.trim(),
      );

      if (result.success) {
        setSuccessMessage(
          "Password changed successfully! You can now login with your new password.",
        );
        setPasswordChangeData({
          matricNumber: "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        // Switch back to login form after 2 seconds
        setTimeout(() => {
          setShowChangePassword(false);
          setSuccessMessage("");
        }, 2000);
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch (err) {
      console.error("Password change error:", err);
      setError("Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.iconWrapper}>
                <MaterialIcons
                  name={showChangePassword ? "lock-reset" : "person"}
                  size={28}
                  color="#fff"
                />
              </View>
              <Text style={styles.title}>
                {showChangePassword ? "Change Password" : "Student Login"}
              </Text>
              <Text style={styles.subtitle}>
                {showChangePassword
                  ? "Update your password for security"
                  : "Enter your credentials to continue"}
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color="#DC2626"
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Success Message */}
              {successMessage && (
                <View style={styles.successContainer}>
                  <MaterialIcons
                    name="check-circle-outline"
                    size={20}
                    color="#059669"
                  />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              {!showChangePassword ? (
                // LOGIN FORM
                <>
                  {/* Matric Number Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Matric Number</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="badge"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="FTP/CS/24/0000001"
                        placeholderTextColor="#9CA3AF"
                        value={formData.matricNumber}
                        onChangeText={(text) =>
                          handleChange("matricNumber", text)
                        }
                        autoCapitalize="characters"
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
                        onChangeText={(text) => handleChange("password", text)}
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
                          name={showPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.buttonText}>Logging in...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="login" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Login</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Change Password Button */}
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setShowChangePassword(true);
                      setError("");
                    }}
                    disabled={isLoading}
                  >
                    <MaterialIcons
                      name="lock-reset"
                      size={20}
                      color="#6366F1"
                    />
                    <Text style={styles.secondaryButtonText}>
                      Change Password
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // PASSWORD CHANGE FORM
                <>
                  {/* Matric Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Matric Number</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="badge"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="FTP/CS/24/0000001"
                        placeholderTextColor="#9CA3AF"
                        value={passwordChangeData.matricNumber}
                        onChangeText={(text) =>
                          handlePasswordChangeInput("matricNumber", text)
                        }
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* Current Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="lock"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        placeholderTextColor="#9CA3AF"
                        value={passwordChangeData.currentPassword}
                        onChangeText={(text) =>
                          handlePasswordChangeInput("currentPassword", text)
                        }
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="lock-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password (min. 6 characters)"
                        placeholderTextColor="#9CA3AF"
                        value={passwordChangeData.newPassword}
                        onChangeText={(text) =>
                          handlePasswordChangeInput("newPassword", text)
                        }
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="lock-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter new password"
                        placeholderTextColor="#9CA3AF"
                        value={passwordChangeData.confirmPassword}
                        onChangeText={(text) =>
                          handlePasswordChangeInput("confirmPassword", text)
                        }
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* Change Password Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handlePasswordChange}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.buttonText}>
                          Changing Password...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="check" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Change Password</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Back to Login Button */}
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setShowChangePassword(false);
                      setError("");
                      setPasswordChangeData({
                        matricNumber: "",
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    disabled={isLoading}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={20}
                      color="#6366F1"
                    />
                    <Text style={styles.secondaryButtonText}>
                      Back to Login
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Info Footer */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Default password is your surname
              </Text>
              <Text style={styles.infoText}>
                Need help? Contact administrator
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginHorizontal: 4,
  },
  headerSection: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#E9D5FF",
    textAlign: "center",
  },
  formSection: {
    padding: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  successText: {
    fontSize: 13,
    color: "#059669",
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  inputIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
});
