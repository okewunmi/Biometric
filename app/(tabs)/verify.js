import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { searchStudentByFace, verifyStudentFingerprint } from '@/lib/appwrite';
import fingerprintScanner from '@/lib/fingerprint-digitalpersona';

const { width } = Dimensions.get('window');

export default function ExamVerificationInterface() {
  const router = useRouter();
  const cameraRef = useRef(null);

  const [verificationType, setVerificationType] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    return () => {
      fingerprintScanner.stop();
    };
  }, []);

  const startCamera = () => {
    setCameraActive(true);
    setErrorMessage('');
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const captureFaceImage = async () => {
    if (!cameraRef.current) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        base64: true,
      });

      // Optionally resize/compress the image
      const manipResult = await ImageManipulator.manipulate(
        photo.uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      return `data:image/jpeg;base64,${manipResult.base64}`;
    } catch (error) {
      console.error('Error capturing image:', error);
      return null;
    }
  };

  const handleFaceVerification = async () => {
    if (!cameraActive) {
      startCamera();
      return;
    }

    setIsScanning(true);
    setVerificationResult(null);
    setScanProgress(0);
    setErrorMessage('');

    try {
      setScanProgress(20);
      const capturedImageBase64 = await captureFaceImage();
      
      if (!capturedImageBase64) {
        throw new Error('Failed to capture image');
      }

      setScanProgress(40);
      console.log('📸 Image captured, sending to API...');

      const response = await fetch('/api/verify-face-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capturedImageBase64: capturedImageBase64 })
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok?', response.ok);

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      if (!responseText || responseText.trim() === '') {
        throw new Error('API returned empty response. Check server logs.');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('❌ Response was:', responseText);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
      }

      setScanProgress(100);
      console.log('🔍 Search result:', result);

      if (result.success && result.matched) {
        setVerificationResult({
          success: true,
          student: result.student,
          confidence: result.confidence,
          matchTime: result.matchTime,
          verificationType: 'Face Recognition',
          allMatches: result.allMatches
        });
        stopCamera();
      } else {
        setVerificationResult({
          success: false,
          message: result.message || 'No matching student found',
          confidence: result.confidence || 0,
          error: result.error
        });
      }
    } catch (err) {
      console.error('❌ Face verification error:', err);
      setErrorMessage(err.message);
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed',
        confidence: 0
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleFingerprintVerification = async () => {
    setIsScanning(true);
    setVerificationResult(null);
    setScanProgress(0);
    setErrorMessage('');

    try {
      console.log('🔧 Checking fingerprint availability...');
      setScanProgress(10);

      const checkResult = await fingerprintScanner.isAvailable();
      
      if (!checkResult.available) {
        throw new Error(checkResult.error || 'Fingerprint reader not available');
      }

      setScanProgress(20);
      Alert.alert('Fingerprint Required', 'Please use your fingerprint to verify...');

      const result = await verifyStudentFingerprint();

      setScanProgress(100);

      if (result.success && result.matched) {
        setVerificationResult({
          success: true,
          student: result.student,
          confidence: result.confidence,
          matchTime: result.matchTime,
          verificationType: 'Fingerprint (Windows Hello)',
          fingerUsed: result.fingerUsed
        });
      } else {
        setVerificationResult({
          success: false,
          message: result.message || 'No matching student found',
          confidence: 0
        });
      }

    } catch (err) {
      console.error('Fingerprint verification error:', err);
      setErrorMessage(err.message);
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed',
        confidence: 0
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      await fingerprintScanner.stop();
    }
  };

  const handleStartVerification = async () => {
    if (!verificationType) {
      Alert.alert('Selection Required', 'Please select a verification method');
      return;
    }

    if (verificationType === 'Face') {
      await handleFaceVerification();
    } else if (verificationType === 'Fingerprint') {
      await handleFingerprintVerification();
    }
  };

  const handleAllowEntry = () => {
    if (!verificationResult?.student) return;

    const verificationData = {
      studentId: verificationResult.student.$id,
      matricNumber: verificationResult.student.matricNumber,
      verificationMethod: verificationResult.verificationType,
      verificationStatus: 'Success',
      confidenceScore: verificationResult.confidence,
      verificationTime: new Date().toISOString(),
      checkedIn: true
    };

    console.log('Verification logged:', verificationData);
    
    Alert.alert(
      'Entry Allowed',
      `${verificationResult.student.firstName} ${verificationResult.student.surname} has been verified and checked in!`,
      [{ text: 'OK', onPress: resetVerification }]
    );
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType('');
    setIsScanning(false);
    setErrorMessage('');
    stopCamera();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="camera-off" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>No Camera Access</Text>
        <Text style={styles.errorText}>Please enable camera permissions in settings</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/Admin")}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#6366f1" />
              <Text style={styles.headerTitle}>Student Verification</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Verify student identity using biometric authentication
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <View style={styles.errorContent}>
                <Text style={styles.errorCardTitle}>Error</Text>
                <Text style={styles.errorCardText}>{errorMessage}</Text>
              </View>
            </View>
          )}

          {/* Verification Method Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification Method</Text>

            <Text style={styles.label}>Select Verification Method *</Text>
            <View style={styles.methodGrid}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  verificationType === 'Fingerprint' && styles.methodButtonActive
                ]}
                onPress={() => {
                  setVerificationType('Fingerprint');
                  stopCamera();
                }}
              >
                <MaterialCommunityIcons 
                  name="fingerprint" 
                  size={48} 
                  color={verificationType === 'Fingerprint' ? '#6366f1' : '#9ca3af'} 
                />
                <Text style={[
                  styles.methodButtonText,
                  verificationType === 'Fingerprint' && styles.methodButtonTextActive
                ]}>
                  Fingerprint
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  verificationType === 'Face' && styles.methodButtonActivePurple
                ]}
                onPress={() => setVerificationType('Face')}
              >
                <Ionicons 
                  name="happy-outline" 
                  size={48} 
                  color={verificationType === 'Face' ? '#9333ea' : '#9ca3af'} 
                />
                <Text style={[
                  styles.methodButtonText,
                  verificationType === 'Face' && styles.methodButtonTextActivePurple
                ]}>
                  Face Recognition
                </Text>
              </TouchableOpacity>
            </View>

            {/* Camera View */}
            {verificationType === 'Face' && (
              <View style={styles.cameraContainer}>
                {cameraActive ? (
                  <View style={styles.cameraWrapper}>
                    <Camera 
                      ref={cameraRef}
                      style={styles.camera}
                      type={Camera.Constants.Type.front}
                    />
                    {isScanning && (
                      <View style={styles.scanProgressBar}>
                        <View style={[styles.scanProgressFill, { width: `${scanProgress}%` }]} />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <Text style={styles.cameraPlaceholderText}>
                      Camera will activate when you click "Start Verification"
                    </Text>
                  </View>
                )}
                <Text style={styles.cameraHint}>
                  💡 Tip: Ensure good lighting and face the camera directly
                </Text>
              </View>
            )}

            {/* Start Verification Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (isScanning || !verificationType) && styles.verifyButtonDisabled
              ]}
              onPress={handleStartVerification}
              disabled={isScanning || !verificationType}
            >
              <Text style={styles.verifyButtonText}>
                {isScanning 
                  ? `Scanning... ${scanProgress}%` 
                  : cameraActive 
                  ? 'Capture & Verify' 
                  : 'Start Verification'}
              </Text>
            </TouchableOpacity>

            {/* Scanning Status */}
            {isScanning && (
              <View style={styles.scanningCard}>
                <View style={styles.scanningContent}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.scanningText}>
                    {verificationType === 'Fingerprint' 
                      ? 'Verifying fingerprint...' 
                      : 'Searching for matching face...'}
                  </Text>
                </View>
                <Text style={styles.scanningSubtext}>
                  Comparing against registered student database
                </Text>
              </View>
            )}
          </View>

          {/* Verification Result Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification Result</Text>

            {!verificationResult && !isScanning && (
              <View style={styles.emptyResult}>
                <Ionicons name="shield-checkmark-outline" size={128} color="#d1d5db" />
                <Text style={styles.emptyResultTitle}>No verification in progress</Text>
                <Text style={styles.emptyResultText}>Select method and start verification</Text>
              </View>
            )}

            {verificationResult && !verificationResult.success && (
              <View style={styles.failedResult}>
                <View style={styles.failedIcon}>
                  <Ionicons name="close" size={64} color="#ef4444" />
                </View>
                <Text style={styles.failedTitle}>No Match Found</Text>
                <Text style={styles.failedMessage}>{verificationResult.message}</Text>
                {verificationResult.confidence > 0 && (
                  <Text style={styles.failedConfidence}>
                    Confidence: {verificationResult.confidence}%
                  </Text>
                )}
                <TouchableOpacity style={styles.tryAgainButton} onPress={resetVerification}>
                  <Text style={styles.tryAgainButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {verificationResult && verificationResult.success && (
              <View style={styles.successResult}>
                <View style={styles.successBanner}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={24} color="white" />
                  </View>
                  <View style={styles.successInfo}>
                    <Text style={styles.successTitle}>Verification Successful!</Text>
                    <Text style={styles.successConfidence}>
                      Confidence: {verificationResult.confidence}%
                    </Text>
                    {verificationResult.fingerUsed && (
                      <Text style={styles.successFinger}>
                        Matched: {verificationResult.fingerUsed} finger
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.studentCard}>
                  {verificationResult.student.profilePictureUrl ? (
                    <Image
                      source={{ uri: verificationResult.student.profilePictureUrl }}
                      style={styles.studentImage}
                    />
                  ) : (
                    <View style={styles.studentImagePlaceholder}>
                      <Ionicons name="person" size={48} color="#9ca3af" />
                    </View>
                  )}
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {verificationResult.student.firstName} {verificationResult.student.middleName} {verificationResult.student.surname}
                    </Text>
                    <Text style={styles.studentMatric}>
                      {verificationResult.student.matricNumber}
                    </Text>
                    <View style={styles.studentBadges}>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>
                          {verificationResult.student.level} Level
                        </Text>
                      </View>
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>
                          {verificationResult.verificationType}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.studentDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Department</Text>
                    <Text style={styles.detailValue}>
                      {verificationResult.student.department}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Course</Text>
                    <Text style={styles.detailValue}>
                      {verificationResult.student.course}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>
                      {verificationResult.student.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.allowButton} 
                    onPress={handleAllowEntry}
                  >
                    <Text style={styles.allowButtonText}>Allow Entry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.nextButton} 
                    onPress={resetVerification}
                  >
                    <Text style={styles.nextButtonText}>Next Student</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  errorContent: {
    marginLeft: 12,
    flex: 1,
  },
  errorCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 4,
  },
  errorCardText: {
    fontSize: 14,
    color: '#dc2626',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  methodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    padding: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  methodButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  methodButtonActivePurple: {
    borderColor: '#9333ea',
    backgroundColor: '#faf5ff',
  },
  methodButtonText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  methodButtonTextActive: {
    color: '#6366f1',
  },
  methodButtonTextActivePurple: {
    color: '#9333ea',
  },
  cameraContainer: {
    marginBottom: 16,
  },
  cameraWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 4 / 3,
  },
  camera: {
    flex: 1,
  },
  scanProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#374151',
  },
  scanProgressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  cameraPlaceholder: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cameraPlaceholderText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  cameraHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanningCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    marginTop: 16,
  },
  scanningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scanningText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyResult: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyResultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyResultText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  failedResult: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  failedIcon: {
    width: 128,
    height: 128,
    backgroundColor: '#fef2f2',
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  failedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  failedConfidence: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  tryAgainButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  successResult: {
    marginTop: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  successIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#22c55e',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successInfo: {
    marginLeft: 12,
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 4,
  },
  successConfidence: {
    fontSize: 14,
    color: '#16a34a',
  },
  successFinger: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 2,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  studentImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  studentImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  studentInfo: {
    marginLeft: 16,
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentMatric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 8,
  },
  studentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  levelBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  methodBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  studentDetails: {
    marginBottom: 16,
  },
  detailItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allowButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  allowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    padding: 14,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});