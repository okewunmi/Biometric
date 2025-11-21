import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getSessionAttendanceReport } from '@/lib/appwrite';

export default function AttendanceReports() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [courseCode, setCourseCode] = useState('');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (courseCode.trim() && report) {
      await handleGenerateReport();
    }
    setRefreshing(false);
  };

  const handleGenerateReport = async () => {
    if (!courseCode.trim()) {
      Alert.alert('Error', 'Please enter a course code');
      return;
    }

    setIsLoading(true);

    try {
      const result = await getSessionAttendanceReport(
        courseCode.toUpperCase(),
        selectedDate
      );

      if (result.success) {
        setReport(result);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusStyle = (record) => {
    if (record.signOutTime) {
      return {
        container: styles.statusCompleted,
        text: styles.statusTextCompleted,
        label: 'Completed',
      };
    } else if (record.signInTime) {
      return {
        container: styles.statusSignedIn,
        text: styles.statusTextSignedIn,
        label: 'Signed In',
      };
    } else {
      return {
        container: styles.statusAbsent,
        text: styles.statusTextAbsent,
        label: 'Absent',
      };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <MaterialIcons name="assessment" size={40} color="#6366F1" />
            <Text style={styles.headerTitle}>Attendance Reports</Text>
            <Text style={styles.headerSubtitle}>
              View and analyze attendance data
            </Text>
          </View>
        </View>

        {/* Generate Report Card */}
        <View style={styles.generateCard}>
          <Text style={styles.generateTitle}>Generate Report</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Course Code</Text>
            <TextInput
              style={styles.textInput}
              value={courseCode}
              onChangeText={(text) => setCourseCode(text.toUpperCase())}
              placeholder="e.g., CSC301"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity style={styles.dateInput}>
              <Text style={styles.dateInputText}>
                {formatDate(selectedDate)}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.dateHelperText}>
              Note: Date picker requires additional setup in mobile
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              isLoading && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Report</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Report Content */}
        {report ? (
          <View style={styles.reportContainer}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardIndigo]}>
                <Text style={styles.statLabel}>Total Students</Text>
                <Text style={styles.statValue}>
                  {report.stats.totalStudents}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardGreen]}>
                <Text style={styles.statLabel}>Present</Text>
                <Text style={styles.statValue}>{report.stats.signedIn}</Text>
              </View>

              <View style={[styles.statCard, styles.statCardBlue]}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{report.stats.signedOut}</Text>
              </View>

              <View style={[styles.statCard, styles.statCardPurple]}>
                <Text style={styles.statLabel}>Attendance Rate</Text>
                <Text style={styles.statValue}>
                  {report.stats.attendanceRate}%
                </Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>Attendance Details</Text>
                <Text style={styles.detailsSubtitle}>
                  {courseCode} • {formatDate(selectedDate)}
                </Text>
              </View>

              {/* Attendance List */}
              <ScrollView style={styles.attendanceList} nestedScrollEnabled>
                {report.data.map((record) => {
                  const status = getStatusStyle(record);
                  return (
                    <View key={record.$id} style={styles.attendanceItem}>
                      <View style={styles.attendanceItemHeader}>
                        <View style={styles.attendanceItemInfo}>
                          <Text style={styles.attendanceMatric}>
                            {record.matricNumber}
                          </Text>
                          <Text style={styles.attendanceName}>Student</Text>
                        </View>
                        <View style={status.container}>
                          <Text style={status.text}>{status.label}</Text>
                        </View>
                      </View>

                      <View style={styles.attendanceItemDetails}>
                        <View style={styles.attendanceDetailRow}>
                          <MaterialIcons
                            name="login"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.attendanceDetailLabel}>
                            Sign In:
                          </Text>
                          <Text style={styles.attendanceDetailValue}>
                            {record.signInTime
                              ? new Date(record.signInTime).toLocaleTimeString()
                              : '-'}
                          </Text>
                        </View>

                        <View style={styles.attendanceDetailRow}>
                          <MaterialIcons
                            name="logout"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.attendanceDetailLabel}>
                            Sign Out:
                          </Text>
                          <Text style={styles.attendanceDetailValue}>
                            {record.signOutTime
                              ? new Date(
                                  record.signOutTime
                                ).toLocaleTimeString()
                              : '-'}
                          </Text>
                        </View>

                        <View style={styles.attendanceDetailRow}>
                          <MaterialIcons
                            name="schedule"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.attendanceDetailLabel}>
                            Duration:
                          </Text>
                          <Text style={styles.attendanceDetailValue}>
                            {formatDuration(record.totalDuration)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : (
          // Empty State
          <View style={styles.emptyState}>
            <MaterialIcons name="assessment" size={120} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              Enter course code and date to generate report
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },

  // Generate Report Card
  generateCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  dateInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dateHelperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Report Container
  reportContainer: {
    padding: 16,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardIndigo: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  statCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: '#A855F7',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },

  // Details Card
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  detailsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // Attendance List
  attendanceList: {
    maxHeight: 600,
    padding: 16,
  },
  attendanceItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attendanceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendanceItemInfo: {
    flex: 1,
  },
  attendanceMatric: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  attendanceName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  attendanceItemDetails: {
    gap: 8,
  },
  attendanceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendanceDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  attendanceDetailValue: {
    fontSize: 13,
    color: '#374151',
  },

  // Status Badges
  statusCompleted: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextCompleted: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '600',
  },
  statusSignedIn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextSignedIn: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
  },
  statusAbsent: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextAbsent: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    backgroundColor: 'white',
    margin: 16,
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
});