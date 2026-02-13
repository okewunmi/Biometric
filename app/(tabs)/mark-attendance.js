// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Image,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   ScrollView,
//   FlatList,
// } from 'react-native';
// import { CameraView, useCameraPermissions } from 'expo-camera';
// import { 
//   getCoursesWithRegisteredStudents,
//   createAttendanceSession,
//   closeAttendanceSession,
//   getSessionAttendanceReport,
//   getStudentsForCourse,
//   databases,
//   config
// } from '@/lib/appwrite';
// import { Query, ID } from 'react-native-appwrite';

// const API_BASE_URL = 'https://ftpv.appwrite.network';

// export default function AdminAttendanceInterface({ navigation }) {
//   // Camera permissions
//   const [permission, requestPermission] = useCameraPermissions();
//   const cameraRef = useRef(null);
  
//   // Core state
//   const [courses, setCourses] = useState([]);
//   const [selectedCourse, setSelectedCourse] = useState(null);
//   const [sessionType, setSessionType] = useState('signin');
//   const [activeSession, setActiveSession] = useState(null);
//   const [registeredStudents, setRegisteredStudents] = useState([]);
  
//   // Verification state
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [verificationResult, setVerificationResult] = useState(null);
//   const [status, setStatus] = useState({ message: '', type: '' });
//   const [progress, setProgress] = useState({ current: 0, total: 0 });
  
//   // UI state
//   const [attendanceLog, setAttendanceLog] = useState([]);
//   const [sessionReport, setSessionReport] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [facing, setFacing] = useState('front');
//   const [modelsLoaded, setModelsLoaded] = useState(false);

//   // Initialize face recognition API
//   useEffect(() => {
//     checkFaceRecognitionAPI();
//     loadCourses();
//   }, []);

//   // Load students when course is selected
//   useEffect(() => {
//     if (selectedCourse) {
//       loadRegisteredStudents();
//     }
//   }, [selectedCourse]);

//   const checkFaceRecognitionAPI = async () => {
//     try {
//       console.log('🔍 Checking Face Recognition API...');
//       const response = await fetch(`${API_BASE_URL}/api/face/health`, {
//         method: 'GET',
//         headers: { Accept: 'application/json' },
//       });

//       if (response.ok) {
//         const data = await response.json();
//         console.log('✅ Face API ready:', data);
//         setModelsLoaded(true);
//         setStatus({ message: 'Face recognition API ready', type: 'success' });
//       } else {
//         throw new Error(`API returned ${response.status}`);
//       }
//     } catch (error) {
//       console.error('❌ Face API error:', error);
//       setStatus({
//         message: 'Face recognition API unavailable. Please check server.',
//         type: 'error'
//       });
//       setModelsLoaded(false);
//     }
//   };

//   const loadCourses = async () => {
//     try {
//       console.log('Loading courses for attendance...');
//       const result = await getCoursesWithRegisteredStudents();
      
//       if (result.success) {
//         console.log('Courses loaded:', result.data.length);
//         setCourses(result.data);
        
//         if (result.data.length === 0) {
//           setStatus({
//             message: 'No courses with approved registrations found',
//             type: 'warning'
//           });
//         }
//       } else {
//         setStatus({
//           message: result.error || 'Failed to load courses',
//           type: 'error'
//         });
//       }
//     } catch (error) {
//       console.error('Error loading courses:', error);
//       setStatus({
//         message: 'Failed to load courses',
//         type: 'error'
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loadRegisteredStudents = async () => {
//     if (!selectedCourse) return;
    
//     try {
//       console.log('Loading registered students for:', selectedCourse.courseCode);
//       const result = await getStudentsForCourse(selectedCourse.courseCode);
      
//       if (result.success) {
//         console.log('Registered students loaded:', result.data.length);
//         setRegisteredStudents(result.data);
//       } else {
//         console.error('Failed to load students:', result.error);
//         setRegisteredStudents([]);
//       }
//     } catch (error) {
//       console.error('Error loading registered students:', error);
//       setRegisteredStudents([]);
//     }
//   };

//   const handleStartSession = async () => {
//     if (!selectedCourse) {
//       Alert.alert('Error', 'Please select a course first');
//       return;
//     }

//     if (sessionType === 'signout') {
//       const today = new Date().toISOString().split('T')[0];
      
//       try {
//         const todayAttendance = await databases.listDocuments(
//           config.databaseId,
//           config.attendanceCollectionId,
//           [
//             Query.equal('courseCode', selectedCourse.courseCode),
//             Query.equal('attendanceDate', today),
//             Query.limit(20)
//           ]
//         );
        
//         const pendingSignOuts = todayAttendance.documents.filter(record => {
//           const hasSignedIn = record.signInTime && record.signInStatus === 'Present';
//           const notSignedOut = !record.signOutTime;
//           return hasSignedIn && notSignedOut;
//         });
        
//         if (pendingSignOuts.length === 0) {
//           Alert.alert(
//             'No Signed-In Students',
//             'No signed-in students found for today. Do you want to proceed with sign-out session anyway?',
//             [
//               { text: 'Cancel', onPress: () => setSessionType('signin'), style: 'cancel' },
//               { text: 'Proceed', onPress: () => startSession() }
//             ]
//           );
//           return;
//         } else {
//           setStatus({
//             message: `Found ${pendingSignOuts.length} student(s) pending sign-out`,
//             type: 'info'
//           });
//         }
//       } catch (error) {
//         console.error('Error checking attendance records:', error);
//         Alert.alert(
//           'Error',
//           'Error checking existing records. Do you want to proceed with sign-out session anyway?',
//           [
//             { text: 'Cancel', style: 'cancel' },
//             { text: 'Proceed', onPress: () => startSession() }
//           ]
//         );
//         return;
//       }
//     }

//     await startSession();
//   };

//   const startSession = async () => {
//     try {
//       const result = await createAttendanceSession(
//         selectedCourse.courseCode,
//         selectedCourse.courseTitle,
//         sessionType
//       );

//       if (result.success) {
//         setActiveSession(result.data);
//         setAttendanceLog([]);
//         await loadRegisteredStudents();
        
//         setStatus({
//           message: `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started for ${selectedCourse.courseCode}`,
//           type: 'success'
//         });
//       } else {
//         setStatus({
//           message: result.error || 'Failed to start session',
//           type: 'error'
//         });
//       }
//     } catch (error) {
//       setStatus({
//         message: error.message || 'Failed to start session',
//         type: 'error'
//       });
//     }
//   };

//   const startCamera = async () => {
//     console.log('📸 Starting camera...');

//     if (!permission?.granted) {
//       console.log('⚠️ Camera permission not granted, requesting...');
//       const { granted } = await requestPermission();

//       if (!granted) {
//         Alert.alert(
//           'Permission Denied',
//           'Camera permission is required for face verification.'
//         );
//         return;
//       }
//     }

//     setCameraActive(true);
//     setStatus({
//       message: '✅ Camera ready - position your face in frame',
//       type: 'success'
//     });
//   };

//   const stopCamera = () => {
//     setCameraActive(false);
//   };

//   const toggleCameraFacing = () => {
//     setFacing((current) => (current === 'back' ? 'front' : 'back'));
//   };

//   const captureFaceImage = async () => {
//     if (!cameraRef.current) {
//       console.error('❌ Camera ref is null');
//       return null;
//     }

//     try {
//       console.log('📸 Capturing photo...');

//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 1.0,
//         base64: true,
//         exif: false,
//         skipProcessing: false,
//         imageType: 'jpg',
//       });

//       if (!photo || !photo.base64) {
//         throw new Error('Failed to capture image');
//       }

//       const imageData = `data:image/jpeg;base64,${photo.base64}`;
//       console.log('✅ Image captured successfully');
      
//       return imageData;
//     } catch (error) {
//       console.error('❌ Capture error:', error);
//       return null;
//     }
//   };

//   const handleFaceVerification = async () => {
//     if (!activeSession) {
//       Alert.alert('Error', 'Please start a session first');
//       return;
//     }

//     if (!modelsLoaded) {
//       Alert.alert('Error', 'Face recognition API is not available');
//       return;
//     }

//     if (registeredStudents.length === 0) {
//       Alert.alert('Error', 'No registered students found for this course');
//       return;
//     }

//     if (!cameraActive) {
//       await startCamera();
//       setStatus({
//         message: '✅ Camera started. Position your face and click "Capture & Verify"',
//         type: 'success'
//       });
//       return;
//     }

//     setIsVerifying(true);
//     setVerificationResult(null);
//     setProgress({ current: 0, total: 100 });
//     setStatus({ message: 'Capturing face...', type: 'info' });

//     try {
//       // Step 1: Capture face image
//       const capturedImageBase64 = await captureFaceImage();

//       if (!capturedImageBase64) {
//         throw new Error('Failed to capture image from camera');
//       }

//       setProgress({ current: 20, total: 100 });
//       setStatus({ message: 'Analyzing face features...', type: 'info' });

//       // Step 2: Extract face descriptor from captured image
//       console.log(`📡 Calling API: ${API_BASE_URL}/api/face/extract`);

//       const extractResponse = await fetch(`${API_BASE_URL}/api/face/extract`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ image: capturedImageBase64 }),
//       });

//       if (!extractResponse.ok) {
//         const errorText = await extractResponse.text();
//         console.error('❌ Extract API error:', errorText);
//         throw new Error(`Extract API returned ${extractResponse.status}`);
//       }

//       const extractResult = await extractResponse.json();

//       if (!extractResult.success) {
//         throw new Error(extractResult.message || 'Failed to detect or extract face');
//       }

//       console.log(`✅ Face detected (confidence: ${extractResult.confidence}%)`);
//       setProgress({ current: 40, total: 100 });
//       setStatus({ message: 'Loading student database...', type: 'info' });

//       // Step 3: Get all students with face descriptors
//       console.log(`📡 Calling API: ${API_BASE_URL}/api/students/face-descriptors`);

//       const studentsResponse = await fetch(`${API_BASE_URL}/api/students/face-descriptors`);

//       if (!studentsResponse.ok) {
//         throw new Error(`Students API returned ${studentsResponse.status}`);
//       }

//       const studentsResult = await studentsResponse.json();

//       if (!studentsResult.success || studentsResult.data.length === 0) {
//         setVerificationResult({
//           matched: false,
//           message: '⚠️ No registered faces in database. Please register students first.'
//         });
//         setStatus({ message: 'No registered faces found', type: 'warning' });
//         setIsVerifying(false);
//         return;
//       }

//       const totalStudents = studentsResult.data.length;
//       setProgress({ current: 60, total: 100 });
//       setStatus({
//         message: `Comparing against ${totalStudents} registered faces...`,
//         type: 'info'
//       });

//       const storedDescriptors = studentsResult.data.map((student) => ({
//         ...student,
//         descriptor: JSON.parse(student.faceDescriptor),
//         matricNumber: student.matricNumber,
//         firstName: student.firstName,
//         surname: student.surname,
//         studentId: student.$id,
//       }));

//       // Step 4: Verify face against database
//       console.log(`📡 Calling API: ${API_BASE_URL}/api/face/verify`);

//       const verifyResponse = await fetch(`${API_BASE_URL}/api/face/verify`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           inputDescriptor: extractResult.descriptor,
//           students: storedDescriptors,
//         }),
//       });

//       if (!verifyResponse.ok) {
//         throw new Error(`Verify API returned ${verifyResponse.status}`);
//       }

//       const verifyResult = await verifyResponse.json();
//       setProgress({ current: 100, total: 100 });

//       if (verifyResult.success && verifyResult.matched) {
//         const student = verifyResult.student;

//         // Check if student is registered for this course
//         const isRegistered = registeredStudents.find(
//           s => s.matricNumber === student.matricNumber
//         );

//         if (!isRegistered) {
//           setVerificationResult({
//             matched: false,
//             message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`
//           });
//           setStatus({ message: 'Student not registered for this course', type: 'error' });
//           setIsVerifying(false);
//           return;
//         }

//         console.log('🎉 Match found:', student.matricNumber);

//         // Mark attendance in database
//         const markResult = await markAttendanceInSession(
//           activeSession.$id,
//           student,
//           sessionType,
//           selectedCourse.courseId
//         );

//         if (markResult.success) {
//           setVerificationResult({
//             matched: true,
//             student: student,
//             confidence: verifyResult.confidence,
//             distance: verifyResult.distance,
//             action: sessionType,
//             message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`
//           });
//           setStatus({ message: 'Attendance marked successfully!', type: 'success' });

//           // Add to log
//           setAttendanceLog(prev => [{
//             timestamp: new Date().toLocaleTimeString(),
//             student: student,
//             action: sessionType,
//             confidence: verifyResult.confidence,
//             distance: verifyResult.distance
//           }, ...prev]);

//           // Update session count
//           setActiveSession(prev => ({
//             ...prev,
//             totalStudentsMarked: prev.totalStudentsMarked + 1
//           }));

//           // Auto-clear after 3 seconds
//           setTimeout(() => {
//             setVerificationResult(null);
//             setStatus({ message: 'Ready for next student', type: 'info' });
//           }, 3000);

//         } else {
//           setVerificationResult({
//             matched: false,
//             message: markResult.error || 'Failed to mark attendance'
//           });
//           setStatus({ message: markResult.error || 'Failed to mark attendance', type: 'error' });
//         }

//       } else {
//         console.log('❌ No match found');

//         setVerificationResult({
//           matched: false,
//           message: `No match found. Best distance: ${verifyResult.bestDistance || 'N/A'}`,
//         });
//         setStatus({ message: 'No match found', type: 'error' });
//       }

//     } catch (error) {
//       console.error('❌ Face verification error:', error);
//       setStatus({ message: error.message || 'Verification failed', type: 'error' });
//       setVerificationResult({
//         matched: false,
//         message: 'Error: ' + error.message
//       });
//     } finally {
//       setIsVerifying(false);
//       setProgress({ current: 0, total: 0 });
//     }
//   };

//   const markAttendanceInSession = async (sessionId, student, type, courseId) => {
//     try {
//       const timestamp = new Date().toISOString();
//       const date = timestamp.split('T')[0];

//       const sanitizedCourseId = String(courseId || '').trim().substring(0, 150);
      
//       if (!sanitizedCourseId) {
//         return {
//           success: false,
//           error: 'Course ID is required'
//         };
//       }

//       // Check for attendance record by date and course
//       const existingRecords = await databases.listDocuments(
//         config.databaseId,
//         config.attendanceCollectionId,
//         [
//           Query.equal('matricNumber', student.matricNumber),
//           Query.equal('courseCode', activeSession.courseCode),
//           Query.equal('attendanceDate', date),
//           Query.limit(1)
//         ]
//       );

//       if (existingRecords.documents.length > 0) {
//         // Record exists
//         const record = existingRecords.documents[0];
        
//         if (type === 'signin') {
//           // PREVENT MULTIPLE SIGN-INS
//           if (record.signInTime && record.signInStatus === 'Present') {
//             return {
//               success: false,
//               error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}. Cannot sign in twice.`
//             };
//           }
          
//           // Update sign-in time
//           await databases.updateDocument(
//             config.databaseId,
//             config.attendanceCollectionId,
//             record.$id,
//             {
//               signInTime: timestamp,
//               signInStatus: 'Present',
//               sessionId: sessionId
//             }
//           );
          
//           return {
//             success: true,
//             message: `${student.firstName} ${student.surname} signed in successfully`
//           };
          
//         } else if (type === 'signout') {
//           // PREVENT SIGN-OUT WITHOUT SIGN-IN
//           if (!record.signInTime || record.signInStatus !== 'Present') {
//             return {
//               success: false,
//               error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first before signing out.`
//             };
//           }
          
//           // PREVENT MULTIPLE SIGN-OUTS
//           if (record.signOutTime && record.signOutStatus === 'Completed') {
//             return {
//               success: false,
//               error: `${student.firstName} ${student.surname} already signed out at ${new Date(record.signOutTime).toLocaleTimeString()}. Cannot sign out twice.`
//             };
//           }
          
//           // Calculate duration
//           const signInTime = new Date(record.signInTime);
//           const signOutTime = new Date(timestamp);
//           const durationMinutes = Math.floor((signOutTime - signInTime) / (1000 * 60));
          
//           // Update sign-out time
//           await databases.updateDocument(
//             config.databaseId,
//             config.attendanceCollectionId,
//             record.$id,
//             {
//               signOutTime: timestamp,
//               signOutStatus: 'Completed',
//               totalDuration: durationMinutes
//             }
//           );
          
//           return {
//             success: true,
//             message: `${student.firstName} ${student.surname} signed out successfully (${formatDuration(durationMinutes)})`
//           };
//         }
        
//       } else {
//         // No record exists - only allow creating for sign-in
//         if (type === 'signin') {
//           await databases.createDocument(
//             config.databaseId,
//             config.attendanceCollectionId,
//             ID.unique(),
//             {
//               sessionId: sessionId,
//               studentId: student.$id,
//               matricNumber: student.matricNumber,
//               courseId: sanitizedCourseId,
//               courseCode: activeSession.courseCode,
//               courseTitle: activeSession.courseTitle,
//               attendanceDate: date,
//               signInTime: timestamp,
//               signInStatus: 'Present',
//               signOutTime: null,
//               signOutStatus: null,
//               totalDuration: 0,
//               isActive: true,
//               semester: activeSession.semester,
//               academicYear: activeSession.academicYear
//             }
//           );
          
//           return {
//             success: true,
//             message: `${student.firstName} ${student.surname} signed in successfully`
//           };
          
//         } else if (type === 'signout') {
//           return {
//             success: false,
//             error: `${student.firstName} ${student.surname} has not signed in yet. Please sign in first.`
//           };
//         }
//       }

//       return { success: false, error: 'Unknown error occurred' };

//     } catch (error) {
//       console.error('Error marking attendance:', error);
//       return { success: false, error: error.message };
//     }
//   };

//   const formatDuration = (minutes) => {
//     if (!minutes) return '0 min';
    
//     if (minutes < 60) {
//       return `${minutes} min${minutes !== 1 ? 's' : ''}`;
//     }
    
//     const hours = Math.floor(minutes / 60);
//     const mins = minutes % 60;
    
//     return `${hours}h ${mins}m`;
//   };

//   const handleCloseSession = async () => {
//     if (!activeSession) return;

//     Alert.alert(
//       'Close Session',
//       'Are you sure you want to close this session?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Close', 
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               const result = await closeAttendanceSession(activeSession.$id);
              
//               if (result.success) {
//                 const reportResult = await getSessionAttendanceReport(activeSession.$id);
//                 if (reportResult.success) {
//                   setSessionReport(reportResult);
//                 }
                
//                 setActiveSession(null);
//                 setRegisteredStudents([]);
//                 setVerificationResult(null);
//                 setCameraActive(false);
//                 setStatus({
//                   message: 'Session closed successfully',
//                   type: 'success'
//                 });
//               }
//             } catch (error) {
//               setStatus({
//                 message: error.message || 'Failed to close session',
//                 type: 'error'
//               });
//             }
//           }
//         }
//       ]
//     );
//   };

//   const handleNewSession = () => {
//     setActiveSession(null);
//     setSelectedCourse(null);
//     setSessionType('signin');
//     setAttendanceLog([]);
//     setVerificationResult(null);
//     setSessionReport(null);
//     setRegisteredStudents([]);
//     setCameraActive(false);
//     setStatus({ message: 'Ready to start new session', type: 'info' });
//   };

//   const getStatusColor = () => {
//     switch (status.type) {
//       case 'success': return '#10B981';
//       case 'error': return '#EF4444';
//       case 'warning': return '#F59E0B';
//       default: return '#3B82F6';
//     }
//   };

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#6366F1" />
//         <Text style={styles.loadingText}>Loading...</Text>
//       </View>
//     );
//   }

//   // Session Report View
//   if (sessionReport) {
//     return (
//       <ScrollView style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Text style={styles.backButtonText}>← Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.title}>Session Report</Text>
//         </View>

//         <View style={styles.reportCard}>
//           <View style={styles.statsGrid}>
//             <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
//               <Text style={styles.statLabel}>Total Students</Text>
//               <Text style={[styles.statValue, { color: '#6366F1' }]}>
//                 {sessionReport.stats.totalStudents}
//               </Text>
//             </View>
//             <View style={[styles.statBox, { backgroundColor: '#ECFDF5' }]}>
//               <Text style={styles.statLabel}>Present</Text>
//               <Text style={[styles.statValue, { color: '#10B981' }]}>
//                 {sessionReport.stats.present}
//               </Text>
//             </View>
//             <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
//               <Text style={styles.statLabel}>Absent</Text>
//               <Text style={[styles.statValue, { color: '#EF4444' }]}>
//                 {sessionReport.stats.absent}
//               </Text>
//             </View>
//             <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
//               <Text style={styles.statLabel}>Rate</Text>
//               <Text style={[styles.statValue, { color: '#A855F7' }]}>
//                 {sessionReport.stats.attendanceRate}%
//               </Text>
//             </View>
//           </View>

//           <FlatList
//             data={sessionReport.report}
//             keyExtractor={(item, idx) => idx.toString()}
//             renderItem={({ item }) => (
//               <View style={[
//                 styles.reportItem,
//                 { backgroundColor: item.attended ? '#F0FDF4' : '#FEE2E2' }
//               ]}>
//                 <View style={styles.reportItemContent}>
//                   <Text style={styles.reportMatric}>{item.student.matricNumber}</Text>
//                   <Text style={styles.reportName}>
//                     {item.student.firstName} {item.student.surname}
//                   </Text>
//                   <View style={styles.reportTimes}>
//                     <Text style={styles.reportTimeText}>
//                       In: {item.signInTime ? new Date(item.signInTime).toLocaleTimeString() : '-'}
//                     </Text>
//                     <Text style={styles.reportTimeText}>
//                       Out: {item.signOutTime ? new Date(item.signOutTime).toLocaleTimeString() : '-'}
//                     </Text>
//                   </View>
//                 </View>
//                 <View style={[
//                   styles.statusBadge,
//                   { backgroundColor: item.attended ? '#10B981' : '#EF4444' }
//                 ]}>
//                   <Text style={styles.statusBadgeText}>
//                     {item.attended ? 'Present' : 'Absent'}
//                   </Text>
//                 </View>
//               </View>
//             )}
//           />

//           <TouchableOpacity style={styles.newSessionButton} onPress={handleNewSession}>
//             <Text style={styles.newSessionButtonText}>Start New Session</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     );
//   }

//   // No courses view
//   if (courses.length === 0) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Text style={styles.backButtonText}>← Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.title}>Mark Attendance</Text>
//         </View>
//         <View style={styles.emptyState}>
//           <Text style={styles.emptyEmoji}>⚠️</Text>
//           <Text style={styles.emptyTitle}>No Courses Available</Text>
//           <Text style={styles.emptyText}>
//             No courses with approved student registrations found.
//           </Text>
//         </View>
//       </View>
//     );
//   }

//   // Main interface
//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>📋 Mark Attendance</Text>
//         <Text style={styles.subtitle}>
//           Face recognition verification system
//           {activeSession && registeredStudents.length > 0 && (
//             <Text style={styles.registeredCount}> • {registeredStudents.length} registered</Text>
//           )}
//         </Text>

//         {/* API Status */}
//         <View style={styles.apiStatus}>
//           <View style={[styles.apiDot, modelsLoaded ? styles.apiDotOnline : styles.apiDotOffline]} />
//           <Text style={styles.apiStatusText}>
//             API: {modelsLoaded ? 'Connected' : 'Disconnected'}
//           </Text>
//         </View>
//       </View>

//       {/* Status Display */}
//       {status.message ? (
//         <View style={[styles.statusCard, { backgroundColor: getStatusColor() + '20' }]}>
//           <Text style={[styles.statusText, { color: getStatusColor() }]}>
//             {status.message}
//           </Text>
//           {isVerifying && <ActivityIndicator color={getStatusColor()} />}
//         </View>
//       ) : null}

//       {/* Progress Bar */}
//       {progress.total > 0 && isVerifying && (
//         <View style={styles.progressContainer}>
//           <View style={styles.progressBar}>
//             <View 
//               style={[
//                 styles.progressFill, 
//                 { width: `${(progress.current / progress.total) * 100}%` }
//               ]} 
//             />
//           </View>
//           <Text style={styles.progressText}>
//             {progress.current}%
//           </Text>
//         </View>
//       )}

//       {!activeSession ? (
//         /* Session Setup */
//         <View style={styles.setupCard}>
//           <Text style={styles.cardTitle}>Session Setup</Text>

//           {sessionType === 'signout' && (
//             <View style={styles.noticeCard}>
//               <Text style={styles.noticeTitle}>⚠️ Sign-out Session Notice</Text>
//               <Text style={styles.noticeText}>
//                 Students must have signed in earlier today to sign out.
//               </Text>
//             </View>
//           )}

//           {/* Course Selection */}
//           <Text style={styles.label}>Select Course *</Text>
//           <FlatList
//             data={courses}
//             keyExtractor={(item) => item.courseCode}
//             renderItem={({ item }) => (
//               <TouchableOpacity
//                 style={[
//                   styles.courseItem,
//                   selectedCourse?.courseCode === item.courseCode && styles.courseItemSelected
//                 ]}
//                 onPress={() => setSelectedCourse(item)}
//               >
//                 <View style={styles.courseContent}>
//                   <Text style={styles.courseCode}>{item.courseCode}</Text>
//                   <Text style={styles.courseTitle}>{item.courseTitle}</Text>
//                   <View style={styles.courseBadges}>
//                     <Text style={styles.courseBadge}>{item.courseUnit} Units</Text>
//                     <Text style={[styles.courseBadge, { backgroundColor: '#DCFCE7' }]}>
//                       {item.studentCount} Students
//                     </Text>
//                   </View>
//                 </View>
//                 {selectedCourse?.courseCode === item.courseCode && (
//                   <Text style={styles.checkmark}>✓</Text>
//                 )}
//               </TouchableOpacity>
//             )}
//             scrollEnabled={false}
//           />

//           {/* Session Type */}
//           <Text style={styles.label}>Session Type *</Text>
//           <View style={styles.typeButtons}>
//             <TouchableOpacity
//               style={[
//                 styles.typeButton,
//                 sessionType === 'signin' && styles.typeButtonActive
//               ]}
//               onPress={() => setSessionType('signin')}
//             >
//               <Text style={styles.typeEmoji}>🔐</Text>
//               <Text style={[
//                 styles.typeLabel,
//                 sessionType === 'signin' && styles.typeLabelActive
//               ]}>
//                 Sign In
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.typeButton,
//                 sessionType === 'signout' && styles.typeButtonActive
//               ]}
//               onPress={() => setSessionType('signout')}
//             >
//               <Text style={styles.typeEmoji}>🚪</Text>
//               <Text style={[
//                 styles.typeLabel,
//                 sessionType === 'signout' && styles.typeLabelActive
//               ]}>
//                 Sign Out
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             style={[
//               styles.startButton,
//               !selectedCourse && styles.startButtonDisabled
//             ]}
//             onPress={handleStartSession}
//             disabled={!selectedCourse}
//           >
//             <Text style={styles.startButtonText}>Start Attendance Session</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         /* Active Session */
//         <View style={styles.setupCard}>
//           <Text style={styles.cardTitle}>Active Session</Text>

//           <View style={styles.sessionInfo}>
//             <View style={styles.sessionRow}>
//               <Text style={styles.sessionLabel}>Course:</Text>
//               <Text style={styles.sessionValue}>{activeSession.courseCode}</Text>
//             </View>
//             <View style={styles.sessionRow}>
//               <Text style={styles.sessionLabel}>Type:</Text>
//               <Text style={[
//                 styles.sessionValue,
//                 { color: sessionType === 'signin' ? '#10B981' : '#F59E0B' }
//               ]}>
//                 {sessionType === 'signin' ? 'Sign In' : 'Sign Out'}
//               </Text>
//             </View>
//             <View style={styles.sessionRow}>
//               <Text style={styles.sessionLabel}>Students Marked:</Text>
//               <Text style={[styles.sessionValue, { fontSize: 20, color: '#6366F1' }]}>
//                 {activeSession.totalStudentsMarked}
//               </Text>
//             </View>
//             <View style={styles.sessionRow}>
//               <Text style={styles.sessionLabel}>Started:</Text>
//               <Text style={styles.sessionValue}>
//                 {new Date(activeSession.sessionStartTime).toLocaleTimeString()}
//               </Text>
//             </View>
//           </View>

//           {/* Camera View */}
//           <View style={styles.cameraContainer}>
//             <Text style={styles.instructionsTitle}>📸 Face Verification Camera</Text>
            
//             <View style={styles.cameraWrapper}>
//               {cameraActive ? (
//                 <View style={styles.cameraViewContainer}>
//                   <CameraView
//                     ref={cameraRef}
//                     style={styles.camera}
//                     facing={facing}
//                   >
//                     <View style={styles.cameraOverlay}>
//                       <View style={styles.faceIndicator}>
//                         <Text style={styles.faceIndicatorText}>
//                           {isVerifying ? 'Processing...' : 'Ready to Capture'}
//                         </Text>
//                       </View>

//                       <TouchableOpacity
//                         style={styles.flipButton}
//                         onPress={toggleCameraFacing}
//                       >
//                         <Text style={styles.flipButtonText}>🔄</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </CameraView>
//                 </View>
//               ) : (
//                 <View style={styles.cameraPlaceholder}>
//                   <Text style={styles.placeholderEmoji}>📷</Text>
//                   <Text style={styles.placeholderText}>
//                     Camera will activate when you start verification
//                   </Text>
//                 </View>
//               )}
//             </View>

//             <Text style={styles.hint}>💡 Position face in frame and ensure good lighting</Text>
//           </View>

//           {/* Verify Button */}
//           <TouchableOpacity
//             style={[
//               styles.scanButton,
//               (isVerifying || !modelsLoaded) && styles.scanButtonDisabled
//             ]}
//             onPress={handleFaceVerification}
//             disabled={isVerifying || !modelsLoaded}
//           >
//             {isVerifying ? (
//               <View style={styles.scanningContent}>
//                 <ActivityIndicator color="#fff" />
//                 <Text style={styles.scanButtonText}>Verifying... {progress.current}%</Text>
//               </View>
//             ) : !modelsLoaded ? (
//               <Text style={styles.scanButtonText}>⚠️ API Disconnected</Text>
//             ) : cameraActive ? (
//               <Text style={styles.scanButtonText}>📸 Capture & Verify Face</Text>
//             ) : (
//               <Text style={styles.scanButtonText}>🎥 Start Camera</Text>
//             )}
//           </TouchableOpacity>

//           {/* Verification Result */}
//           {verificationResult && (
//             <View style={[
//               styles.resultCard,
//               { backgroundColor: verificationResult.matched ? '#F0FDF4' : '#FEE2E2' }
//             ]}>
//               <Text style={styles.resultEmoji}>
//                 {verificationResult.matched ? '✅' : '❌'}
//               </Text>
//               <Text style={[
//                 styles.resultTitle,
//                 { color: verificationResult.matched ? '#10B981' : '#EF4444' }
//               ]}>
//                 {verificationResult.matched ? 'Success!' : 'Failed'}
//               </Text>
//               <Text style={styles.resultMessage}>{verificationResult.message}</Text>
//               {verificationResult.matched && (
//                 <>
//                   <Text style={styles.resultDetail}>
//                     Confidence: {verificationResult.confidence}%
//                   </Text>
//                   <Text style={styles.resultDetail}>
//                     Distance: {verificationResult.distance?.toFixed(3)}
//                   </Text>
//                 </>
//               )}
//             </View>
//           )}

//           {/* Close Session Button */}
//           <TouchableOpacity style={styles.closeButton} onPress={handleCloseSession}>
//             <Text style={styles.closeButtonText}>Close Session & View Report</Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* Attendance Log */}
//       {activeSession && (
//         <View style={styles.logCard}>
//           <Text style={styles.cardTitle}>Attendance Log</Text>
//           {attendanceLog.length === 0 ? (
//             <View style={styles.emptyLog}>
//               <Text style={styles.emptyLogEmoji}>📋</Text>
//               <Text style={styles.emptyLogText}>No attendance marked yet</Text>
//             </View>
//           ) : (
//             <FlatList
//               data={attendanceLog}
//               keyExtractor={(item, idx) => idx.toString()}
//               renderItem={({ item }) => (
//                 <View style={styles.logItem}>
//                   {item.student.profilePictureUrl && (
//                     <Image
//                       source={{ uri: item.student.profilePictureUrl }}
//                       style={styles.logImage}
//                     />
//                   )}
//                   <View style={styles.logContent}>
//                     <Text style={styles.logName}>
//                       {item.student.firstName} {item.student.surname}
//                     </Text>
//                     <Text style={styles.logMatric}>{item.student.matricNumber}</Text>
//                     <View style={styles.logBadges}>
//                       <Text style={[
//                         styles.logBadge,
//                         { backgroundColor: item.action === 'signin' ? '#DCFCE7' : '#FED7AA' }
//                       ]}>
//                         {item.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
//                       </Text>
//                     </View>
//                     <Text style={styles.logDetails}>
//                       Confidence: {item.confidence}% • Distance: {item.distance?.toFixed(3)}
//                     </Text>
//                   </View>
//                   <Text style={styles.logTime}>{item.timestamp}</Text>
//                 </View>
//               )}
//               scrollEnabled={false}
//             />
//           )}
//         </View>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F3F4F6',
//     marginTop: 30,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F3F4F6'
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#6B7280'
//   },
//   header: {
//     padding: 20,
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB'
//   },
//   backButton: {
//     marginBottom: 12
//   },
//   backButtonText: {
//     color: '#6366F1',
//     fontSize: 16,
//     fontWeight: '600'
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 4
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#6B7280'
//   },
//   registeredCount: {
//     color: '#6366F1',
//     fontWeight: '600'
//   },
//   apiStatus: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 12,
//     padding: 8,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 8,
//   },
//   apiDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 8,
//   },
//   apiDotOnline: {
//     backgroundColor: '#10B981',
//   },
//   apiDotOffline: {
//     backgroundColor: '#EF4444',
//   },
//   apiStatusText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#374151',
//   },
//   statusCard: {
//     margin: 16,
//     padding: 16,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between'
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: '600',
//     flex: 1
//   },
//   progressContainer: {
//     marginHorizontal: 16,
//     marginBottom: 16
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: '#E5E7EB',
//     borderRadius: 4,
//     overflow: 'hidden'
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#3B82F6',
//     borderRadius: 4
//   },
//   progressText: {
//     textAlign: 'right',
//     marginTop: 4,
//     fontSize: 12,
//     color: '#6B7280'
//   },
//   setupCard: {
//     margin: 16,
//     padding: 20,
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 16
//   },
//   noticeCard: {
//     padding: 16,
//     backgroundColor: '#FFF7ED',
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: '#FED7AA',
//     marginBottom: 16
//   },
//   noticeTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#EA580C',
//     marginBottom: 4
//   },
//   noticeText: {
//     fontSize: 13,
//     color: '#C2410C'
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 12,
//     marginTop: 8
//   },
//   courseItem: {
//     padding: 16,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: '#E5E7EB',
//     marginBottom: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between'
//   },
//   courseItemSelected: {
//     borderColor: '#6366F1',
//     backgroundColor: '#EEF2FF'
//   },
//   courseContent: {
//     flex: 1
//   },
//   courseCode: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 4
//   },
//   courseTitle: {
//     fontSize: 13,
//     color: '#6B7280',
//     marginBottom: 8
//   },
//   courseBadges: {
//     flexDirection: 'row',
//     gap: 8
//   },
//   courseBadge: {
//     fontSize: 11,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     backgroundColor: '#DBEAFE',
//     color: '#1E40AF',
//     borderRadius: 12,
//     overflow: 'hidden'
//   },
//   checkmark: {
//     fontSize: 24,
//     color: '#6366F1'
//   },
//   typeButtons: {
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 20
//   },
//   typeButton: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: '#E5E7EB',
//     alignItems: 'center'
//   },
//   typeButtonActive: {
//     borderColor: '#6366F1',
//     backgroundColor: '#EEF2FF'
//   },
//   typeEmoji: {
//     fontSize: 32,
//     marginBottom: 8
//   },
//   typeLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#6B7280'
//   },
//   typeLabelActive: {
//     color: '#6366F1'
//   },
//   startButton: {
//     backgroundColor: '#6366F1',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   startButtonDisabled: {
//     backgroundColor: '#9CA3AF'
//   },
//   startButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600'
//   },
//   sessionInfo: {
//     backgroundColor: '#EEF2FF',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16
//   },
//   sessionRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12
//   },
//   sessionLabel: {
//     fontSize: 13,
//     color: '#6B7280',
//     fontWeight: '500'
//   },
//   sessionValue: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#111827'
//   },
//   cameraContainer: {
//     marginBottom: 16
//   },
//   instructionsTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 12
//   },
//   cameraWrapper: {
//     marginBottom: 12
//   },
//   cameraViewContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     height: 400,
//     backgroundColor: '#000'
//   },
//   camera: {
//     flex: 1
//   },
//   cameraOverlay: {
//     flex: 1,
//     backgroundColor: 'transparent',
//     justifyContent: 'space-between',
//     padding: 16
//   },
//   faceIndicator: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//     backgroundColor: '#6366F1'
//   },
//   faceIndicatorText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: '600'
//   },
//   flipButton: {
//     alignSelf: 'flex-end',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     padding: 12,
//     borderRadius: 50
//   },
//   flipButtonText: {
//     fontSize: 24
//   },
//   cameraPlaceholder: {
//     height: 400,
//     backgroundColor: '#1F2937',
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20
//   },
//   placeholderEmoji: {
//     fontSize: 64,
//     marginBottom: 12
//   },
//   placeholderText: {
//     color: '#9CA3AF',
//     fontSize: 14,
//     textAlign: 'center'
//   },
//   hint: {
//     fontSize: 12,
//     color: '#6B7280',
//     textAlign: 'center'
//   },
//   scanButton: {
//     backgroundColor: '#10B981',
//     padding: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginBottom: 16
//   },
//   scanButtonDisabled: {
//     backgroundColor: '#9CA3AF'
//   },
//   scanningContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12
//   },
//   scanButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold'
//   },
//   resultCard: {
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginBottom: 16
//   },
//   resultEmoji: {
//     fontSize: 48,
//     marginBottom: 8
//   },
//   resultTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 4
//   },
//   resultMessage: {
//     fontSize: 14,
//     color: '#374151',
//     textAlign: 'center',
//     marginBottom: 8
//   },
//   resultDetail: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginTop: 2
//   },
//   closeButton: {
//     backgroundColor: '#EF4444',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   closeButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600'
//   },
//   logCard: {
//     margin: 16,
//     padding: 20,
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3
//   },
//   emptyLog: {
//     alignItems: 'center',
//     paddingVertical: 40
//   },
//   emptyLogEmoji: {
//     fontSize: 48,
//     marginBottom: 12
//   },
//   emptyLogText: {
//     fontSize: 16,
//     color: '#9CA3AF'
//   },
//   logItem: {
//     flexDirection: 'row',
//     padding: 12,
//     backgroundColor: '#F0FDF4',
//     borderRadius: 12,
//     marginBottom: 8,
//     borderWidth: 2,
//     borderColor: '#BBF7D0'
//   },
//   logImage: {
//     width: 48,
//     height: 48,
//     borderRadius: 8,
//     marginRight: 12,
//     borderWidth: 2,
//     borderColor: '#fff'
//   },
//   logContent: {
//     flex: 1
//   },
//   logName: {
//     fontSize: 15,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 2
//   },
//   logMatric: {
//     fontSize: 13,
//     color: '#6B7280',
//     marginBottom: 6
//   },
//   logBadges: {
//     flexDirection: 'row',
//     gap: 6,
//     marginBottom: 4
//   },
//   logBadge: {
//     fontSize: 11,
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 10,
//     overflow: 'hidden'
//   },
//   logDetails: {
//     fontSize: 11,
//     color: '#6B7280'
//   },
//   logTime: {
//     fontSize: 11,
//     color: '#9CA3AF',
//     marginLeft: 8
//   },
//   emptyState: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 40
//   },
//   emptyEmoji: {
//     fontSize: 80,
//     marginBottom: 16
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 8
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#6B7280',
//     textAlign: 'center'
//   },
//   reportCard: {
//     margin: 16,
//     padding: 20,
//     backgroundColor: '#fff',
//     borderRadius: 16
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginBottom: 20
//   },
//   statBox: {
//     flex: 1,
//     minWidth: '45%',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginBottom: 4
//   },
//   statValue: {
//     fontSize: 28,
//     fontWeight: 'bold'
//   },
//   reportItem: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 8,
//     flexDirection: 'row',
//     alignItems: 'center'
//   },
//   reportItemContent: {
//     flex: 1
//   },
//   reportMatric: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827'
//   },
//   reportName: {
//     fontSize: 13,
//     color: '#6B7280',
//     marginBottom: 4
//   },
//   reportTimes: {
//     flexDirection: 'row',
//     gap: 12
//   },
//   reportTimeText: {
//     fontSize: 11,
//     color: '#9CA3AF'
//   },
//   statusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12
//   },
//   statusBadgeText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600'
//   },
//   newSessionButton: {
//     backgroundColor: '#6366F1',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 16
//   },
//   newSessionButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600'
//   }
// });

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  getCoursesWithRegisteredStudents,
  createAttendanceSession,
  closeAttendanceSession,
  getSessionAttendanceReport,
  getStudentsForCourse,
  databases,
  config,
} from '@/lib/appwrite';
import { Query, ID } from 'react-native-appwrite';

const API_BASE_URL = 'https://ftpv.appwrite.network';

export default function AdminAttendanceInterface() {
  // ─── Router (replaces navigation prop) ───────────────────────────────────
  const router = useRouter();

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

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
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState('front');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    checkFaceRecognitionAPI();
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadRegisteredStudents();
    }
  }, [selectedCourse]);

  // ─── API / Data loaders ───────────────────────────────────────────────────

  const checkFaceRecognitionAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/face/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setModelsLoaded(true);
        setStatus({ message: 'Face recognition API ready', type: 'success' });
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      setStatus({ message: 'Face recognition API unavailable. Please check server.', type: 'error' });
      setModelsLoaded(false);
    }
  };

  const loadCourses = async () => {
    try {
      const result = await getCoursesWithRegisteredStudents();
      if (result.success) {
        setCourses(result.data);
        if (result.data.length === 0) {
          setStatus({ message: 'No courses with approved registrations found', type: 'warning' });
        }
      } else {
        setStatus({ message: result.error || 'Failed to load courses', type: 'error' });
      }
    } catch {
      setStatus({ message: 'Failed to load courses', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRegisteredStudents = async () => {
    if (!selectedCourse) return;
    try {
      const result = await getStudentsForCourse(selectedCourse.courseCode);
      setRegisteredStudents(result.success ? result.data : []);
    } catch {
      setRegisteredStudents([]);
    }
  };

  // ─── Session management ───────────────────────────────────────────────────

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
            Query.limit(20),
          ]
        );
        const pendingSignOuts = todayAttendance.documents.filter(
          (r) => r.signInTime && r.signInStatus === 'Present' && !r.signOutTime
        );
        if (pendingSignOuts.length === 0) {
          Alert.alert(
            'No Signed-In Students',
            'No signed-in students found for today. Proceed with sign-out session anyway?',
            [
              { text: 'Cancel', onPress: () => setSessionType('signin'), style: 'cancel' },
              { text: 'Proceed', onPress: () => startSession() },
            ]
          );
          return;
        }
        setStatus({ message: `Found ${pendingSignOuts.length} student(s) pending sign-out`, type: 'info' });
      } catch {
        Alert.alert('Error', 'Error checking existing records. Proceed anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => startSession() },
        ]);
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
          type: 'success',
        });
      } else {
        setStatus({ message: result.error || 'Failed to start session', type: 'error' });
      }
    } catch (error) {
      setStatus({ message: error.message || 'Failed to start session', type: 'error' });
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    Alert.alert('Close Session', 'Are you sure you want to close this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await closeAttendanceSession(activeSession.$id);
            if (result.success) {
              const reportResult = await getSessionAttendanceReport(activeSession.$id);
              if (reportResult.success) setSessionReport(reportResult);
              setActiveSession(null);
              setRegisteredStudents([]);
              setVerificationResult(null);
              setCameraActive(false);
              setStatus({ message: 'Session closed successfully', type: 'success' });
            }
          } catch (error) {
            setStatus({ message: error.message || 'Failed to close session', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleNewSession = () => {
    setActiveSession(null);
    setSelectedCourse(null);
    setSessionType('signin');
    setAttendanceLog([]);
    setVerificationResult(null);
    setSessionReport(null);
    setRegisteredStudents([]);
    setCameraActive(false);
    setStatus({ message: 'Ready to start new session', type: 'info' });
  };

  // ─── Camera ───────────────────────────────────────────────────────────────

  const startCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera permission is required for face verification.');
        return;
      }
    }
    setCameraActive(true);
    setStatus({ message: '✅ Camera ready - position your face in frame', type: 'success' });
  };

  const toggleCameraFacing = () =>
    setFacing((c) => (c === 'back' ? 'front' : 'back'));

  const captureFaceImage = async () => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: true,
        exif: false,
        skipProcessing: false,
        imageType: 'jpg',
      });
      if (!photo?.base64) throw new Error('Failed to capture image');
      return `data:image/jpeg;base64,${photo.base64}`;
    } catch {
      return null;
    }
  };

  // ─── Face verification ────────────────────────────────────────────────────

  const handleFaceVerification = async () => {
    if (!activeSession) { Alert.alert('Error', 'Please start a session first'); return; }
    if (!modelsLoaded) { Alert.alert('Error', 'Face recognition API is not available'); return; }
    if (registeredStudents.length === 0) { Alert.alert('Error', 'No registered students found for this course'); return; }

    if (!cameraActive) {
      await startCamera();
      setStatus({ message: '✅ Camera started. Position your face and click "Capture & Verify"', type: 'success' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setStatus({ message: 'Capturing face...', type: 'info' });

    try {
      const capturedImageBase64 = await captureFaceImage();
      if (!capturedImageBase64) throw new Error('Failed to capture image from camera');

      setProgress({ current: 20, total: 100 });
      setStatus({ message: 'Analyzing face features...', type: 'info' });

      const extractResponse = await fetch(`${API_BASE_URL}/api/face/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImageBase64 }),
      });
      if (!extractResponse.ok) throw new Error(`Extract API returned ${extractResponse.status}`);
      const extractResult = await extractResponse.json();
      if (!extractResult.success) throw new Error(extractResult.message || 'Failed to detect or extract face');

      setProgress({ current: 40, total: 100 });
      setStatus({ message: 'Loading student database...', type: 'info' });

      const studentsResponse = await fetch(`${API_BASE_URL}/api/students/face-descriptors`);
      if (!studentsResponse.ok) throw new Error(`Students API returned ${studentsResponse.status}`);
      const studentsResult = await studentsResponse.json();

      if (!studentsResult.success || studentsResult.data.length === 0) {
        setVerificationResult({ matched: false, message: '⚠️ No registered faces in database. Please register students first.' });
        setStatus({ message: 'No registered faces found', type: 'warning' });
        setIsVerifying(false);
        return;
      }

      setProgress({ current: 60, total: 100 });
      setStatus({ message: `Comparing against ${studentsResult.data.length} registered faces...`, type: 'info' });

      const storedDescriptors = studentsResult.data.map((s) => ({
        ...s,
        descriptor: JSON.parse(s.faceDescriptor),
        matricNumber: s.matricNumber,
        firstName: s.firstName,
        surname: s.surname,
        studentId: s.$id,
      }));

      const verifyResponse = await fetch(`${API_BASE_URL}/api/face/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputDescriptor: extractResult.descriptor, students: storedDescriptors }),
      });
      if (!verifyResponse.ok) throw new Error(`Verify API returned ${verifyResponse.status}`);
      const verifyResult = await verifyResponse.json();

      setProgress({ current: 100, total: 100 });

      if (verifyResult.success && verifyResult.matched) {
        const student = verifyResult.student;
        const isRegistered = registeredStudents.find((s) => s.matricNumber === student.matricNumber);

        if (!isRegistered) {
          setVerificationResult({
            matched: false,
            message: `${student.firstName} ${student.surname} (${student.matricNumber}) is not registered for ${activeSession.courseCode}`,
          });
          setStatus({ message: 'Student not registered for this course', type: 'error' });
          setIsVerifying(false);
          return;
        }

        const markResult = await markAttendanceInSession(activeSession.$id, student, sessionType, selectedCourse.courseId);

        if (markResult.success) {
          setVerificationResult({
            matched: true,
            student,
            confidence: verifyResult.confidence,
            distance: verifyResult.distance,
            action: sessionType,
            message: `${student.firstName} ${student.surname} ${sessionType === 'signin' ? 'signed in' : 'signed out'} successfully`,
          });
          setStatus({ message: 'Attendance marked successfully!', type: 'success' });
          setAttendanceLog((prev) => [
            { timestamp: new Date().toLocaleTimeString(), student, action: sessionType, confidence: verifyResult.confidence, distance: verifyResult.distance },
            ...prev,
          ]);
          setActiveSession((prev) => ({ ...prev, totalStudentsMarked: prev.totalStudentsMarked + 1 }));
          setTimeout(() => {
            setVerificationResult(null);
            setStatus({ message: 'Ready for next student', type: 'info' });
          }, 3000);
        } else {
          setVerificationResult({ matched: false, message: markResult.error || 'Failed to mark attendance' });
          setStatus({ message: markResult.error || 'Failed to mark attendance', type: 'error' });
        }
      } else {
        setVerificationResult({ matched: false, message: `No match found. Best distance: ${verifyResult.bestDistance || 'N/A'}` });
        setStatus({ message: 'No match found', type: 'error' });
      }
    } catch (error) {
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setVerificationResult({ matched: false, message: 'Error: ' + error.message });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // ─── Attendance DB write ──────────────────────────────────────────────────

  const markAttendanceInSession = async (sessionId, student, type, courseId) => {
    try {
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];
      const sanitizedCourseId = String(courseId || '').trim().substring(0, 150);
      if (!sanitizedCourseId) return { success: false, error: 'Course ID is required' };

      const existingRecords = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('matricNumber', student.matricNumber),
          Query.equal('courseCode', activeSession.courseCode),
          Query.equal('attendanceDate', date),
          Query.limit(1),
        ]
      );

      if (existingRecords.documents.length > 0) {
        const record = existingRecords.documents[0];

        if (type === 'signin') {
          if (record.signInTime && record.signInStatus === 'Present') {
            return { success: false, error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}.` };
          }
          await databases.updateDocument(config.databaseId, config.attendanceCollectionId, record.$id, {
            signInTime: timestamp, signInStatus: 'Present', sessionId,
          });
          return { success: true };
        }

        if (type === 'signout') {
          if (!record.signInTime || record.signInStatus !== 'Present') {
            return { success: false, error: `${student.firstName} ${student.surname} has not signed in yet.` };
          }
          if (record.signOutTime && record.signOutStatus === 'Completed') {
            return { success: false, error: `${student.firstName} ${student.surname} already signed out at ${new Date(record.signOutTime).toLocaleTimeString()}.` };
          }
          const durationMinutes = Math.floor((new Date(timestamp) - new Date(record.signInTime)) / 60000);
          await databases.updateDocument(config.databaseId, config.attendanceCollectionId, record.$id, {
            signOutTime: timestamp, signOutStatus: 'Completed', totalDuration: durationMinutes,
          });
          return { success: true };
        }
      } else {
        if (type === 'signin') {
          await databases.createDocument(config.databaseId, config.attendanceCollectionId, ID.unique(), {
            sessionId, studentId: student.$id, matricNumber: student.matricNumber,
            courseId: sanitizedCourseId, courseCode: activeSession.courseCode,
            courseTitle: activeSession.courseTitle, attendanceDate: date,
            signInTime: timestamp, signInStatus: 'Present', signOutTime: null,
            signOutStatus: null, totalDuration: 0, isActive: true,
            semester: activeSession.semester, academicYear: activeSession.academicYear,
          });
          return { success: true };
        }
        return { success: false, error: `${student.firstName} ${student.surname} has not signed in yet.` };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  // ─── Loading screen ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ─── Session Report — uses FlatList as root ───────────────────────────────

  if (sessionReport) {
    const reportHeader = (
      <View>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Session Report</Text>
        </View>
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Students', value: sessionReport.stats.totalStudents, bg: '#EEF2FF', color: '#6366F1' },
            { label: 'Present', value: sessionReport.stats.present, bg: '#ECFDF5', color: '#10B981' },
            { label: 'Absent', value: sessionReport.stats.absent, bg: '#FEE2E2', color: '#EF4444' },
            { label: 'Rate', value: `${sessionReport.stats.attendanceRate}%`, bg: '#F3E8FF', color: '#A855F7' },
          ].map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: s.bg }]}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );

    const reportFooter = (
      <TouchableOpacity style={[styles.newSessionButton, { margin: 16 }]} onPress={handleNewSession}>
        <Text style={styles.newSessionButtonText}>Start New Session</Text>
      </TouchableOpacity>
    );

    return (
      <FlatList
        style={styles.container}
        data={sessionReport.report}
        keyExtractor={(_, idx) => idx.toString()}
        ListHeaderComponent={reportHeader}
        ListFooterComponent={reportFooter}
        renderItem={({ item }) => (
          <View style={[styles.reportItem, { backgroundColor: item.attended ? '#F0FDF4' : '#FEE2E2', marginHorizontal: 16, marginBottom: 8 }]}>
            <View style={styles.reportItemContent}>
              <Text style={styles.reportMatric}>{item.student.matricNumber}</Text>
              <Text style={styles.reportName}>{item.student.firstName} {item.student.surname}</Text>
              <View style={styles.reportTimes}>
                <Text style={styles.reportTimeText}>In: {item.signInTime ? new Date(item.signInTime).toLocaleTimeString() : '-'}</Text>
                <Text style={styles.reportTimeText}>Out: {item.signOutTime ? new Date(item.signOutTime).toLocaleTimeString() : '-'}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.attended ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.statusBadgeText}>{item.attended ? 'Present' : 'Absent'}</Text>
            </View>
          </View>
        )}
      />
    );
  }

  // ─── No courses screen ────────────────────────────────────────────────────

  if (courses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mark Attendance</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>No Courses Available</Text>
          <Text style={styles.emptyText}>No courses with approved student registrations found.</Text>
        </View>
      </View>
    );
  }

  // ─── Main interface — single FlatList as root ─────────────────────────────
  // All sections are rendered as the ListHeaderComponent so there are no
  // nested virtualized lists. The only FlatList *data* is the attendance log.

  const mainHeader = (
    <View>
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.title}>📋 Mark Attendance</Text>
        <Text style={styles.subtitle}>
          Face recognition verification system
          {activeSession && registeredStudents.length > 0 && (
            <Text style={styles.registeredCount}> • {registeredStudents.length} registered</Text>
          )}
        </Text>
        <View style={styles.apiStatus}>
          <View style={[styles.apiDot, modelsLoaded ? styles.apiDotOnline : styles.apiDotOffline]} />
          <Text style={styles.apiStatusText}>API: {modelsLoaded ? 'Connected' : 'Disconnected'}</Text>
        </View>
      </View>

      {/* Status banner */}
      {status.message ? (
        <View style={[styles.statusCard, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{status.message}</Text>
          {isVerifying && <ActivityIndicator color={getStatusColor()} />}
        </View>
      ) : null}

      {/* Progress bar */}
      {progress.total > 0 && isVerifying && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.current}%</Text>
        </View>
      )}

      {/* Session Setup or Active Session */}
      {!activeSession ? (
        <View style={styles.setupCard}>
          <Text style={styles.cardTitle}>Session Setup</Text>

          {sessionType === 'signout' && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>⚠️ Sign-out Session Notice</Text>
              <Text style={styles.noticeText}>Students must have signed in earlier today to sign out.</Text>
            </View>
          )}

          {/* Course list — rendered as plain mapped Views (not FlatList) */}
          <Text style={styles.label}>Select Course *</Text>
          {courses.map((item) => (
            <TouchableOpacity
              key={item.courseCode}
              style={[styles.courseItem, selectedCourse?.courseCode === item.courseCode && styles.courseItemSelected]}
              onPress={() => setSelectedCourse(item)}
            >
              <View style={styles.courseContent}>
                <Text style={styles.courseCode}>{item.courseCode}</Text>
                <Text style={styles.courseTitle}>{item.courseTitle}</Text>
                <View style={styles.courseBadges}>
                  <Text style={styles.courseBadge}>{item.courseUnit} Units</Text>
                  <Text style={[styles.courseBadge, { backgroundColor: '#DCFCE7' }]}>{item.studentCount} Students</Text>
                </View>
              </View>
              {selectedCourse?.courseCode === item.courseCode && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          {/* Session type */}
          <Text style={styles.label}>Session Type *</Text>
          <View style={styles.typeButtons}>
            {['signin', 'signout'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, sessionType === type && styles.typeButtonActive]}
                onPress={() => setSessionType(type)}
              >
                <Text style={styles.typeEmoji}>{type === 'signin' ? '🔐' : '🚪'}</Text>
                <Text style={[styles.typeLabel, sessionType === type && styles.typeLabelActive]}>
                  {type === 'signin' ? 'Sign In' : 'Sign Out'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startButton, !selectedCourse && styles.startButtonDisabled]}
            onPress={handleStartSession}
            disabled={!selectedCourse}
          >
            <Text style={styles.startButtonText}>Start Attendance Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.setupCard}>
          <Text style={styles.cardTitle}>Active Session</Text>

          <View style={styles.sessionInfo}>
            {[
              { label: 'Course:', value: activeSession.courseCode, extra: {} },
              { label: 'Type:', value: sessionType === 'signin' ? 'Sign In' : 'Sign Out', extra: { color: sessionType === 'signin' ? '#10B981' : '#F59E0B' } },
              { label: 'Students Marked:', value: String(activeSession.totalStudentsMarked), extra: { fontSize: 20, color: '#6366F1' } },
              { label: 'Started:', value: new Date(activeSession.sessionStartTime).toLocaleTimeString(), extra: {} },
            ].map((row) => (
              <View key={row.label} style={styles.sessionRow}>
                <Text style={styles.sessionLabel}>{row.label}</Text>
                <Text style={[styles.sessionValue, row.extra]}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Camera */}
          <View style={styles.cameraContainer}>
            <Text style={styles.instructionsTitle}>📸 Face Verification Camera</Text>
            <View style={styles.cameraWrapper}>
              {cameraActive ? (
                <View style={styles.cameraViewContainer}>
                  <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
                    <View style={styles.cameraOverlay}>
                      <View style={styles.faceIndicator}>
                        <Text style={styles.faceIndicatorText}>{isVerifying ? 'Processing...' : 'Ready to Capture'}</Text>
                      </View>
                      <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                        <Text style={styles.flipButtonText}>🔄</Text>
                      </TouchableOpacity>
                    </View>
                  </CameraView>
                </View>
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.placeholderEmoji}>📷</Text>
                  <Text style={styles.placeholderText}>Camera will activate when you start verification</Text>
                </View>
              )}
            </View>
            <Text style={styles.hint}>💡 Position face in frame and ensure good lighting</Text>
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.scanButton, (isVerifying || !modelsLoaded) && styles.scanButtonDisabled]}
            onPress={handleFaceVerification}
            disabled={isVerifying || !modelsLoaded}
          >
            {isVerifying ? (
              <View style={styles.scanningContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.scanButtonText}>Verifying... {progress.current}%</Text>
              </View>
            ) : !modelsLoaded ? (
              <Text style={styles.scanButtonText}>⚠️ API Disconnected</Text>
            ) : cameraActive ? (
              <Text style={styles.scanButtonText}>📸 Capture & Verify Face</Text>
            ) : (
              <Text style={styles.scanButtonText}>🎥 Start Camera</Text>
            )}
          </TouchableOpacity>

          {/* Verification result */}
          {verificationResult && (
            <View style={[styles.resultCard, { backgroundColor: verificationResult.matched ? '#F0FDF4' : '#FEE2E2' }]}>
              <Text style={styles.resultEmoji}>{verificationResult.matched ? '✅' : '❌'}</Text>
              <Text style={[styles.resultTitle, { color: verificationResult.matched ? '#10B981' : '#EF4444' }]}>
                {verificationResult.matched ? 'Success!' : 'Failed'}
              </Text>
              <Text style={styles.resultMessage}>{verificationResult.message}</Text>
              {verificationResult.matched && (
                <>
                  <Text style={styles.resultDetail}>Confidence: {verificationResult.confidence}%</Text>
                  <Text style={styles.resultDetail}>Distance: {verificationResult.distance?.toFixed(3)}</Text>
                </>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={handleCloseSession}>
            <Text style={styles.closeButtonText}>Close Session & View Report</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Attendance log header */}
      {activeSession && (
        <View style={[styles.logCard, { paddingBottom: attendanceLog.length === 0 ? 20 : 8 }]}>
          <Text style={styles.cardTitle}>Attendance Log</Text>
          {attendanceLog.length === 0 && (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogEmoji}>📋</Text>
              <Text style={styles.emptyLogText}>No attendance marked yet</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Log items rendered as FlatList data (no nesting issue)
  return (
    <FlatList
      style={styles.container}
      data={activeSession ? attendanceLog : []}
      keyExtractor={(_, idx) => idx.toString()}
      ListHeaderComponent={mainHeader}
      ListFooterComponent={<View style={{ height: 32 }} />}
      renderItem={({ item }) => (
        <View style={[styles.logItem, { marginHorizontal: 16, marginBottom: 8 }]}>
          {item.student.profilePictureUrl && (
            <Image source={{ uri: item.student.profilePictureUrl }} style={styles.logImage} />
          )}
          <View style={styles.logContent}>
            <Text style={styles.logName}>{item.student.firstName} {item.student.surname}</Text>
            <Text style={styles.logMatric}>{item.student.matricNumber}</Text>
            <View style={styles.logBadges}>
              <Text style={[styles.logBadge, { backgroundColor: item.action === 'signin' ? '#DCFCE7' : '#FED7AA' }]}>
                {item.action === 'signin' ? '✅ Signed In' : '🚪 Signed Out'}
              </Text>
            </View>
            <Text style={styles.logDetails}>Confidence: {item.confidence}% • Distance: {item.distance?.toFixed(3)}</Text>
          </View>
          <Text style={styles.logTime}>{item.timestamp}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', marginTop: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginBottom: 12 },
  backButtonText: { color: '#6366F1', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  registeredCount: { color: '#6366F1', fontWeight: '600' },
  apiStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
  apiDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  apiDotOnline: { backgroundColor: '#10B981' },
  apiDotOffline: { backgroundColor: '#EF4444' },
  apiStatusText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  statusCard: { margin: 16, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 14, fontWeight: '600', flex: 1 },
  progressContainer: { marginHorizontal: 16, marginBottom: 16 },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  progressText: { textAlign: 'right', marginTop: 4, fontSize: 12, color: '#6B7280' },
  setupCard: { margin: 16, padding: 20, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  noticeCard: { padding: 16, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 2, borderColor: '#FED7AA', marginBottom: 16 },
  noticeTitle: { fontSize: 14, fontWeight: '600', color: '#EA580C', marginBottom: 4 },
  noticeText: { fontSize: 13, color: '#C2410C' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
  courseItem: { padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseItemSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  courseContent: { flex: 1 },
  courseCode: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  courseTitle: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  courseBadges: { flexDirection: 'row', gap: 8 },
  courseBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: 12, overflow: 'hidden' },
  checkmark: { fontSize: 24, color: '#6366F1' },
  typeButtons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeButton: { flex: 1, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center' },
  typeButtonActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  typeEmoji: { fontSize: 32, marginBottom: 8 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeLabelActive: { color: '#6366F1' },
  startButton: { backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center' },
  startButtonDisabled: { backgroundColor: '#9CA3AF' },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sessionInfo: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginBottom: 16 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sessionLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sessionValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  cameraContainer: { marginBottom: 16 },
  instructionsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  cameraWrapper: { marginBottom: 12 },
  cameraViewContainer: { borderRadius: 12, overflow: 'hidden', height: 400, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 16 },
  faceIndicator: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#6366F1' },
  faceIndicatorText: { color: 'white', fontSize: 14, fontWeight: '600' },
  flipButton: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 50 },
  flipButtonText: { fontSize: 24 },
  cameraPlaceholder: { height: 400, backgroundColor: '#1F2937', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 20 },
  placeholderEmoji: { fontSize: 64, marginBottom: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  scanButton: { backgroundColor: '#10B981', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  scanButtonDisabled: { backgroundColor: '#9CA3AF' },
  scanningContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  resultEmoji: { fontSize: 48, marginBottom: 8 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  resultMessage: { fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 8 },
  resultDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  closeButton: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logCard: { margin: 16, padding: 20, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  emptyLog: { alignItems: 'center', paddingVertical: 40 },
  emptyLogEmoji: { fontSize: 48, marginBottom: 12 },
  emptyLogText: { fontSize: 16, color: '#9CA3AF' },
  logItem: { flexDirection: 'row', padding: 12, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 2, borderColor: '#BBF7D0' },
  logImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12, borderWidth: 2, borderColor: '#fff' },
  logContent: { flex: 1 },
  logName: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  logMatric: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  logBadges: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  logBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  logDetails: { fontSize: 11, color: '#6B7280' },
  logTime: { fontSize: 11, color: '#9CA3AF', marginLeft: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 80, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, margin: 16 },
  statBox: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  reportItem: { padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  reportItemContent: { flex: 1 },
  reportMatric: { fontSize: 14, fontWeight: '600', color: '#111827' },
  reportName: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  reportTimes: { flexDirection: 'row', gap: 12 },
  reportTimeText: { fontSize: 11, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  newSessionButton: { backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  newSessionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});