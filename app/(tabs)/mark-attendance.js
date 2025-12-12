import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Modal
} from 'react-native';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { 
  getCoursesWithRegisteredStudents,
  createAttendanceSession,
  closeAttendanceSession,
  getSessionAttendanceReport,
  getStudentsForCourse,
  getStudentsWithFingerprintsPNG,
  databases,
  config
} from '@/lib/appwrite';
import { Query, ID } from 'react-native-appwrite';

const { FingerprintModule } = NativeModules;
const fingerprintEmitter = FingerprintModule ? new NativeEventEmitter(FingerprintModule) : null;

const API_BASE_URL = 'https://ftpv.appwrite.network/';

export default function AdminAttendanceInterface({ navigation }) {
  // Core state
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessionType, setSessionType] = useState('signin');
  const [activeSession, setActiveSession] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  
  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // UI state
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scannerAvailable, setScannerAvailable] = useState(false);

  // Initialize fingerprint scanner
  useEffect(() => {
    checkFingerprintScanner();
    loadCourses();

    // Setup fingerprint event listeners
    if (fingerprintEmitter) {
      const listeners = [
        fingerprintEmitter.addListener('onScanStarted', () => {
          setStatus({ message: 'Place finger on scanner...', type: 'info' });
        }),
        
        fingerprintEmitter.addListener('onScanComplete', async (data) => {
          setStatus({ message: 'Verifying with server...', type: 'info' });
          await verifyFingerprintWithServer(data.imageData);
        }),
        
        fingerprintEmitter.addListener('onScanError', (error) => {
          setStatus({ message: `Error: ${error.error}`, type: 'error' });
          setIsVerifying(false);
          Alert.alert('Scan Error', error.error);
        })
      ];

      return () => {
        listeners.forEach(listener => listener.remove());
        if (FingerprintModule?.close) {
          FingerprintModule.close();
        }
      };
    }
  }, []);

  // Load students when course is selected
  useEffect(() => {
    if (selectedCourse) {
      loadRegisteredStudents();
    }
  }, [selectedCourse]);

  const checkFingerprintScanner = async () => {
    try {
      if (!FingerprintModule) {
        console.log('⚠️ Fingerprint module not available');
        return;
      }

      const availability = await FingerprintModule.isAvailable();
      setScannerAvailable(availability.available);

      if (availability.available) {
        const initResult = await FingerprintModule.initialize();
        if (initResult.success) {
          setStatus({ message: 'Fingerprint scanner ready', type: 'success' });
        }
      } else {
        setStatus({ message: 'Connect scanner via OTG', type: 'warning' });
      }
    } catch (error) {
      console.error('Scanner check error:', error);
      setStatus({ message: 'Scanner unavailable', type: 'warning' });
    }
  };

  const loadCourses = async () => {
    try {
      console.log('Loading courses for attendance...');
      const result = await getCoursesWithRegisteredStudents();
      
      if (result.success) {
        console.log('Courses loaded:', result.data.length);
        setCourses(result.data);
        
        if (result.data.length === 0) {
          setStatus({
            message: 'No courses with approved registrations found',
            type: 'warning'
          });
        }
      } else {
        setStatus({
          message: result.error || 'Failed to load courses',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setStatus({
        message: 'Failed to load courses',
        type: 'error'
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

  const handleStartSession = async () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course first');
      return;
    }

    if (sessionType === 'signout') {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const todayAttendance = await databases.listDocuments(
          config.databaseId,
          config.attendanceCollectionId,
          [
            Query.equal('courseCode', selectedCourse.courseCode),
            Query.equal('attendanceDate', today),
            Query.limit(20)
          ]
        );
        
        const pendingSignOuts = todayAttendance.documents.filter(record => {
          const hasSignedIn = record.signInTime && record.signInStatus === 'Present';
          const notSignedOut = !record.signOutTime;
          return hasSignedIn && notSignedOut;
        });
        
        if (pendingSignOuts.length === 0) {
          Alert.alert(
            'No Signed-In Students',
            'No signed-in students found for today. Do you want to proceed with sign-out session anyway?',
            [
              { text: 'Cancel', onPress: () => setSessionType('signin'), style: 'cancel' },
              { text: 'Proceed', onPress: () => startSession() }
            ]
          );
          return;
        } else {
          setStatus({
            message: `Found ${pendingSignOuts.length} student(s) pending sign-out`,
            type: 'info'
          });
        }
      } catch (error) {
        console.error('Error checking attendance records:', error);
        Alert.alert(
          'Error',
          'Error checking existing records. Do you want to proceed with sign-out session anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Proceed', onPress: () => startSession() }
          ]
        );
        return;
      }
    }

    await startSession();
  };

  const startSession = async () => {
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
        
        setStatus({
          message: `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started for ${selectedCourse.courseCode}`,
          type: 'success'
        });
      } else {
        setStatus({
          message: result.error || 'Failed to start session',
          type: 'error'
        });
      }
    } catch (error) {
      setStatus({
        message: error.message || 'Failed to start session',
        type: 'error'
      });
    }
  };

  const handleScanFingerprint = async () => {
    if (!activeSession) {
      Alert.alert('Error', 'Please start a session first');
      return;
    }

    if (!FingerprintModule || !scannerAvailable) {
      Alert.alert(
        'Scanner Not Available',
        'Please connect the DigitalPersona scanner via OTG cable.'
      );
      return;
    }

    if (registeredStudents.length === 0) {
      Alert.alert('Error', 'No registered students found for this course');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 0 });
    setStatus({ 
      message: `Place finger on scanner for ${sessionType === 'signin' ? 'SIGN IN' : 'SIGN OUT'}...`, 
      type: 'info' 
    });

    try {
      // Step 1: Capture fingerprint
      console.log('🔍 Starting NBIS verification process...');
      const captureResult = await FingerprintModule.capturePrint({});

      if (!captureResult.success) {
        throw new Error(captureResult.message || 'Scan failed');
      }

      console.log('✅ Fingerprint captured, quality:', captureResult.quality + '%');
      
      if (captureResult.quality && captureResult.quality < 50) {
        setStatus({ 
          message: `Quality too low (${captureResult.quality}%). Please try again with a cleaner finger.`, 
          type: 'warning' 
        });
        setIsVerifying(false);
        return;
      }

      setStatus({ message: 'Fingerprint captured! Verifying...', type: 'info' });
      await verifyFingerprintWithServer(captureResult.imageData);

    } catch (error) {
      console.error('❌ Verification error:', error);
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setVerificationResult({
        matched: false,
        message: 'Error: ' + error.message
      });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
      if (FingerprintModule?.close) {
        await FingerprintModule.close();
      }
    }
  };

  const verifyFingerprintWithServer = async (imageData) => {
    try {
      setStatus({ message: 'Loading database...', type: 'info' });

      // Get all stored fingerprints
      const fingerprintsResult = await getStudentsWithFingerprintsPNG();

      if (!fingerprintsResult.success) {
        throw new Error('Failed to fetch stored fingerprints: ' + fingerprintsResult.error);
      }

      if (fingerprintsResult.data.length === 0) {
        setVerificationResult({
          matched: false,
          message: 'No registered fingerprints found in database'
        });
        setStatus({ message: 'No registered fingerprints', type: 'warning' });
        setIsVerifying(false);
        return;
      }

      const totalFingerprints = fingerprintsResult.data.length;
      console.log(`📊 Database size: ${totalFingerprints} fingerprints`);
      
      setProgress({ current: 0, total: totalFingerprints });
      setStatus({ 
        message: `Comparing against ${totalFingerprints} fingerprints using NBIS...`, 
        type: 'info' 
      });

      // Use optimized batch comparison via NBIS
      const response = await fetch(`${API_BASE_URL}/api/fingerprint/verify-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: imageData,
          database: fingerprintsResult.data.map(fp => ({
            id: fp.fileId,
            studentId: fp.student.$id,
            matricNumber: fp.student.matricNumber,
            studentName: `${fp.student.firstName} ${fp.student.surname}`,
            fingerName: fp.fingerName,
            imageData: fp.imageData,
            student: fp.student
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result = await response.json();

      // Handle result
      if (result.success && result.matched && result.bestMatch) {
        const student = result.bestMatch.student;

        // Check if student is registered for this course
        const isRegistered = registeredStudents.find(
          s => s.matricNumber === student.matricNumber
        );

        if (!isRegistered) {
          setVerificationResult({
            matched: false,
            message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`
          });
          setStatus({ message: 'Student not registered for this course', type: 'error' });
          setIsVerifying(false);
          return;
        }

        console.log('\n✅ === MATCH FOUND (NBIS) ===');
        console.log('Student:', result.bestMatch.studentName);
        console.log('NBIS Score:', result.bestMatch.score);
        console.log('============================\n');

        // Mark attendance in database
        const markResult = await markAttendanceInSession(
          activeSession.$id,
          student,
          sessionType,
          result.bestMatch.fingerName,
          selectedCourse.courseId 
        );

        if (markResult.success) {
          setVerificationResult({
            matched: true,
            student: student,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score,
            fingerName: result.bestMatch.fingerName,
            action: sessionType,
            message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
          });
          setStatus({ message: 'Attendance marked successfully!', type: 'success' });

          // Add to log
          setAttendanceLog(prev => [{
            timestamp: new Date().toLocaleTimeString(),
            student: student,
            action: sessionType,
            fingerUsed: result.bestMatch.fingerName,
            confidence: result.bestMatch.confidence,
            score: result.bestMatch.score
          }, ...prev]);

          // Update session count
          setActiveSession(prev => ({
            ...prev,
            totalStudentsMarked: prev.totalStudentsMarked + 1
          }));

          // Auto-clear after 3 seconds
          setTimeout(() => {
            setVerificationResult(null);
            setStatus({ message: 'Ready for next student', type: 'info' });
          }, 3000);

        } else {
          setVerificationResult({
            matched: false,
            message: markResult.error || 'Failed to mark attendance'
          });
          setStatus({ message: markResult.error || 'Failed to mark attendance', type: 'error' });
        }

      } else {
        console.log('\n❌ === NO MATCH FOUND (NBIS) ===');
        console.log('Best score:', result.bestMatch?.score || 0);
        console.log('================================\n');

        setVerificationResult({
          matched: false,
          message: `No match found. Best score: ${result.bestMatch?.score || 0}`,
          totalCompared: result.totalCompared
        });
        setStatus({ message: 'No match found', type: 'error' });
      }

    } catch (error) {
      console.error('❌ Verification error:', error);
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setVerificationResult({
        matched: false,
        message: 'Error: ' + error.message
      });
    }
  };

  const markAttendanceInSession = async (sessionId, student, type, fingerUsed, courseId) => {
    try {
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];

      const sanitizedCourseId = String(courseId || '').trim().substring(0, 150);
      
      if (!sanitizedCourseId) {
        return {
          success: false,
          error: 'Course ID is required'
        };
      }

      // Check for attendance record by date and course
      const existingRecords = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('matricNumber', student.matricNumber),
          Query.equal('courseCode', activeSession.courseCode),
          Query.equal('attendanceDate', date),
          Query.limit(1)
        ]
      );

      if (existingRecords.documents.length > 0) {
        // Record exists
        const record = existingRecords.documents[0];
        
        if (type === 'signin') {
          // PREVENT MULTIPLE SIGN-INS
          if (record.signInTime && record.signInStatus === 'Present') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}. Cannot sign in twice.`
            };
          }
          
          // Update sign-in time
          await databases.updateDocument(
            config.databaseId,
            config.attendanceCollectionId,
            record.$id,
            {
              signInTime: timestamp,
              signInFingerUsed: fingerUsed,
              signInStatus: 'Present',
              sessionId: sessionId
            }
          );
          
          return {
            success: true,
            message: `${student.firstName} ${student.surname} signed in successfully`
          };
          
        } else if (type === 'signout') {
          // PREVENT SIGN-OUT WITHOUT SIGN-IN
          if (!record.signInTime || record.signInStatus !== 'Present') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first before signing out.`
            };
          }
          
          // PREVENT MULTIPLE SIGN-OUTS
          if (record.signOutTime && record.signOutStatus === 'Completed') {
            return {
              success: false,
              error: `${student.firstName} ${student.surname} already signed out at ${new Date(record.signOutTime).toLocaleTimeString()}. Cannot sign out twice.`
            };
          }
          
          // Calculate duration
          const signInTime = new Date(record.signInTime);
          const signOutTime = new Date(timestamp);
          const durationMinutes = Math.floor((signOutTime - signInTime) / (1000 * 60));
          
          // Update sign-out time
          await databases.updateDocument(
            config.databaseId,
            config.attendanceCollectionId,
            record.$id,
            {
              signOutTime: timestamp,
              signOutFingerUsed: fingerUsed,
              signOutStatus: 'Completed',
              totalDuration: durationMinutes
            }
          );
          
          return {
            success: true,
            message: `${student.firstName} ${student.surname} signed out successfully (${formatDuration(durationMinutes)})`
          };
        }
        
      } else {
        // No record exists - only allow creating for sign-in
        if (type === 'signin') {
          await databases.createDocument(
            config.databaseId,
            config.attendanceCollectionId,
            ID.unique(),
            {
              sessionId: sessionId,
              studentId: student.$id,
              matricNumber: student.matricNumber,
              courseId: sanitizedCourseId,
              courseCode: activeSession.courseCode,
              courseTitle: activeSession.courseTitle,
              attendanceDate: date,
              signInTime: timestamp,
              signInFingerUsed: fingerUsed,
              signInStatus: 'Present',
              signOutTime: null,
              signOutFingerUsed: '',
              signOutStatus: null,
              totalDuration: 0,
              isActive: true,
              semester: activeSession.semester,
              academicYear: activeSession.academicYear
            }
          );
          
          return {
            success: true,
            message: `${student.firstName} ${student.surname} signed in successfully`
          };
          
        } else if (type === 'signout') {
          return {
            success: false,
            error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first.`
          };
        }
      }

      return { success: false, error: 'Unknown error occurred' };

    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h ${mins}m`;
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
          style: 'destructive',
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
                setVerificationResult(null);
                setStatus({
                  message: 'Session closed successfully',
                  type: 'success'
                });
              }
            } catch (error) {
              setStatus({
                message: error.message || 'Failed to close session',
                type: 'error'
              });
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
    setVerificationResult(null);
    setSessionReport(null);
    setRegisteredStudents([]);
    setStatus({ message: 'Ready to start new session', type: 'info' });
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Session Report View
  if (sessionReport) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Session Report</Text>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.statLabel}>Total Students</Text>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>
                {sessionReport.stats.totalStudents}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {sessionReport.stats.present}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.statLabel}>Absent</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {sessionReport.stats.absent}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.statLabel}>Rate</Text>
              <Text style={[styles.statValue, { color: '#A855F7' }]}>
                {sessionReport.stats.attendanceRate}%
              </Text>
            </View>
          </View>

          <FlatList
            data={sessionReport.report}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={[
                styles.reportItem,
                { backgroundColor: item.attended ? '#F0FDF4' : '#FEE2E2' }
              ]}>
                <View style={styles.reportItemContent}>
                  <Text style={styles.reportMatric}>{item.student.matricNumber}</Text>
                  <Text style={styles.reportName}>
                    {item.student.firstName} {item.student.surname}
                  </Text>
                  <View style={styles.reportTimes}>
                    <Text style={styles.reportTimeText}>
                      In: {item.signInTime ? new Date(item.signInTime).toLocaleTimeString() : '-'}
                    </Text>
                    <Text style={styles.reportTimeText}>
                      Out: {item.signOutTime ? new Date(item.signOutTime).toLocaleTimeString() : '-'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.attended ? '#10B981' : '#EF4444' }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {item.attended ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>
            )}
          />

          <TouchableOpacity style={styles.newSessionButton} onPress={handleNewSession}>
            <Text style={styles.newSessionButtonText}>Start New Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // No courses view
  if (courses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mark Attendance</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>No Courses Available</Text>
          <Text style={styles.emptyText}>
            No courses with approved student registrations found.
          </Text>
        </View>
      </View>
    );
  }

  // Main interface
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📋 Mark Attendance</Text>
        <Text style={styles.subtitle}>
          NBIS fingerprint verification system
          {activeSession && registeredStudents.length > 0 && (
            <Text style={styles.registeredCount}> • {registeredStudents.length} registered</Text>
          )}
        </Text>
      </View>

      {/* Status Display */}
      {status.message ? (
        <View style={[styles.statusCard, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {status.message}
          </Text>
          {isVerifying && <ActivityIndicator color={getStatusColor()} />}
        </View>
      ) : null}

      {/* Progress Bar */}
      {progress.total > 0 && isVerifying && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(progress.current / progress.total) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {progress.current} / {progress.total}
          </Text>
        </View>
      )}

      {!activeSession ? (
        /* Session Setup */
        <View style={styles.setupCard}>
          <Text style={styles.cardTitle}>Session Setup</Text>

          {sessionType === 'signout' && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>⚠️ Sign-out Session Notice</Text>
              <Text style={styles.noticeText}>
                Students must have signed in earlier today to sign out.
              </Text>
            </View>
          )}

          {/* Course Selection */}
          <Text style={styles.label}>Select Course *</Text>
          <FlatList
            data={courses}
            keyExtractor={(item) => item.courseCode}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.courseItem,
                  selectedCourse?.courseCode === item.courseCode && styles.courseItemSelected
                ]}
                onPress={() => setSelectedCourse(item)}
              >
                <View style={styles.courseContent}>
                  <Text style={styles.courseCode}>{item.courseCode}</Text>
                  <Text style={styles.courseTitle}>{item.courseTitle}</Text>
                  <View style={styles.courseBadges}>
                    <Text style={styles.courseBadge}>{item.courseUnit} Units</Text>
                    <Text style={[styles.courseBadge, { backgroundColor: '#DCFCE7' }]}>
                      {item.studentCount} Students
                    </Text>
                  </View>
                </View>
                {selectedCourse?.courseCode === item.courseCode && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />

          {/* Session Type */}
          <Text style={styles.label}>Session Type *</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                sessionType === 'signin' && styles.typeButtonActive
              ]}
              onPress={() => setSessionType('signin')}
            >
              <Text style={styles.typeEmoji}>🔐</Text>
              <Text style={[
                styles.typeLabel,
                sessionType === 'signin' && styles.typeLabelActive
              ]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                sessionType === 'signout' && styles.typeButtonActive
              ]}
              onPress={() => setSessionType('signout')}
            >
              <Text style={styles.typeEmoji}>🚪</Text>
              <Text style={[
                styles.typeLabel,
                sessionType === 'signout' && styles.typeLabelActive
              ]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              !selectedCourse && styles.startButtonDisabled
            ]}
            onPress={handleStartSession}
            disabled={!selectedCourse}
          >
            <Text style={styles.startButtonText}>Start Attendance Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Active Session */
        <View style={styles.setupCard}>
          <Text style={styles.cardTitle}>Active Session</Text>

          <View style={styles.sessionInfo}>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Course:</Text>
              <Text style={styles.sessionValue}>{activeSession.courseCode}</Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Type:</Text>
              <Text style={[
                styles.sessionValue,
                { color: sessionType === 'signin' ? '#10B981' : '#F59E0B' }
              ]}>
                {sessionType === 'signin' ? 'Sign In' : 'Sign Out'}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Students Marked:</Text>
              <Text style={[styles.sessionValue, { fontSize: 20, color: '#6366F1' }]}>
                {activeSession.totalStudentsMarked}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Started:</Text>
              <Text style={styles.sessionValue}>
                {new Date(activeSession.sessionStartTime).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Scanning Tips:</Text>
            <Text style={styles.instructionText}>• Ensure finger is clean and dry</Text>
            <Text style={styles.instructionText}>• Place finger firmly and centered</Text>
            <Text style={styles.instructionText}>• Do not move until scan completes</Text>
            <Text style={styles.instructionText}>• Quality should be above 50%</Text>
            <Text style={styles.nbisNote}>💡 Using NIST NBIS (BOZORTH3)</Text>
          </View>

          {/* Scan Button */}
          <TouchableOpacity
            style={[
              styles.scanButton,
              (isVerifying || !scannerAvailable) && styles.scanButtonDisabled
            ]}
            onPress={handleScanFingerprint}
            disabled={isVerifying || !scannerAvailable}
          >
            {isVerifying ? (
              <View style={styles.scanningContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.scanButtonText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.scanButtonText}>👆 Scan Student Fingerprint</Text>
            )}
          </TouchableOpacity>

          {/* Verification Result */}
          {verificationResult && (
            <View style={[
              styles.resultCard,
              { backgroundColor: verificationResult.matched ? '#F0FDF4' : '#FEE2E2' }
            ]}>
              <Text style={styles.resultEmoji}>
                {verificationResult.matched ? '✅' : '❌'}
              </Text>
              <Text style={[
                styles.resultTitle,
                { color: verificationResult.matched ? '#10B981' : '#EF4444' }
              ]}>
                {verificationResult.matched ? 'Success!' : 'Failed'}
              </Text>
              <Text style={styles.resultMessage}>{verificationResult.message}</Text>
              {verificationResult.matched && (
                <>
                  <Text style={styles.resultDetail}>
                    Confidence: {verificationResult.confidence}% • Score: {verificationResult.score}
                  </Text>
                  <Text style={styles.resultDetail}>
                    Finger: {verificationResult.fingerName}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Close Session Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseSession}>
            <Text style={styles.closeButtonText}>Close Session & View Report</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Attendance Log */}
      {activeSession && (
        <View style={styles.logCard}>
          <Text style={styles.cardTitle}>Attendance Log</Text>
          {attendanceLog.length === 0 ? (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogEmoji}>📋</Text>
              <Text style={styles.emptyLogText}>No attendance marked yet</Text>
            </View>
          ) : (
            <FlatList
              data={attendanceLog}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  {item.student.profilePictureUrl && (
                    <Image
                      source={{ uri: item.student.profilePictureUrl }}
                      style={styles.logImage}
                    />
                  )}
                  <View style={styles.logContent}>
                    <Text style={styles.logName}>
                      {item.student.firstName} {item.student.surname}
                    </Text>
                    <Text style={styles.logMatric}>{item.student.matricNumber}</Text>
                    <View style={styles.logBadges}>
                      <Text style={[
                        styles.logBadge,
                        { backgroundColor: item.action === 'signin' ? '#DCFCE7' : '#FED7AA' }
                      ]}>
                        {item.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
                      </Text>
                      <Text style={[styles.logBadge, { backgroundColor: '#DBEAFE' }]}>
                        {item.fingerUsed}
                      </Text>
                    </View>
                    <Text style={styles.logDetails}>
                      Confidence: {item.confidence}% • Score: {item.score}
                    </Text>
                  </View>
                  <Text style={styles.logTime}>{item.timestamp}</Text>
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    marginBottom: 12
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  registeredCount: {
    color: '#6366F1',
    fontWeight: '600'
  },
  statusCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4
  },
  progressText: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280'
  },
  setupCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16
  },
  noticeCard: {
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FED7AA',
    marginBottom: 16
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 4
  },
  noticeText: {
    fontSize: 13,
    color: '#C2410C'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8
  },
  courseItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  courseItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF'
  },
  courseContent: {
    flex: 1
  },
  courseCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  courseTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8
  },
  courseBadges: {
    flexDirection: 'row',
    gap: 8
  },
  courseBadge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    borderRadius: 12,
    overflow: 'hidden'
  },
  checkmark: {
    fontSize: 24,
    color: '#6366F1'
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  typeButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  typeButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF'
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  typeLabelActive: {
    color: '#6366F1'
  },
  startButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  sessionInfo: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sessionLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  sessionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827'
  },
  instructionsCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  instructionText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  nbisNote: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 8,
    fontWeight: '500'
  },
  scanButton: {
    backgroundColor: '#10B981',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  scanButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  scanningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  resultMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8
  },
  resultDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  closeButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  logCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  emptyLog: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyLogEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyLogText: {
    fontSize: 16,
    color: '#9CA3AF'
  },
  logItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#BBF7D0'
  },
  logImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff'
  },
  logContent: {
    flex: 1
  },
  logName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2
  },
  logMatric: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6
  },
  logBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4
  },
  logBadge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden'
  },
  logDetails: {
    fontSize: 11,
    color: '#6B7280'
  },
  logTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  reportCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  reportItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportItemContent: {
    flex: 1
  },
  reportMatric: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  reportName: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  reportTimes: {
    flexDirection: 'row',
    gap: 12
  },
  reportTimeText: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  newSessionButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  newSessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});