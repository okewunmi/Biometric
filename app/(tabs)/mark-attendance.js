import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getCoursesWithRegisteredStudents,
  createAttendanceSession,
  closeAttendanceSession,
  getSessionAttendanceReport,
  getStudentsForCourse,
  databases,
  config,
  ID,
  Query,
} from '@/lib/appwrite';
import fingerprintScanner from '@/lib/fingerprint-digitalpersona';
import { verifyStudentFingerprint } from '@/lib/appwrite';

export default function AdminAttendanceInterface() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessionType, setSessionType] = useState('signin');
  const [activeSession, setActiveSession] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registeredStudents, setRegisteredStudents] = useState([]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadRegisteredStudents();
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      console.log('Loading courses for attendance...');
      const result = await getCoursesWithRegisteredStudents();
      
      if (result.success) {
        console.log('Courses loaded:', result.data.length);
        setCourses(result.data);
        
        if (result.data.length === 0) {
          setLastResult({
            success: false,
            error: 'No courses with approved registrations found.'
          });
        }
      } else {
        setLastResult({
          success: false,
          error: result.error || 'Failed to load courses'
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setLastResult({
        success: false,
        error: 'Failed to load courses. Please try refreshing.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRegisteredStudents = async () => {
    if (!selectedCourse) return;
    
    try {
      console.log('Loading registered students for:', selectedCourse.courseCode);
      const result = await getStudentsForCourse(selectedCourse.courseCode);
      
      if (result.success) {
        console.log('Registered students loaded:', result.data.length);
        setRegisteredStudents(result.data);
      } else {
        console.error('Failed to load students:', result.error);
        setRegisteredStudents([]);
      }
    } catch (error) {
      console.error('Error loading registered students:', error);
      setRegisteredStudents([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    if (selectedCourse) {
      await loadRegisteredStudents();
    }
    setRefreshing(false);
  };

  const handleStartSession = async () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course first');
      return;
    }

    try {
      const result = await createAttendanceSession(
        selectedCourse.courseCode,
        selectedCourse.courseTitle,
        sessionType
      );

      if (result.success) {
        setActiveSession(result.data);
        setAttendanceLog([]);
        await loadRegisteredStudents();
        
        Alert.alert(
          'Success',
          `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started for ${selectedCourse.courseCode}`
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleScanFingerprint = async () => {
    if (!activeSession) {
      Alert.alert('Error', 'Please start a session first');
      return;
    }

    if (registeredStudents.length === 0) {
      Alert.alert('Error', 'No registered students found for this course');
      return;
    }

    setIsScanning(true);
    setLastResult(null);

    try {
      const scanPrompt = sessionType === 'signin' 
        ? 'Place your finger on the scanner for SIGN IN...'
        : 'Place your finger on the scanner for SIGN OUT...';
      
      Alert.alert('Scan Fingerprint', scanPrompt);

      console.log('🔧 Initializing scanner...');
      const initResult = await fingerprintScanner.initialize();
      
      if (!initResult.success) {
        throw new Error('Scanner not available. Please ensure biometric is enabled.');
      }

      console.log('👆 Waiting for fingerprint...');

      const verifyResult = await verifyStudentFingerprint();

      if (!verifyResult.success || !verifyResult.matched) {
        setLastResult({
          success: false,
          error: verifyResult.message || 'No matching student found'
        });
        return;
      }

      const student = verifyResult.student;

      const isRegistered = registeredStudents.find(
        s => s.matricNumber === student.matricNumber
      );

      if (!isRegistered) {
        setLastResult({
          success: false,
          error: `${student.firstName} ${student.surname} is not registered for ${activeSession.courseCode}`
        });
        return;
      }

      const markResult = await markAttendanceInSession(
        activeSession.$id,
        student,
        sessionType,
        verifyResult.fingerUsed
      );

      if (markResult.success) {
        setLastResult({
          success: true,
          student: student,
          action: sessionType,
          fingerUsed: verifyResult.fingerUsed,
          message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
        });

        setAttendanceLog(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          student: student,
          action: sessionType,
          fingerUsed: verifyResult.fingerUsed,
        }, ...prev]);

        setActiveSession(prev => ({
          ...prev,
          totalStudentsMarked: prev.totalStudentsMarked + 1
        }));

        setTimeout(() => setLastResult(null), 3000);

      } else {
        setLastResult({
          success: false,
          error: markResult.error
        });
      }

    } catch (error) {
      console.error('❌ Fingerprint scan error:', error);
      setLastResult({
        success: false,
        error: error.message || 'Failed to scan fingerprint'
      });
    } finally {
      setIsScanning(false);
      await fingerprintScanner.stop();
    }
  };

  const markAttendanceInSession = async (sessionId, student, type, fingerUsed) => {
    try {
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];

      const existingRecords = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('sessionId', sessionId),
          Query.equal('matricNumber', student.matricNumber),
          Query.equal('attendanceDate', date)
        ]
      );

      if (existingRecords.documents.length > 0) {
        const record = existingRecords.documents[0];
        
        if (type === 'signin' && record.signInTime) {
          return {
            success: false,
            error: 'Student already signed in'
          };
        }

        if (type === 'signout' && record.signOutTime) {
          return {
            success: false,
            error: 'Student already signed out'
          };
        }

        await databases.updateDocument(
          config.databaseId,
          config.attendanceCollectionId,
          record.$id,
          type === 'signin' 
            ? { signInTime: timestamp, signInFingerUsed: fingerUsed }
            : { signOutTime: timestamp, signOutFingerUsed: fingerUsed }
        );

      } else {
        await databases.createDocument(
          config.databaseId,
          config.attendanceCollectionId,
          ID.unique(),
          {
            sessionId: sessionId,
            studentId: student.$id,
            matricNumber: student.matricNumber,
            courseCode: activeSession.courseCode,
            courseTitle: activeSession.courseTitle,
            attendanceDate: date,
            signInTime: type === 'signin' ? timestamp : null,
            signOutTime: type === 'signout' ? timestamp : null,
            signInFingerUsed: type === 'signin' ? fingerUsed : '',
            signOutFingerUsed: type === 'signout' ? fingerUsed : '',
            attended: true,
            isActive: true,
            semester: activeSession.semester,
            academicYear: activeSession.academicYear
          }
        );
      }

      return { success: true };

    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      'Close Session',
      'Are you sure you want to close this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          onPress: async () => {
            try {
              const result = await closeAttendanceSession(activeSession.$id);
              
              if (result.success) {
                const reportResult = await getSessionAttendanceReport(activeSession.$id);
                if (reportResult.success) {
                  setSessionReport(reportResult);
                }
                
                setActiveSession(null);
                setRegisteredStudents([]);
                Alert.alert('Success', 'Session closed successfully');
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setSelectedCourse(null);
    setSessionType('signin');
    setAttendanceLog([]);
    setLastResult(null);
    setSessionReport(null);
    setRegisteredStudents([]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <MaterialIcons name="how-to-reg" size={40} color="#6366F1" />
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSubtitle}>
              Invigilator attendance marking system
              {activeSession && registeredStudents.length > 0 && (
                <Text style={styles.headerHighlight}>
                  {'\n'}• {registeredStudents.length} registered students
                </Text>
              )}
            </Text>
          </View>
        </View>

        {sessionReport ? (
          // Session Report View
          <View style={styles.reportContainer}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Session Report</Text>
              <TouchableOpacity style={styles.newSessionButton} onPress={handleNewSession}>
                <Text style={styles.newSessionButtonText}>New Session</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardBlue]}>
                <Text style={styles.statValue}>{sessionReport.stats.totalStudents}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <Text style={styles.statValue}>{sessionReport.stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={[styles.statCard, styles.statCardRed]}>
                <Text style={styles.statValue}>{sessionReport.stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={[styles.statCard, styles.statCardPurple]}>
                <Text style={styles.statValue}>{sessionReport.stats.attendanceRate}%</Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>

            <View style={styles.reportList}>
              {sessionReport.report.map((item, idx) => (
                <View key={idx} style={[
                  styles.reportItem,
                  item.attended ? styles.reportItemPresent : styles.reportItemAbsent
                ]}>
                  <View style={styles.reportItemHeader}>
                    <Text style={styles.reportItemMatric}>{item.student.matricNumber}</Text>
                    <View style={[
                      styles.statusBadge,
                      item.attended ? styles.statusBadgePresent : styles.statusBadgeAbsent
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        item.attended ? styles.statusBadgeTextPresent : styles.statusBadgeTextAbsent
                      ]}>
                        {item.attended ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reportItemName}>
                    {item.student.firstName} {item.student.surname}
                  </Text>
                  {item.signInTime && (
                    <Text style={styles.reportItemTime}>
                      In: {new Date(item.signInTime).toLocaleTimeString()}
                    </Text>
                  )}
                  {item.signOutTime && (
                    <Text style={styles.reportItemTime}>
                      Out: {new Date(item.signOutTime).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : lastResult && !lastResult.success && courses.length === 0 ? (
          // No Courses Available
          <View style={styles.noCourses}>
            <MaterialIcons name="warning" size={80} color="#F59E0B" />
            <Text style={styles.noCoursesTitle}>No Courses Available</Text>
            <Text style={styles.noCoursesText}>
              {lastResult.error || 'No courses with approved student registrations found.'}
            </Text>
            <View style={styles.noCoursesInfo}>
              <Text style={styles.noCoursesInfoTitle}>Next Steps:</Text>
              <Text style={styles.noCoursesInfoText}>
                1. Ensure students have registered{'\n'}
                2. Approve course registrations{'\n'}
                3. Refresh this page
              </Text>
            </View>
          </View>
        ) : (
          // Main Content
          <View style={styles.mainContent}>
            {!activeSession ? (
              // Session Setup
              <View style={styles.setupCard}>
                <Text style={styles.setupTitle}>Session Setup</Text>

                <Text style={styles.setupLabel}>Select Course *</Text>
                {courses.length === 0 ? (
                  <View style={styles.noCoursesSmall}>
                    <MaterialIcons name="warning" size={40} color="#F59E0B" />
                    <Text style={styles.noCoursesSmallText}>No courses available</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.coursesList} nestedScrollEnabled>
                    {courses.map((course) => (
                      <TouchableOpacity
                        key={course.courseCode}
                        style={[
                          styles.courseItem,
                          selectedCourse?.courseCode === course.courseCode && styles.courseItemSelected
                        ]}
                        onPress={() => setSelectedCourse(course)}
                      >
                        <View style={styles.courseItemContent}>
                          <Text style={styles.courseCode}>{course.courseCode}</Text>
                          <Text style={styles.courseTitle} numberOfLines={2}>
                            {course.courseTitle}
                          </Text>
                          <View style={styles.courseBadges}>
                            <View style={styles.badgeBlue}>
                              <Text style={styles.badgeText}>{course.courseUnit} Units</Text>
                            </View>
                            <View style={styles.badgeGreen}>
                              <Text style={styles.badgeText}>
                                {course.studentCount} Student{course.studentCount !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {selectedCourse?.courseCode === course.courseCode && (
                          <MaterialIcons name="check-circle" size={24} color="#6366F1" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={[styles.setupLabel, { marginTop: 24 }]}>Session Type *</Text>
                <View style={styles.sessionTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.sessionTypeButton,
                      sessionType === 'signin' && styles.sessionTypeButtonSignin
                    ]}
                    onPress={() => setSessionType('signin')}
                  >
                    <MaterialIcons
                      name="login"
                      size={32}
                      color={sessionType === 'signin' ? '#10B981' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.sessionTypeText,
                      sessionType === 'signin' && styles.sessionTypeTextSignin
                    ]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sessionTypeButton,
                      sessionType === 'signout' && styles.sessionTypeButtonSignout
                    ]}
                    onPress={() => setSessionType('signout')}
                  >
                    <MaterialIcons
                      name="logout"
                      size={32}
                      color={sessionType === 'signout' ? '#F97316' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.sessionTypeText,
                      sessionType === 'signout' && styles.sessionTypeTextSignout
                    ]}>
                      Sign Out
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.startButton, !selectedCourse && styles.startButtonDisabled]}
                  onPress={handleStartSession}
                  disabled={!selectedCourse}
                >
                  <LinearGradient
                    colors={['#6366F1', '#9333EA']}
                    style={styles.startButtonGradient}
                  >
                    <Text style={styles.startButtonText}>Start Attendance Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              // Active Session
              <View style={styles.activeSessionCard}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionInfoTitle}>Active Session</Text>
                  <View style={styles.sessionInfoItem}>
                    <Text style={styles.sessionInfoLabel}>Course:</Text>
                    <Text style={styles.sessionInfoValue}>{activeSession.courseCode}</Text>
                  </View>
                  <View style={styles.sessionInfoItem}>
                    <Text style={styles.sessionInfoLabel}>Type:</Text>
                    <Text style={[
                      styles.sessionInfoValue,
                      sessionType === 'signin' ? styles.sessionTypeSignin : styles.sessionTypeSignout
                    ]}>
                      {sessionType === 'signin' ? 'Sign In' : 'Sign Out'}
                    </Text>
                  </View>
                  <View style={styles.sessionInfoItem}>
                    <Text style={styles.sessionInfoLabel}>Marked:</Text>
                    <Text style={styles.sessionInfoMarked}>{activeSession.totalStudentsMarked}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                  onPress={handleScanFingerprint}
                  disabled={isScanning}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.scanButtonGradient}
                  >
                    {isScanning ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.scanButtonText}>Scanning...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="fingerprint" size={24} color="white" />
                        <Text style={styles.scanButtonText}>Scan Student Fingerprint</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {lastResult && (
                  <View style={[
                    styles.resultBox,
                    lastResult.success ? styles.resultBoxSuccess : styles.resultBoxError
                  ]}>
                    <MaterialIcons
                      name={lastResult.success ? 'check-circle' : 'error'}
                      size={24}
                      color={lastResult.success ? '#10B981' : '#EF4444'}
                    />
                    <View style={styles.resultContent}>
                      <Text style={[
                        styles.resultTitle,
                        lastResult.success ? styles.resultTitleSuccess : styles.resultTitleError
                      ]}>
                        {lastResult.success ? 'Success!' : 'Failed'}
                      </Text>
                      <Text style={[
                        styles.resultMessage,
                        lastResult.success ? styles.resultMessageSuccess : styles.resultMessageError
                      ]}>
                        {lastResult.message || lastResult.error}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={handleCloseSession}>
                  <Text style={styles.closeButtonText}>Close Session & View Report</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Attendance Log */}
            {activeSession && (
              <View style={styles.logCard}>
                <Text style={styles.logTitle}>Attendance Log</Text>
                {attendanceLog.length === 0 ? (
                  <View style={styles.emptyLog}>
                    <MaterialIcons name="assignment" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyLogText}>No attendance marked yet</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.logList} nestedScrollEnabled>
                    {attendanceLog.map((log, idx) => (
                      <View key={idx} style={styles.logItem}>
                        <View style={styles.logItemContent}>
                          <Text style={styles.logItemName}>
                            {log.student.firstName} {log.student.surname}
                          </Text>
                          <Text style={styles.logItemMatric}>{log.student.matricNumber}</Text>
                          <Text style={styles.logItemAction}>
                            {log.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'} • {log.fingerUsed}
                          </Text>
                        </View>
                        <Text style={styles.logItemTime}>{log.timestamp}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
  headerHighlight: {
    color: '#6366F1',
    fontWeight: '600',
  },
  
  // Report Styles
  reportContainer: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  newSessionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newSessionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardBlue: {
    backgroundColor: '#EEF2FF',
  },
  statCardGreen: {
    backgroundColor: '#DCFCE7',
  },
  statCardRed: {
    backgroundColor: '#FEE2E2',
  },
  statCardPurple: {
    backgroundColor: '#F3E8FF',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  reportList: {
    maxHeight: 400,
  },
  reportItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  reportItemPresent: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reportItemAbsent: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportItemMatric: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePresent: {
    backgroundColor: '#BBF7D0',
  },
  statusBadgeAbsent: {
    backgroundColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTextPresent: {
    color: '#166534',
  },
  statusBadgeTextAbsent: {
    color: '#991B1B',
  },
  reportItemName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  reportItemTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  
  // No Courses Styles
  noCourses: {
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
  noCoursesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  noCoursesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  noCoursesInfo: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    width: '100%',
  },
  noCoursesInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  noCoursesInfoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  
  // Main Content Styles
  mainContent: {
    padding: 16,
  },
  setupCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  setupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  noCoursesSmall: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  noCoursesSmallText: {
    marginTop: 8,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  coursesList: {
    maxHeight: 250,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
  },
  courseItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  courseItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  courseItemContent: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  courseTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  courseBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badgeBlue: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1F2937',
  },
  
  // Session Type Styles
  sessionTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  sessionTypeButtonSignin: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  sessionTypeButtonSignout: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  sessionTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sessionTypeTextSignin: {
    color: '#10B981',
  },
  sessionTypeTextSignout: {
    color: '#F97316',
  },
  
  // Start Button Styles
  startButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Active Session Styles
  activeSessionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfo: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sessionInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#312E81',
    marginBottom: 16,
  },
  sessionInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  sessionInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  sessionTypeSignin: {
    color: '#10B981',
  },
  sessionTypeSignout: {
    color: '#F97316',
  },
  sessionInfoMarked: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  
  // Scan Button Styles
  scanButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonGradient: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Result Box Styles
  resultBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  resultBoxSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  resultBoxError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultTitleSuccess: {
    color: '#166534',
  },
  resultTitleError: {
    color: '#991B1B',
  },
  resultMessage: {
    fontSize: 13,
    marginTop: 4,
  },
  resultMessageSuccess: {
    color: '#15803D',
  },
  resultMessageError: {
    color: '#B91C1C',
  },
  
  // Close Button Styles
  closeButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Log Card Styles
  logCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  emptyLog: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyLogText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  logList: {
    maxHeight: 400,
  },
  logItem: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  logItemContent: {
    marginBottom: 4,
  },
  logItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  logItemMatric: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logItemAction: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  logItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
});