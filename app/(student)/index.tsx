// app/(student)/index.tsx

import { useAuth } from "@/lib/useAuth";
import {
  getAvailableCoursesForStudent,
  getStudentByMatricNumber,
  getStudentRegisteredCourses,
  getStudentRegistrationStats,
  registerStudentCourses,
  dropCourseRegistration,
} from "@/lib/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";

export default function StudentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const viewShotRef = useRef<any>(null);

  // State management
  const [activeTab, setActiveTab] = useState<"available" | "registered">(
    "available"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingReceipt, setExportingReceipt] = useState(false);

  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [registeredCourses, setRegisteredCourses] = useState<any[]>([]);
  const [registeredCourseCodes, setRegisteredCourseCodes] = useState<Set<string>>(
    new Set()
  );
  const [registrationStats, setRegistrationStats] = useState({
    totalRegistered: 0,
    approved: 0,
    pending: 0,
    totalUnits: 0,
  });

  const maxUnits = 24;

  // Helper functions
  const getCurrentAcademicYear = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    return currentMonth >= 9
      ? `${currentYear}/${currentYear + 1}`
      : `${currentYear - 1}/${currentYear}`;
  };

  const getCurrentSemester = () => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth >= 1 && currentMonth <= 6 ? "First" : "Second";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    else if (hour >= 12 && hour < 17) return "Good Afternoon";
    else if (hour >= 17 && hour < 21) return "Good Evening";
    else return "Good Night";
  };

  // Data fetching functions
 const loadStudentData = async () => {
  try {
    if (!user || !("matricNumber" in user)) {
      router.replace("/(auth)/signIn");
      return;
    }

    const result = await getStudentByMatricNumber(user.matricNumber);

    if (result.success && result.data) { // ✅ Add result.data check
      setStudentInfo(result.data);
      await fetchAvailableCourses(result.data.level, result.data.course);
      await fetchRegisteredCourses(result.data.matricNumber);
      await fetchRegistrationStats(result.data.matricNumber);
    } else {
      router.replace("/(auth)/signIn");
    }
  } catch (error) {
    console.error("Error loading student data:", error);
    router.replace("/(auth)/signIn");
  } finally {
    setLoading(false);
  }
};

  const fetchAvailableCourses = async (level: string, course: string) => {
    try {
      setCoursesLoading(true);
      const result = await getAvailableCoursesForStudent(level, course);
      if (result.success) {
        setAvailableCourses(result.data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchRegisteredCourses = async (matricNumber: string) => {
    try {
      const result = await getStudentRegisteredCourses(matricNumber);
      if (result.success) {
        setRegisteredCourses(result.data);
        const courseCodes = new Set(result.data.map((c: any) => c.courseCode));
        setRegisteredCourseCodes(courseCodes);
      }
    } catch (error) {
      console.error("Error fetching registered courses:", error);
    }
  };

  const fetchRegistrationStats = async (matricNumber: string) => {
    try {
      const result = await getStudentRegistrationStats(matricNumber);
      if (result.success) {
        setRegistrationStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudentData();
    setRefreshing(false);
  };

  // Effects
  useEffect(() => {
    loadStudentData();
  }, []);

  // Notification handler
  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Course selection handler
  const handleCourseSelection = (course: any) => {
    const isSelected = selectedCourses.find((c) => c.$id === course.$id);

    if (isSelected) {
      setSelectedCourses(selectedCourses.filter((c) => c.$id !== course.$id));
    } else {
      if (registeredCourseCodes.has(course.courseCode)) {
        showNotification(
          `${course.courseCode} is already registered`,
          "error"
        );
        return;
      }

      const totalUnits =
        selectedCourses.reduce((sum, c) => sum + c.courseUnit, 0) +
        course.courseUnit;

      if (totalUnits + registrationStats.totalUnits > maxUnits) {
        showNotification(
          `Cannot exceed ${maxUnits} units. Current: ${registrationStats.totalUnits} units`,
          "error"
        );
        return;
      }

      setSelectedCourses([...selectedCourses, course]);
    }
  };

  // Register courses handler
  const handleRegisterCourses = async () => {
    if (selectedCourses.length === 0) {
      showNotification("Please select at least one course", "error");
      return;
    }

    if (!studentInfo || !studentInfo.$id) {
      showNotification(
        "Student information not found. Please refresh.",
        "error"
      );
      return;
    }

    try {
      setRegistering(true);
      const currentSemester = getCurrentSemester();
      const currentAcademicYear = getCurrentAcademicYear();

      const result = await registerStudentCourses(
        studentInfo.$id,
        studentInfo.matricNumber,
        selectedCourses,
        currentAcademicYear as any,
        currentSemester as any
      );

      if (result.success || (result.data && result.data.length > 0)) {
        const successCount = result.data ? result.data.length : 0;
        const skipCount = result.skipped ? result.skipped.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;

        if (successCount > 0) {
          let message = `✅ ${successCount} course(s) registered successfully`;
          if (skipCount > 0) message += `, ${skipCount} already registered`;
          if (errorCount > 0) message += `, ${errorCount} failed`;

          showNotification(message, "success");
          setSelectedCourses([]);

          await fetchRegisteredCourses(studentInfo.matricNumber);
          await fetchRegistrationStats(studentInfo.matricNumber);

          setTimeout(() => setActiveTab("registered"), 1000);
        } else {
          showNotification(
            result.error || result.message || "Registration failed",
            "error"
          );
        }
      } else {
        showNotification(
          result.error || result.message || "Registration failed",
          "error"
        );
      }
    } catch (error: any) {
      console.error("❌ Error registering courses:", error);
      showNotification(
        `Registration failed: ${error.message || "Unknown error"}`,
        "error"
      );
    } finally {
      setRegistering(false);
    }
  };

  // Drop course handler
  const handleDropCourse = async (registrationId: string, courseCode: string) => {
    Alert.alert(
      "Drop Course",
      `Are you sure you want to drop ${courseCode}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Drop",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await dropCourseRegistration(registrationId);

              if (result.success) {
                showNotification(
                  result.message || "Course dropped successfully",
                  "success"
                );
                await fetchRegisteredCourses(studentInfo.matricNumber);
                await fetchRegistrationStats(studentInfo.matricNumber);
              } else {
                showNotification(
                  result.error || "Failed to drop course",
                  "error"
                );
              }
            } catch (error) {
              console.error("Error dropping course:", error);
              showNotification("Failed to drop course", "error");
            }
          },
        },
      ]
    );
  };

  // Export/Print Receipt Handler
  const handleExportReceipt = async () => {
    try {
      setExportingReceipt(true);
      
      // Small delay to ensure modal is rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!viewShotRef.current) {
        Alert.alert("Error", "Unable to generate receipt. Please try again.");
        return;
      }

      // Capture the view as image
      const uri = await viewShotRef.current.capture();
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Course Registration Receipt',
            UTI: 'public.png'
          });
        } else {
          // Fallback to basic share
          await Share.share({
            message: 'Course Registration Receipt',
            url: uri,
          });
        }
      }
      
      showNotification("Receipt exported successfully!", "success");
    } catch (error) {
      console.error("Error exporting receipt:", error);
      Alert.alert("Error", "Failed to export receipt. Please try again.");
    } finally {
      setExportingReceipt(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Filter courses
  const filteredCourses = availableCourses.filter(
    (course) =>
      course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSelectedUnits = selectedCourses.reduce(
    (sum, c) => sum + c.courseUnit,
    0
  );

  // Type guard
  const student = user && "matricNumber" in user ? user : null;

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!student || !studentInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#DC2626" />
          <Text style={styles.errorText}>Error loading student data</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/(auth)/signIn")}
          >
            <Text style={styles.retryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Notification */}
      {notification && (
        <View
          style={[
            styles.notification,
            notification.type === "success"
              ? styles.notificationSuccess
              : notification.type === "info"
              ? styles.notificationInfo
              : styles.notificationError,
          ]}
        >
          <MaterialIcons
            name={
              notification.type === "success"
                ? "check-circle"
                : notification.type === "info"
                ? "info"
                : "error"
            }
            size={20}
            color="#fff"
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="school" size={28} color="#fff" />
            <Text style={styles.headerTitle}>Student Portal</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <MaterialIcons name="logout" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.greeting}>{getGreeting()}, {studentInfo.firstName}! 👋</Text>
              <Text style={styles.matricText}>{studentInfo.matricNumber}</Text>
              <Text style={styles.departmentText}>{studentInfo.department}</Text>
              <View style={styles.badgesContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{studentInfo.level} Level</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {getCurrentAcademicYear()} {getCurrentSemester()}
                  </Text>
                </View>
              </View>
            </View>
            {studentInfo.profilePictureUrl ? (
              <Image
                source={{ uri: studentInfo.profilePictureUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {studentInfo.firstName?.charAt(0)}
                  {studentInfo.surname?.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.unitsDisplay}>
            <Text style={styles.unitsLabel}>Registered Units</Text>
            <Text style={styles.unitsValue}>
              {registrationStats.totalUnits}/{maxUnits}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {[
            {
              icon: "book",
              label: "Registered",
              value: registrationStats.totalRegistered,
              color: "#3B82F6",
            },
            {
              icon: "check-circle",
              label: "Approved",
              value: registrationStats.approved,
              color: "#10B981",
            },
            {
              icon: "schedule",
              label: "Pending",
              value: registrationStats.pending,
              color: "#F59E0B",
            },
            {
              icon: "library-books",
              label: "Available",
              value: availableCourses.length,
              color: "#8B5CF6",
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.statCard}>
              <View
                style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}
              >
                <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "available" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("available")}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={activeTab === "available" ? "#8B5CF6" : "#6B7280"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "available" && styles.tabTextActive,
              ]}
            >
              Available Courses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "registered" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("registered")}
          >
            <MaterialIcons
              name="check"
              size={20}
              color={activeTab === "registered" ? "#8B5CF6" : "#6B7280"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "registered" && styles.tabTextActive,
              ]}
            >
              My Courses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "available" ? (
          <View style={styles.tabContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color="#9CA3AF"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search courses..."
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {/* Register Button */}
            {selectedCourses.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  registering && styles.registerButtonDisabled,
                ]}
                onPress={handleRegisterCourses}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.registerButtonText}>
                      Register {selectedCourses.length} Course(s) (
                      {totalSelectedUnits} units)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Courses List */}
            {coursesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : filteredCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No courses found</Text>
                <Text style={styles.emptySubtext}>
                  {searchTerm
                    ? "Try adjusting your search"
                    : "No courses available for your level"}
                </Text>
              </View>
            ) : (
              <View style={styles.coursesList}>
                {filteredCourses.map((course) => {
                  const isSelected = selectedCourses.find(
                    (c) => c.$id === course.$id
                  );
                  const isRegistered = registeredCourseCodes.has(
                    course.courseCode
                  );

                  return (
                    <TouchableOpacity
                      key={course.$id}
                      style={[
                        styles.courseCard,
                        isSelected && styles.courseCardSelected,
                        isRegistered && styles.courseCardRegistered,
                      ]}
                      onPress={() =>
                        !isRegistered && handleCourseSelection(course)
                      }
                      disabled={isRegistered}
                    >
                      <View style={styles.courseHeader}>
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseCode}>
                            {course.courseCode}
                          </Text>
                          <View style={styles.courseUnit}>
                            <Text style={styles.courseUnitText}>
                              {course.courseUnit} Units
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            (isSelected || isRegistered) &&
                              styles.checkboxChecked,
                          ]}
                        >
                          {(isSelected || isRegistered) && (
                            <MaterialIcons name="check" size={16} color="#fff" />
                          )}
                        </View>
                      </View>
                      <Text style={styles.courseTitle}>
                        {course.courseTitle}
                      </Text>
                      <View style={styles.courseMeta}>
                        <MaterialIcons name="label" size={14} color="#6B7280" />
                        <Text style={styles.courseMetaText}>
                          {course.semester} Semester
                        </Text>
                      </View>
                      {isRegistered && (
                        <View style={styles.registeredBadge}>
                          <Text style={styles.registeredBadgeText}>
                            ✓ Already Registered
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {registeredCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="school" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No Registered Courses</Text>
                <Text style={styles.emptySubtext}>
                  You have not registered for any courses yet
                </Text>
                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={() => setActiveTab("available")}
                >
                  <Text style={styles.browseButtonText}>
                    Browse Available Courses
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {registeredCourses.map((course) => (
                  <View key={course.$id} style={styles.registeredCourseCard}>
                    <View style={styles.registeredCourseHeader}>
                      <View style={styles.registeredCourseInfo}>
                        <Text style={styles.courseCode}>
                          {course.courseCode}
                        </Text>
                        <View style={styles.courseUnit}>
                          <Text style={styles.courseUnitText}>
                            {course.courseUnit} Units
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            course.status === "Approved"
                              ? styles.statusApproved
                              : course.status === "Rejected"
                              ? styles.statusRejected
                              : styles.statusPending,
                          ]}
                        >
                          <Text style={styles.statusText}>{course.status}</Text>
                        </View>
                      </View>
                      {course.status === "Pending" && (
                        <TouchableOpacity
                          onPress={() =>
                            handleDropCourse(course.$id, course.courseCode)
                          }
                          style={styles.dropButton}
                        >
                          <MaterialIcons name="delete" size={20} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.courseTitle}>{course.courseTitle}</Text>
                    <Text style={styles.registeredDate}>
                      Registered:{" "}
                      {new Date(course.registeredAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Registration Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Total Courses:</Text>
                    <Text style={styles.summaryValue}>
                      {registrationStats.totalRegistered}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Total Units:</Text>
                    <Text style={styles.summaryValue}>
                      {registrationStats.totalUnits}/{maxUnits}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>Status:</Text>
                    <Text style={styles.summaryValue}>
                      <Text style={{ color: "#10B981" }}>
                        {registrationStats.approved}
                      </Text>{" "}
                      Approved •{" "}
                      <Text style={{ color: "#F59E0B" }}>
                        {registrationStats.pending}
                      </Text>{" "}
                      Pending
                    </Text>
                  </View>
                </View>

                {/* Print/Export Button */}
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={() => setShowReceipt(true)}
                >
                  <MaterialIcons name="print" size={20} color="#fff" />
                  <Text style={styles.printButtonText}>
                    Print Registration Form
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Receipt Modal */}
      <Modal
        visible={showReceipt}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowReceipt(false)}
      >
        <SafeAreaView style={styles.receiptContainer}>
          {/* Modal Header */}
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptHeaderTitle}>Registration Receipt</Text>
            <View style={styles.receiptHeaderActions}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExportReceipt}
                disabled={exportingReceipt}
              >
                {exportingReceipt ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="share" size={20} color="#fff" />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowReceipt(false)}
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Receipt Content */}
          <ScrollView style={styles.receiptScroll}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: "png", quality: 1.0 }}
              style={styles.receiptContent}
            >
              {/* University Header */}
              <View style={styles.receiptUniversityHeader}>
                <Text style={styles.receiptUniversityName}>
                  FEDERAL UNIVERSITY OYE EKITI
                </Text>
                <Text style={styles.receiptFormTitle}>
                  COURSE REGISTRATION FORM
                </Text>
                <Text style={styles.receiptSession}>
                  {getCurrentAcademicYear()} Academic Session -{" "}
                  {getCurrentSemester()} Semester
                </Text>
              </View>

              {/* Student Info */}
              <View style={styles.receiptStudentInfo}>
                {studentInfo.profilePictureUrl ? (
                  <Image
                    source={{ uri: studentInfo.profilePictureUrl }}
                    style={styles.receiptProfileImage}
                  />
                ) : (
                  <View style={styles.receiptProfilePlaceholder}>
                    <Text style={styles.receiptProfileInitials}>
                      {studentInfo.firstName?.charAt(0)}
                      {studentInfo.surname?.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.receiptStudentDetails}>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptLabel}>Matric Number:</Text>
                    <Text style={styles.receiptValue}>
                      {studentInfo.matricNumber}
                    </Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptLabel}>Full Name:</Text>
                    <Text style={styles.receiptValue}>
                      {studentInfo.surname} {studentInfo.firstName}{" "}
                      {studentInfo.middleName}
                    </Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptLabel}>Department:</Text>
                    <Text style={styles.receiptValue}>
                      {studentInfo.department}
                    </Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptLabel}>Level:</Text>
                    <Text style={styles.receiptValue}>{studentInfo.level}</Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptLabel}>Email:</Text>
                    <Text style={styles.receiptValue}>{studentInfo.email}</Text>
                  </View>
                </View>
              </View>

              {/* Courses Table */}
              <View style={styles.receiptCoursesSection}>
                <Text style={styles.receiptSectionTitle}>
                  Registered Courses
                </Text>

                {/* Table Header */}
                <View style={styles.receiptTableHeader}>
                  <Text style={[styles.receiptTableCell, { flex: 0.5 }]}>
                    S/N
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 1.5 }]}>
                    Course Code
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 3 }]}>
                    Course Title
                  </Text>
                  <Text style={[styles.receiptTableCell, { flex: 1 }]}>
                    Units
                  </Text>
                </View>

                {/* Table Rows */}
                {registeredCourses.map((course, index) => (
                  <View key={course.$id} style={styles.receiptTableRow}>
                    <Text style={[styles.receiptTableCell, { flex: 0.5 }]}>
                      {index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.receiptTableCell,
                        { flex: 1.5, fontWeight: "600" },
                      ]}
                    >
                      {course.courseCode}
                    </Text>
                    <Text style={[styles.receiptTableCell, { flex: 3 }]}>
                      {course.courseTitle}
                    </Text>
                    <Text
                      style={[
                        styles.receiptTableCell,
                        { flex: 1, textAlign: "center" },
                      ]}
                    >
                      {course.courseUnit}
                    </Text>
                  </View>
                ))}

                {/* Table Footer */}
                <View style={styles.receiptTableFooter}>
                  <Text style={[styles.receiptTableCell, { flex: 5 }]}>
                    TOTAL:
                  </Text>
                  <Text
                    style={[
                      styles.receiptTableCell,
                      { flex: 1, textAlign: "center", fontWeight: "bold" },
                    ]}
                  >
                    {registrationStats.totalUnits} Units
                  </Text>
                </View>
              </View>

              {/* Signatures */}
              <View style={styles.receiptSignatures}>
                <View style={styles.receiptSignatureBox}>
                  <Text style={styles.receiptSignatureLabel}>
                    Student's Signature:
                  </Text>
                  <View style={styles.receiptSignatureLine} />
                  <Text style={styles.receiptSignatureDate}>
                    Date: {new Date().toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.receiptSignatureBox}>
                  <Text style={styles.receiptSignatureLabel}>
                    HOD's Signature:
                  </Text>
                  <View style={styles.receiptSignatureLine} />
                  <Text style={styles.receiptSignatureDate}>
                    Date: _______________
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>
                  Printed on: {new Date().toLocaleString()}
                </Text>
                <Text style={styles.receiptFooterText}>
                  This is a computer-generated document.
                </Text>
              </View>
            </ViewShot>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    marginTop: 16,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  notification: {
    position: "absolute",
    top: 60,
    right: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationSuccess: {
    backgroundColor: "#10B981",
  },
  notificationError: {
    backgroundColor: "#DC2626",
  },
  notificationInfo: {
    backgroundColor: "#3B82F6",
  },
  notificationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 12,
  },
  logoutIcon: {
    padding: 8,
  },
  welcomeCard: {
    backgroundColor: "#8B5CF6",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  welcomeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  welcomeLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  matricText: {
    fontSize: 14,
    color: "#E9D5FF",
    marginBottom: 2,
  },
  departmentText: {
    fontSize: 13,
    color: "#E9D5FF",
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitials: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  unitsDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  unitsLabel: {
    fontSize: 14,
    color: "#E9D5FF",
  },
  unitsValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#EDE9FE",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  tabTextActive: {
    color: "#8B5CF6",
  },
  tabContent: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  courseCardSelected: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  courseCardRegistered: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  courseInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  courseUnit: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseUnitText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  courseTitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  courseMetaText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  registeredBadge: {
    marginTop: 8,
    backgroundColor: "#E5E7EB",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  registeredBadgeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  browseButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  registeredCourseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  registeredCourseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  registeredCourseInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: "#D1FAE5",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dropButton: {
    padding: 8,
  },
  registeredDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "#EDE9FE",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Receipt Modal Styles
  receiptContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  receiptHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  receiptHeaderActions: {
    flexDirection: "row",
    gap: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  closeButton: {
    padding: 8,
  },
  receiptScroll: {
    flex: 1,
  },
  receiptContent: {
    padding: 20,
    backgroundColor: "#fff",
  },
  receiptUniversityHeader: {
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    marginBottom: 20,
  },
  receiptUniversityName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  receiptFormTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  receiptSession: {
    fontSize: 12,
    color: "#6B7280",
  },
  receiptStudentInfo: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 16,
  },
  receiptProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  receiptProfilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptProfileInitials: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6B7280",
  },
  receiptStudentDetails: {
    flex: 1,
  },
  receiptInfoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    width: 120,
  },
  receiptValue: {
    fontSize: 12,
    color: "#111827",
    flex: 1,
  },
  receiptCoursesSection: {
    marginBottom: 20,
  },
  receiptSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
  },
  receiptTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  receiptTableRow: {
    flexDirection: "row",
    padding: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#D1D5DB",
  },
  receiptTableFooter: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#D1D5DB",
  },
  receiptTableCell: {
    fontSize: 11,
    color: "#111827",
  },
  receiptSignatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 20,
    gap: 20,
  },
  receiptSignatureBox: {
    flex: 1,
  },
  receiptSignatureLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 24,
  },
  receiptSignatureLine: {
    borderBottomWidth: 2,
    borderBottomColor: "#6B7280",
    width: "75%",
  },
  receiptSignatureDate: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  receiptFooter: {
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  receiptFooterText: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
  },
});