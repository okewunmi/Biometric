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
//   Dimensions
// } from 'react-native';
// import { Camera } from 'expo-camera';
// import { NativeModules, NativeEventEmitter } from 'react-native';
// import * as FileSystem from 'expo-file-system';

// const { FingerprintModule } = NativeModules;
// const fingerprintEmitter = FingerprintModule ? new NativeEventEmitter(FingerprintModule) : null;

// const { width } = Dimensions.get('window');

// // ⚠️ IMPORTANT: Replace with your actual server URL
// const API_BASE_URL = 'https://ftpv.appwrite.network/'; // or http://localhost:3000 for local testing

// export default function ExamVerificationScreen() {
//   const [verificationType, setVerificationType] = useState('');
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [verificationResult, setVerificationResult] = useState(null);
//   const [cameraPermission, setCameraPermission] = useState(null);
//   const [progress, setProgress] = useState({ current: 0, total: 0 });
//   const [status, setStatus] = useState({ message: '', type: '' });
//   const [errorMessage, setErrorMessage] = useState('');
//   const [scannerAvailable, setScannerAvailable] = useState(false);
  
//   const cameraRef = useRef(null);

//   useEffect(() => {
//     checkFingerprintScanner();
    
//     // Setup fingerprint event listeners
//     if (fingerprintEmitter) {
//       const listeners = [
//         fingerprintEmitter.addListener('onScanStarted', () => {
//           setStatus({ message: 'Place finger on scanner...', type: 'info' });
//         }),
        
//         fingerprintEmitter.addListener('onScanComplete', async (data) => {
//           setStatus({ message: 'Verifying with server...', type: 'info' });
//           await verifyFingerprintWithServer(data.imageData);
//         }),
        
//         fingerprintEmitter.addListener('onScanError', (error) => {
//           setStatus({ message: `Error: ${error.error}`, type: 'error' });
//           setIsVerifying(false);
//           Alert.alert('Scan Error', error.error);
//         })
//       ];

//       return () => {
//         listeners.forEach(listener => listener.remove());
//         if (FingerprintModule?.close) {
//           FingerprintModule.close();
//         }
//       };
//     }
//   }, []);

//   const checkFingerprintScanner = async () => {
//     try {
//       if (!FingerprintModule) {
//         console.log('⚠️ Fingerprint module not available');
//         return;
//       }

//       const availability = await FingerprintModule.isAvailable();
//       setScannerAvailable(availability.available);

//       if (availability.available) {
//         const initResult = await FingerprintModule.initialize();
//         if (initResult.success) {
//           setStatus({ message: 'Fingerprint scanner ready', type: 'success' });
//         }
//       } else {
//         setStatus({ message: 'Connect scanner via OTG', type: 'warning' });
//       }
//     } catch (error) {
//       console.error('Scanner check error:', error);
//     }
//   };

//   const requestCameraPermission = async () => {
//     const { status } = await Camera.requestCameraPermissionsAsync();
//     setCameraPermission(status === 'granted');
//     return status === 'granted';
//   };

//   /**
//    * Handle Face Verification using Next.js API
//    */
//   const handleFaceVerification = async () => {
//     // Check camera permission
//     if (!cameraPermission) {
//       const granted = await requestCameraPermission();
//       if (!granted) {
//         Alert.alert('Permission Denied', 'Camera access is required for face verification');
//         return;
//       }
//     }

//     setIsVerifying(true);
//     setVerificationResult(null);
//     setProgress({ current: 0, total: 100 });
//     setErrorMessage('');
//     setStatus({ message: 'Preparing camera...', type: 'info' });

//     try {
//       // Capture photo from camera
//       if (!cameraRef.current) {
//         throw new Error('Camera not ready');
//       }

//       setStatus({ message: 'Capturing face...', type: 'info' });
//       setProgress({ current: 10, total: 100 });

//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.95,
//         base64: true // Get base64 for API
//       });

//       setProgress({ current: 30, total: 100 });
//       setStatus({ message: 'Analyzing face...', type: 'info' });

//       // Send to Next.js API for verification
//       const response = await fetch(`${API_BASE_URL}/api/verify-face`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           image: `data:image/jpeg;base64,${photo.base64}`
//         })
//       });

//       setProgress({ current: 60, total: 100 });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || 'Verification failed');
//       }

//       const result = await response.json();
//       setProgress({ current: 100, total: 100 });

//       if (result.success && result.matched) {
//         // Match found!
//         setVerificationResult({
//           matched: true,
//           student: result.student,
//           confidence: result.confidence,
//           distance: result.distance,
//           matchTime: new Date().toLocaleTimeString(),
//           verificationType: 'Face Recognition'
//         });
//         setStatus({ message: 'Match found!', type: 'success' });
//       } else {
//         // No match
//         setVerificationResult({
//           matched: false,
//           message: result.message || 'No matching student found',
//           bestDistance: result.bestDistance
//         });
//         setStatus({ message: 'No match found', type: 'error' });
//       }

//     } catch (err) {
//       console.error('❌ Face verification error:', err);
//       setErrorMessage(err.message);
//       setStatus({ message: err.message || 'Verification failed', type: 'error' });
//       setVerificationResult({ 
//         matched: false, 
//         message: err.message || 'Verification failed' 
//       });
//     } finally {
//       setIsVerifying(false);
//       setTimeout(() => {
//         setProgress({ current: 0, total: 0 });
//       }, 1000);
//     }
//   };

//   /**
//    * Handle Fingerprint Verification
//    */
//   const handleFingerprintVerification = async () => {
//     if (!FingerprintModule || !scannerAvailable) {
//       Alert.alert(
//         'Scanner Not Available',
//         'Please connect the DigitalPersona scanner via OTG cable.'
//       );
//       return;
//     }

//     setIsVerifying(true);
//     setVerificationResult(null);
//     setProgress({ current: 0, total: 0 });
//     setErrorMessage('');
//     setStatus({ message: 'Place your finger on the scanner...', type: 'info' });

//     try {
//       const captureResult = await FingerprintModule.capturePrint({});

//       if (!captureResult.success) {
//         throw new Error(captureResult.message || 'Scan failed');
//       }

//       if (captureResult.quality && captureResult.quality < 50) {
//         setStatus({ 
//           message: `Quality too low (${captureResult.quality}%). Please try again.`, 
//           type: 'warning' 
//         });
//         setIsVerifying(false);
//         return;
//       }

//       setStatus({ message: 'Fingerprint captured! Verifying...', type: 'info' });
//       await verifyFingerprintWithServer(captureResult.imageData);

//     } catch (error) {
//       setStatus({ message: error.message || 'Verification failed', type: 'error' });
//       setErrorMessage(error.message);
//       setVerificationResult({ 
//         matched: false, 
//         message: 'Error: ' + error.message 
//       });
//     } finally {
//       setIsVerifying(false);
//       if (FingerprintModule?.close) {
//         await FingerprintModule.close();
//       }
//     }
//   };

//   /**
//    * Verify fingerprint with NBIS server
//    */
//   const verifyFingerprintWithServer = async (imageData) => {
//     try {
//       setStatus({ message: 'Sending to server...', type: 'info' });

//       const response = await fetch(`${API_BASE_URL}/api/fingerprint/verify-batch`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           queryImage: imageData
//         })
//       });

//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const result = await response.json();

//       if (result.success && result.matched && result.bestMatch) {
//         setVerificationResult({
//           matched: true,
//           student: result.bestMatch.student,
//           confidence: result.bestMatch.confidence,
//           score: result.bestMatch.score,
//           fingerName: result.bestMatch.fingerName,
//           verificationType: 'Fingerprint (NBIS)'
//         });
//         setStatus({ message: 'Match found!', type: 'success' });
//       } else {
//         setVerificationResult({
//           matched: false,
//           message: `No match found. Best score: ${result.bestMatch?.score || 0}`,
//           totalCompared: result.totalCompared
//         });
//         setStatus({ message: 'No match found', type: 'error' });
//       }
//     } catch (error) {
//       console.error('❌ Verification error:', error);
//       setStatus({ message: error.message || 'Verification failed', type: 'error' });
//       setErrorMessage(error.message);
//       setVerificationResult({ 
//         matched: false, 
//         message: 'Error: ' + error.message 
//       });
//     }
//   };

//   const handleAllowEntry = () => {
//     if (!verificationResult?.student) return;
//     Alert.alert(
//       'Check-in Successful',
//       `${verificationResult.student.firstName} ${verificationResult.student.surname} has been verified and checked in!`,
//       [
//         { text: 'OK', onPress: resetVerification }
//       ]
//     );
//   };

//   const resetVerification = () => {
//     setVerificationResult(null);
//     setVerificationType('');
//     setIsVerifying(false);
//     setErrorMessage('');
//     setStatus({ message: '', type: '' });
//     setProgress({ current: 0, total: 0 });
//   };

//   const getStatusColor = () => {
//     switch (status.type) {
//       case 'success': return '#10B981';
//       case 'error': return '#EF4444';
//       case 'warning': return '#F59E0B';
//       default: return '#3B82F6';
//     }
//   };

//   // Render verification result (SUCCESS)
//   if (verificationResult?.matched) {
//     return (
//       <ScrollView style={styles.container}>
//         <View style={styles.resultCard}>
//           <Text style={styles.successEmoji}>✅</Text>
//           <Text style={styles.successTitle}>Match Found!</Text>
//           <Text style={styles.confidence}>
//             Confidence: {verificationResult.confidence}%
//           </Text>

//           {verificationResult.student.profilePictureUrl && (
//             <Image
//               source={{ uri: verificationResult.student.profilePictureUrl }}
//               style={styles.profileImage}
//             />
//           )}

//           <Text style={styles.studentName}>
//             {verificationResult.student.firstName} {verificationResult.student.middleName} {verificationResult.student.surname}
//           </Text>
//           <Text style={styles.matricNumber}>
//             {verificationResult.student.matricNumber}
//           </Text>

//           <View style={styles.badge}>
//             <Text style={styles.badgeText}>{verificationResult.verificationType}</Text>
//           </View>

//           <View style={styles.detailsCard}>
//             <View style={styles.detailRow}>
//               <Text style={styles.detailLabel}>Level</Text>
//               <Text style={styles.detailValue}>{verificationResult.student.level}</Text>
//             </View>
//             <View style={styles.detailRow}>
//               <Text style={styles.detailLabel}>Department</Text>
//               <Text style={styles.detailValue}>{verificationResult.student.department}</Text>
//             </View>
//             <View style={styles.detailRow}>
//               <Text style={styles.detailLabel}>Course</Text>
//               <Text style={styles.detailValue}>{verificationResult.student.course}</Text>
//             </View>
//           </View>

//           <View style={styles.buttonRow}>
//             <TouchableOpacity style={styles.allowButton} onPress={handleAllowEntry}>
//               <Text style={styles.buttonText}>✓ Allow Entry</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.resetButton} onPress={resetVerification}>
//               <Text style={styles.resetButtonText}>Next Student</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>
//     );
//   }

//   // Render main verification interface
//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>🔐 Student Verification</Text>
//         <Text style={styles.subtitle}>Verify identity using biometric authentication</Text>
//       </View>

//       {errorMessage ? (
//         <View style={styles.errorCard}>
//           <Text style={styles.errorIcon}>⚠️</Text>
//           <Text style={styles.errorText}>{errorMessage}</Text>
//         </View>
//       ) : null}

//       {status.message ? (
//         <View style={[styles.statusCard, { backgroundColor: getStatusColor() + '20' }]}>
//           <Text style={[styles.statusText, { color: getStatusColor() }]}>
//             {status.message}
//           </Text>
//           {isVerifying && <ActivityIndicator color={getStatusColor()} />}
//         </View>
//       ) : null}

//       {progress.total > 0 && isVerifying && (
//         <View style={styles.progressContainer}>
//           <View style={styles.progressBar}>
//             <View style={[styles.progressFill, { width: `${progress.current}%` }]} />
//           </View>
//           <Text style={styles.progressText}>{progress.current}%</Text>
//         </View>
//       )}

//       <View style={styles.methodCard}>
//         <Text style={styles.cardTitle}>Select Verification Method</Text>
        
//         <View style={styles.methodButtons}>
//           <TouchableOpacity
//             style={[
//               styles.methodButton,
//               verificationType === 'Fingerprint' && styles.methodButtonActive
//             ]}
//             onPress={() => setVerificationType('Fingerprint')}
//           >
//             <Text style={styles.methodEmoji}>👆</Text>
//             <Text style={styles.methodLabel}>Fingerprint</Text>
//             {scannerAvailable && (
//               <View style={styles.availableDot} />
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[
//               styles.methodButton,
//               verificationType === 'Face' && styles.methodButtonActive
//             ]}
//             onPress={() => setVerificationType('Face')}
//           >
//             <Text style={styles.methodEmoji}>😊</Text>
//             <Text style={styles.methodLabel}>Face Recognition</Text>
//           </TouchableOpacity>
//         </View>

//         {verificationType === 'Face' && (
//           <View style={styles.cameraContainer}>
//             {cameraPermission ? (
//               <>
//                 <Camera
//                   ref={cameraRef}
//                   style={styles.camera}
//                   type={Camera.Constants.Type.front}
//                 />
//                 <Text style={styles.cameraHint}>
//                   💡 Ensure good lighting and face the camera directly
//                 </Text>
//               </>
//             ) : (
//               <TouchableOpacity 
//                 style={styles.permissionButton}
//                 onPress={requestCameraPermission}
//               >
//                 <Text style={styles.permissionText}>📷 Grant Camera Permission</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {verificationType === 'Fingerprint' && (
//           <View style={styles.instructionsCard}>
//             <Text style={styles.instructionsTitle}>📋 Instructions:</Text>
//             <Text style={styles.instructionText}>1. Ensure finger is clean and dry</Text>
//             <Text style={styles.instructionText}>2. Place finger firmly on scanner</Text>
//             <Text style={styles.instructionText}>3. Do not move until complete</Text>
//             <Text style={styles.instructionText}>4. Use the same finger you registered</Text>
//           </View>
//         )}

//         <TouchableOpacity
//           style={[
//             styles.verifyButton,
//             (!verificationType || isVerifying) && styles.verifyButtonDisabled
//           ]}
//           onPress={verificationType === 'Face' ? handleFaceVerification : handleFingerprintVerification}
//           disabled={!verificationType || isVerifying}
//         >
//           {isVerifying ? (
//             <View style={styles.verifyingContent}>
//               <ActivityIndicator color="#fff" />
//               <Text style={styles.verifyButtonText}>
//                 {verificationType === 'Face' ? 'Verifying face...' : 'Scanning fingerprint...'}
//               </Text>
//             </View>
//           ) : (
//             <Text style={styles.verifyButtonText}>
//               {verificationType === 'Face' ? '📸 Capture & Verify' : '👆 Start Scan'}
//             </Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F3F4F6'
//   },
//   header: {
//     padding: 20,
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB'
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#111827',
//     marginBottom: 5
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#6B7280'
//   },
//   errorCard: {
//     margin: 16,
//     padding: 16,
//     backgroundColor: '#FEE2E2',
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12
//   },
//   errorIcon: {
//     fontSize: 24
//   },
//   errorText: {
//     flex: 1,
//     color: '#DC2626',
//     fontSize: 14
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
//     margin: 16,
//     marginTop: 0
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
//   methodCard: {
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
//   methodButtons: {
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 20
//   },
//   methodButton: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: '#E5E7EB',
//     alignItems: 'center',
//     position: 'relative'
//   },
//   methodButtonActive: {
//     borderColor: '#3B82F6',
//     backgroundColor: '#EFF6FF'
//   },
//   methodEmoji: {
//     fontSize: 40,
//     marginBottom: 8
//   },
//   methodLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151'
//   },
//   availableDot: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: '#10B981'
//   },
//   cameraContainer: {
//     marginBottom: 20
//   },
//   camera: {
//     width: '100%',
//     height: 300,
//     borderRadius: 12,
//     overflow: 'hidden'
//   },
//   cameraHint: {
//     fontSize: 12,
//     color: '#6B7280',
//     textAlign: 'center',
//     marginTop: 8
//   },
//   permissionButton: {
//     height: 300,
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#E5E7EB',
//     borderStyle: 'dashed'
//   },
//   permissionText: {
//     fontSize: 16,
//     color: '#6B7280',
//     fontWeight: '600'
//   },
//   instructionsCard: {
//     backgroundColor: '#F9FAFB',
//     padding: 16,
//     borderRadius: 12,
//     marginBottom: 20
//   },
//   instructionsTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8
//   },
//   instructionText: {
//     fontSize: 13,
//     color: '#6B7280',
//     marginBottom: 4,
//     paddingLeft: 8
//   },
//   verifyButton: {
//     backgroundColor: '#3B82F6',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   verifyButtonDisabled: {
//     backgroundColor: '#9CA3AF'
//   },
//   verifyingContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12
//   },
//   verifyButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600'
//   },
//   resultCard: {
//     margin: 16,
//     padding: 24,
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3
//   },
//   successEmoji: {
//     fontSize: 60,
//     marginBottom: 10
//   },
//   successTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#10B981',
//     marginBottom: 8
//   },
//   confidence: {
//     fontSize: 14,
//     color: '#6B7280',
//     marginBottom: 20
//   },
//   profileImage: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     marginBottom: 16,
//     borderWidth: 4,
//     borderColor: '#10B981'
//   },
//   studentName: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#111827',
//     textAlign: 'center',
//     marginBottom: 4
//   },
//   matricNumber: {
//     fontSize: 16,
//     color: '#3B82F6',
//     fontWeight: '600',
//     marginBottom: 12
//   },
//   badge: {
//     backgroundColor: '#EFF6FF',
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     borderRadius: 20,
//     marginBottom: 20
//   },
//   badgeText: {
//     color: '#3B82F6',
//     fontSize: 12,
//     fontWeight: '600'
//   },
//   detailsCard: {
//     width: '100%',
//     backgroundColor: '#F9FAFB',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 20
//   },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12
//   },
//   detailLabel: {
//     fontSize: 13,
//     color: '#6B7280',
//     fontWeight: '500'
//   },
//   detailValue: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#111827',
//     flex: 1,
//     textAlign: 'right'
//   },
//   buttonRow: {
//     flexDirection: 'row',
//     gap: 12,
//     width: '100%'
//   },
//   allowButton: {
//     flex: 1,
//     backgroundColor: '#10B981',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   resetButton: {
//     flex: 1,
//     backgroundColor: '#E5E7EB',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center'
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600'
//   },
//   resetButtonText: {
//     color: '#374151',
//     fontSize: 16,
//     fontWeight: '600'
//   }
// });

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function OptimizedExamVerification() {
  const router = useRouter();
  const cameraRef = useRef(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Your Next.js API base URL
  const API_BASE_URL = 'https://ftpv.appwrite.network/'; // Update this!

  useEffect(() => {
    loadFaceRecognition();
    
    return () => {
      // Cleanup
    };
  }, []);

  const loadFaceRecognition = async () => {
    try {
      // Check if your Next.js API is available
      const response = await fetch(`${API_BASE_URL}/api/face/health`);
      if (response.ok) {
        setModelsLoaded(true);
        console.log('✅ Face recognition API ready');
        setStatus({ 
          message: 'Face recognition ready', 
          type: 'success' 
        });
      }
    } catch (error) {
      console.error('Face recognition API error:', error);
      setStatus({
        message: 'Face recognition unavailable. Please check API connection.',
        type: 'error'
      });
    }
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return styles.statusSuccess;
      case 'error': return styles.statusError;
      case 'warning': return styles.statusWarning;
      default: return styles.statusInfo;
    }
  };

  const startCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera permission is required for face verification.');
        return;
      }
    }

    setCameraActive(true);
    setErrorMessage('');
    setStatus({ message: '✅ Camera ready - position your face in frame', type: 'success' });
  };

  const stopCamera = () => {
    setCameraActive(false);
    setFaceDetected(false);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const captureFaceImage = async () => {
    if (!cameraRef.current) {
      console.error('❌ Camera ref is null');
      return null;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
        exif: false,
      });

      if (!photo || !photo.base64) {
        throw new Error('Failed to capture image');
      }

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      console.log('📸 Captured image');
      
      return imageData;
    } catch (error) {
      console.error('Capture error:', error);
      return null;
    }
  };

  const handleFaceVerification = async () => {
    if (!cameraActive) {
      await startCamera();
      setStatus({ 
        message: '✅ Camera started. Position your face and click "Capture & Verify"', 
        type: 'success' 
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setErrorMessage('');
    setStatus({ message: 'Capturing face...', type: 'info' });

    const MAX_RETRIES = 2;
    let attempt = 1;

    while (attempt <= MAX_RETRIES) {
      try {
        const capturedImageBase64 = await captureFaceImage();

        if (!capturedImageBase64) {
          throw new Error('Failed to capture image from camera');
        }

        console.log('✅ Image captured successfully');
        setProgress({ current: 20, total: 100 });
        setStatus({ message: 'Analyzing face features...', type: 'info' });

        // Call your Next.js API to extract face descriptor
        const extractResponse = await fetch(`${API_BASE_URL}/api/face/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: capturedImageBase64
          })
        });

        const extractResult = await extractResponse.json();

        if (!extractResult.success) {
          throw new Error(extractResult.message || 'Failed to detect or extract face');
        }

        console.log(`✅ Face detected (confidence: ${extractResult.confidence}%)`);
        setProgress({ current: 40, total: 100 });

        setStatus({ message: 'Loading student database...', type: 'info' });
        
        // Call your existing Next.js API to get students with face descriptors
        const studentsResponse = await fetch(`${API_BASE_URL}/api/students/face-descriptors`);
        const studentsResult = await studentsResponse.json();

        if (!studentsResult.success || studentsResult.data.length === 0) {
          setVerificationResult({
            matched: false,
            message: '⚠️ No registered faces in database. Please register students first.'
          });
          setStatus({ message: 'No registered faces found', type: 'warning' });
          setErrorMessage('Database is empty. Please register student faces first.');
          break;
        }

        const totalStudents = studentsResult.data.length;
        setProgress({ current: 60, total: 100 });
        setStatus({ message: `Comparing against ${totalStudents} registered faces...`, type: 'info' });

        const storedDescriptors = studentsResult.data.map((student) => ({
          ...student,
          descriptor: JSON.parse(student.faceDescriptor),
          matricNumber: student.matricNumber,
          firstName: student.firstName,
          surname: student.surname,
          studentId: student.$id
        }));

        setStatus({ message: 'Finding best match...', type: 'info' });

        // Call your Next.js API to verify face
        const verifyResponse = await fetch(`${API_BASE_URL}/api/face/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputDescriptor: extractResult.descriptor,
            students: storedDescriptors
          })
        });

        const verifyResult = await verifyResponse.json();

        setProgress({ current: 100, total: 100 });

        if (verifyResult.success && verifyResult.matched) {
          setVerificationResult({
            matched: true,
            student: verifyResult.student,
            confidence: verifyResult.confidence,
            distance: verifyResult.distance,
            matchTime: new Date().toLocaleTimeString(),
            verificationType: 'Face Recognition',
            method: 'FaceAPI_Mobile',
          });
          setStatus({ message: 'Identity verified successfully!', type: 'success' });
          stopCamera();
          break;
        } else {
          setVerificationResult({
            matched: false,
            message: verifyResult.message || 'No matching student found',
            bestDistance: verifyResult.bestDistance
          });
          setStatus({ message: 'No match found', type: 'error' });
          break;
        }
      } catch (err) {
        console.error(`❌ Face verification attempt ${attempt}/${MAX_RETRIES} failed:`, err);

        if (attempt < MAX_RETRIES) {
          setStatus({
            message: `Verification error — retrying (${attempt}/${MAX_RETRIES})...`,
            type: 'warning'
          });
          await new Promise(resolve => setTimeout(resolve, 1200));
          attempt++;
          continue;
        }

        setErrorMessage(err.message);
        setStatus({
          message: 'Verification failed after retries. Please try again.',
          type: 'error'
        });
        setVerificationResult({
          matched: false,
          message: err.message
        });
        break;
      }
    }

    setIsVerifying(false);
    setProgress({ current: 0, total: 0 });
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setIsVerifying(false);
    setErrorMessage('');
    setStatus({ message: '', type: '' });
    setProgress({ current: 0, total: 0 });
    stopCamera();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#eef2ff', '#faf5ff', '#fce7f3']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#6366f1" />
            <Text style={styles.title}>Identity Verification</Text>
          </View>
          
          <Text style={styles.subtitle}>
            Fast biometric authentication with face detection
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#dc2626" />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

        {/* Status Message */}
        {status.message ? (
          <View style={[styles.statusContainer, getStatusColor()]}>
            <Ionicons 
              name={
                status.type === 'success' ? 'checkmark-circle' :
                status.type === 'error' ? 'close-circle' :
                status.type === 'warning' ? 'alert-circle' :
                'information-circle'
              } 
              size={20} 
              color={
                status.type === 'success' ? '#059669' :
                status.type === 'error' ? '#dc2626' :
                status.type === 'warning' ? '#d97706' :
                '#2563eb'
              }
            />
            <Text style={styles.statusText}>{status.message}</Text>
            {isVerifying && <ActivityIndicator size="small" color="#6366f1" />}
          </View>
        ) : null}

        {/* Progress Bar */}
        {progress.total > 0 && isVerifying && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Processing...</Text>
              <Text style={styles.progressText}>{progress.current}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progress.current}%` }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <Text style={styles.sectionTitle}>Face Verification</Text>
          
          <View style={styles.cameraWrapper}>
            {cameraActive ? (
              <View style={styles.cameraViewContainer}>
                <CameraView 
                  ref={cameraRef}
                  style={styles.camera}
                  facing={facing}
                >
                  {/* Face Detection Indicator */}
                  <View style={styles.cameraOverlay}>
                    <View style={[
                      styles.faceIndicator,
                      faceDetected ? styles.faceDetectedIndicator : styles.faceNotDetectedIndicator
                    ]}>
                      <Ionicons 
                        name="camera" 
                        size={16} 
                        color="white" 
                      />
                      <Text style={styles.faceIndicatorText}>
                        {faceDetected ? 'Face Detected' : 'No Face'}
                      </Text>
                    </View>
                    
                    {/* Camera Toggle Button */}
                    <TouchableOpacity 
                      style={styles.flipButton}
                      onPress={toggleCameraFacing}
                    >
                      <Ionicons name="camera-reverse" size={32} color="white" />
                    </TouchableOpacity>
                  </View>
                </CameraView>
                
                {isVerifying && (
                  <View style={styles.processingOverlay}>
                    <View style={[
                      styles.processingBar, 
                      { width: `${progress.current}%` }
                    ]} />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera-outline" size={64} color="#9ca3af" />
                <Text style={styles.placeholderText}>
                  Camera will activate when you start verification
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.hint}>
            💡 Position your face in the frame for best results
          </Text>

          {/* Verification Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              isVerifying && styles.verifyButtonDisabled
            ]}
            onPress={handleFaceVerification}
            disabled={isVerifying}
          >
            <LinearGradient
              colors={
                isVerifying
                  ? ['#9ca3af', '#9ca3af']
                  : ['#6366f1', '#8b5cf6']
              }
              style={styles.verifyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isVerifying ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.verifyButtonText}>
                    Verifying face... {progress.current}%
                  </Text>
                </>
              ) : cameraActive ? (
                <>
                  <Ionicons name="camera" size={20} color="white" />
                  <Text style={styles.verifyButtonText}>
                    📸 Capture & Verify Face
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="videocam" size={20} color="white" />
                  <Text style={styles.verifyButtonText}>🎥 Start Camera</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Verification Result */}
        <View style={styles.resultContainer}>
          <Text style={styles.sectionTitle}>Verification Result</Text>
          
          {!verificationResult && !isVerifying ? (
            <View style={styles.noResultContainer}>
              <Ionicons name="shield-checkmark-outline" size={120} color="#d1d5db" />
              <Text style={styles.noResultTitle}>No verification in progress</Text>
              <Text style={styles.noResultSubtitle}>Start camera and verify to see results</Text>
            </View>
          ) : null}

          {verificationResult && !verificationResult.matched ? (
            <View style={styles.noMatchContainer}>
              <View style={styles.noMatchIconContainer}>
                <Ionicons name="close-circle" size={64} color="#dc2626" />
              </View>
              <Text style={styles.noMatchTitle}>No Match Found</Text>
              <Text style={styles.noMatchMessage}>{verificationResult.message}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={resetVerification}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {verificationResult && verificationResult.matched && verificationResult.student ? (
            <View style={styles.successContainer}>
              {/* Large Profile Picture */}
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri: verificationResult.student.profilePictureUrl || 
                         'https://via.placeholder.com/300'
                  }}
                  style={styles.profileImage}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300';
                  }}
                />
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
              </View>

              {/* Student Info */}
              <View style={styles.studentInfoContainer}>
                <Text style={styles.matchTitle}>✓ MATCH FOUND!</Text>

                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>
                    {verificationResult.student.firstName}{' '}
                    {verificationResult.student.middleName}{' '}
                    {verificationResult.student.surname}
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Matric Number</Text>
                  <Text style={[styles.infoValue, styles.matricNumber]}>
                    {verificationResult.student.matricNumber}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.infoCard, styles.halfCard]}>
                    <Text style={styles.infoLabel}>Department</Text>
                    <Text style={styles.infoValueSmall}>
                      {verificationResult.student.department}
                    </Text>
                  </View>

                  <View style={[styles.infoCard, styles.halfCard]}>
                    <Text style={styles.infoLabel}>Level</Text>
                    <Text style={styles.infoValueSmall}>
                      {verificationResult.student.level}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Match Confidence</Text>
                  <View style={styles.confidenceContainer}>
                    <View style={styles.confidenceBarBackground}>
                      <View 
                        style={[
                          styles.confidenceBar, 
                          { width: `${verificationResult.confidence}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.confidenceText}>
                      {verificationResult.confidence}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.verifyAnotherButton}
                onPress={resetVerification}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.verifyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.verifyButtonText}>Verify Another Student</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4b5563',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  statusError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  statusInfo: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  cameraContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  cameraWrapper: {
    marginBottom: 16,
  },
  cameraViewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 16,
  },
  faceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  faceDetectedIndicator: {
    backgroundColor: '#10b981',
  },
  faceNotDetectedIndicator: {
    backgroundColor: '#ef4444',
  },
  faceIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  flipButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 50,
  },
  processingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  processingBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  cameraPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noResultContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  noResultSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  noMatchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMatchIconContainer: {
    width: 128,
    height: 128,
    backgroundColor: '#fee2e2',
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noMatchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  noMatchMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  profileImage: {
    width: 256,
    height: 256,
    borderRadius: 16,
    borderWidth: 8,
    borderColor: '#10b981',
  },
  successBadge: {
    position: 'absolute',
    top: -16,
    right: -16,
    backgroundColor: '#10b981',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  studentInfoContainer: {
    width: '100%',
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#047857',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  matricNumber: {
    fontFamily: 'monospace',
    color: '#6366f1',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    width: '48%',
  },
  infoValueSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#047857',
  },
  verifyAnotherButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  permissionText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});