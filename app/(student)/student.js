import { useAuth } from "@/lib/useAuth";
import { MaterialIcons } from "@expo/vector-icons";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  // Type guard to ensure user is a student
  const student = user && "matricNumber" in user ? user : null;

  if (!student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#DC2626" />
          <Text style={styles.errorText}>Error loading student data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.studentName}>
                {student.firstName} {student.surname}
              </Text>
              <Text style={styles.matricNumber}>{student.matricNumber}</Text>
            </View>
            {student.profilePictureUrl ? (
              <Image
                source={{ uri: student.profilePictureUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <MaterialIcons name="person" size={40} color="#fff" />
              </View>
            )}
          </View>
        </View>

        {/* Student Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <MaterialIcons name="school" size={24} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{student.department}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="class" size={24} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{student.level}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="book" size={24} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {student.course}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="email" size={24} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {student.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="assignment" size={24} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Course Registration</Text>
              <Text style={styles.actionDescription}>Register for courses</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="check-circle" size={24} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Courses</Text>
              <Text style={styles.actionDescription}>
                View registered courses
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="event-available" size={24} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Attendance</Text>
              <Text style={styles.actionDescription}>
                View attendance records
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              /* Navigate to profile */
            }}
          >
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Profile</Text>
              <Text style={styles.actionDescription}>
                View and edit profile
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 32,
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
  header: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 14,
    color: "#E9D5FF",
    marginBottom: 4,
  },
  studentName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  matricNumber: {
    fontSize: 14,
    color: "#E9D5FF",
    fontWeight: "500",
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profilePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: -16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
    marginLeft: 8,
  },
});
