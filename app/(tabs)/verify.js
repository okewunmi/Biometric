import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { Camera } from 'expo-camera';
import { NativeModules, NativeEventEmitter } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { FingerprintModule } = NativeModules;
const fingerprintEmitter = FingerprintModule ? new NativeEventEmitter(FingerprintModule) : null;

const { width } = Dimensions.get('window');

// ⚠️ IMPORTANT: Replace with your actual server URL
const API_BASE_URL = 'https://ftpv.appwrite.network/';

// // Import face-api.js for React Native
// // You need to install: npm install @tensorflow/tfjs @tensorflow/tfjs-react-native @vladmandic/face-api
// import * as faceapi from '@vladmandic/face-api';
// import * as tf from '@tensorflow/tfjs';
// import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceapi from '@vladmandic/face-api';

export default function ExamVerificationScreen() {
  const [verificationType, setVerificationType] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [scannerAvailable, setScannerAvailable] = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  
  const cameraRef = useRef(null);

  useEffect(() => {
    checkFingerprintScanner();
    initializeFaceAPI();
    
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

  /**
   * Initialize TensorFlow.js and load face-api.js models
   */
 const initializeFaceAPI = async () => {
  try {
    console.log('🔧 Initializing TensorFlow.js...');
    
    // Set WebGL backend
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('✅ TensorFlow.js ready with WebGL backend');

    console.log('📦 Loading face-api.js models...');
    
    // Load models from your app's assets folder
    // Make sure you have the models in: assets/models/
    const modelPath = FileSystem.documentDirectory + 'models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
    ]);

    setFaceModelsLoaded(true);
    console.log('✅ Face models loaded successfully');
    setStatus({ message: 'Face recognition ready', type: 'success' });

  } catch (error) {
    console.error('❌ Error loading face models:', error);
    setStatus({ 
      message: 'Face models failed to load. Using server-side processing.', 
      type: 'warning' 
    });
  }
};

  /**
   * Extract face descriptor from image (client-side)
   */
  const extractFaceDescriptor = async (imageUri) => {
  try {
    console.log('🔍 Extracting face descriptor...');

    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create image element for face-api.js
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Detect face and extract descriptor
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        error: 'NO_FACE_DETECTED',
        message: 'No face detected. Please ensure good lighting and face the camera.'
      };
    }

    const confidence = Math.round(detection.detection.score * 100);
    console.log(`✅ Face detected with ${confidence}% confidence`);

    return {
      success: true,
      descriptor: Array.from(detection.descriptor),
      confidence: confidence
    };

  } catch (error) {
    console.error('❌ Error extracting descriptor:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to process face'
    };
  }
};

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
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    return status === 'granted';
  };

  /**
   * Handle Face Verification with CLIENT-SIDE descriptor extraction
   */
  const handleFaceVerification = async () => {
    // Check camera permission
    if (!cameraPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera access is required for face verification');
        return;
      }
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setErrorMessage('');
    setStatus({ message: 'Preparing camera...', type: 'info' });

    try {
      // Capture photo from camera
      if (!cameraRef.current) {
        throw new Error('Camera not ready');
      }

      setStatus({ message: 'Capturing face...', type: 'info' });
      setProgress({ current: 10, total: 100 });

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        base64: false // Don't need base64 if processing locally
      });

      setProgress({ current: 30, total: 100 });

      // Try client-side extraction first (faster)
      if (faceModelsLoaded) {
        setStatus({ message: 'Analyzing face locally...', type: 'info' });
        
        const extractResult = await extractFaceDescriptor(photo.uri);
        
        if (extractResult.success) {
          setProgress({ current: 60, total: 100 });
          setStatus({ message: 'Verifying with database...', type: 'info' });

          // Send only the descriptor (128 numbers) to server
          const response = await fetch(`${API_BASE_URL}/api/verify-face`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              descriptor: extractResult.descriptor,
              confidence: extractResult.confidence
            })
          });

          const result = await response.json();
          setProgress({ current: 100, total: 100 });

          handleVerificationResult(result);
          return;
        } else {
          console.log('⚠️ Client-side extraction failed, falling back to server');
        }
      }

      // Fallback: Send full image to server (if models not loaded or extraction failed)
      setStatus({ message: 'Sending to server for analysis...', type: 'info' });
      setProgress({ current: 40, total: 100 });

      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`${API_BASE_URL}/api/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64}`
        })
      });

      setProgress({ current: 90, total: 100 });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const result = await response.json();
      setProgress({ current: 100, total: 100 });

      handleVerificationResult(result);

    } catch (err) {
      console.error('❌ Face verification error:', err);
      setErrorMessage(err.message);
      setStatus({ message: err.message || 'Verification failed', type: 'error' });
      setVerificationResult({ 
        matched: false, 
        message: err.message || 'Verification failed' 
      });
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        setProgress({ current: 0, total: 0 });
      }, 1000);
    }
  };

  /**
   * Handle verification result from server
   */
  const handleVerificationResult = (result) => {
    if (result.success && result.matched) {
      // Match found!
      setVerificationResult({
        matched: true,
        student: result.student,
        confidence: result.confidence,
        distance: result.distance,
        matchTime: new Date().toLocaleTimeString(),
        verificationType: 'Face Recognition'
      });
      setStatus({ message: 'Match found!', type: 'success' });
    } else {
      // No match
      setVerificationResult({
        matched: false,
        message: result.message || 'No matching student found',
        bestDistance: result.bestDistance
      });
      setStatus({ message: 'No match found', type: 'error' });
    }
  };

  /**
   * Handle Fingerprint Verification
   */
  const handleFingerprintVerification = async () => {
    if (!FingerprintModule || !scannerAvailable) {
      Alert.alert(
        'Scanner Not Available',
        'Please connect the DigitalPersona scanner via OTG cable.'
      );
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 0 });
    setErrorMessage('');
    setStatus({ message: 'Place your finger on the scanner...', type: 'info' });

    try {
      const captureResult = await FingerprintModule.capturePrint({});

      if (!captureResult.success) {
        throw new Error(captureResult.message || 'Scan failed');
      }

      if (captureResult.quality && captureResult.quality < 50) {
        setStatus({ 
          message: `Quality too low (${captureResult.quality}%). Please try again.`, 
          type: 'warning' 
        });
        setIsVerifying(false);
        return;
      }

      setStatus({ message: 'Fingerprint captured! Verifying...', type: 'info' });
      await verifyFingerprintWithServer(captureResult.imageData);

    } catch (error) {
      setStatus({ message: error.message || 'Verification failed', type: 'error' });
      setErrorMessage(error.message);
      setVerificationResult({ 
        matched: false, 
        message: 'Error: ' + error.message 
      });
    } finally {
      setIsVerifying(false);
      if (FingerprintModule?.close) {
        await FingerprintModule.close();
      }
    }
  };

  /**
   * Verify fingerprint with NBIS server
   */
  const verifyFingerprintWithServer = async (imageData) => {
    try {
      setStatus({ message: 'Sending to server...', type: 'info' });

      const response = await fetch(`${API_BASE_URL}/api/fingerprint/verify-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryImage: imageData
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.matched && result.bestMatch) {
        setVerificationResult({
          matched: true,
          student: result.bestMatch.student,
          confidence: result.bestMatch.confidence,
          score: result.bestMatch.score,
          fingerName: result.bestMatch.fingerName,
          verificationType: 'Fingerprint (NBIS)'
        });
        setStatus({ message: 'Match found!', type: 'success' });
      } else {
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
      setErrorMessage(error.message);
      setVerificationResult({ 
        matched: false, 
        message: 'Error: ' + error.message 
      });
    }
  };

  const handleAllowEntry = () => {
    if (!verificationResult?.student) return;
    Alert.alert(
      'Check-in Successful',
      `${verificationResult.student.firstName} ${verificationResult.student.surname} has been verified and checked in!`,
      [
        { text: 'OK', onPress: resetVerification }
      ]
    );
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerificationType('');
    setIsVerifying(false);
    setErrorMessage('');
    setStatus({ message: '', type: '' });
    setProgress({ current: 0, total: 0 });
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  // Render verification result (SUCCESS)
  if (verificationResult?.matched) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Match Found!</Text>
          <Text style={styles.confidence}>
            Confidence: {verificationResult.confidence}%
          </Text>

          {verificationResult.student.profilePictureUrl && (
            <Image
              source={{ uri: verificationResult.student.profilePictureUrl }}
              style={styles.profileImage}
            />
          )}

          <Text style={styles.studentName}>
            {verificationResult.student.firstName} {verificationResult.student.middleName} {verificationResult.student.surname}
          </Text>
          <Text style={styles.matricNumber}>
            {verificationResult.student.matricNumber}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{verificationResult.verificationType}</Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Level</Text>
              <Text style={styles.detailValue}>{verificationResult.student.level}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{verificationResult.student.department}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Course</Text>
              <Text style={styles.detailValue}>{verificationResult.student.course}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.allowButton} onPress={handleAllowEntry}>
              <Text style={styles.buttonText}>✓ Allow Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={resetVerification}>
              <Text style={styles.resetButtonText}>Next Student</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render main verification interface
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Student Verification</Text>
        <Text style={styles.subtitle}>Verify identity using biometric authentication</Text>
        {faceModelsLoaded && (
          <Text style={styles.modelStatus}>✓ Face models loaded (fast mode)</Text>
        )}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {status.message ? (
        <View style={[styles.statusCard, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {status.message}
          </Text>
          {isVerifying && <ActivityIndicator color={getStatusColor()} />}
        </View>
      ) : null}

      {progress.total > 0 && isVerifying && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress.current}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.current}%</Text>
        </View>
      )}

      <View style={styles.methodCard}>
        <Text style={styles.cardTitle}>Select Verification Method</Text>
        
        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              verificationType === 'Fingerprint' && styles.methodButtonActive
            ]}
            onPress={() => setVerificationType('Fingerprint')}
          >
            <Text style={styles.methodEmoji}>👆</Text>
            <Text style={styles.methodLabel}>Fingerprint</Text>
            {scannerAvailable && (
              <View style={styles.availableDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              verificationType === 'Face' && styles.methodButtonActive
            ]}
            onPress={() => setVerificationType('Face')}
          >
            <Text style={styles.methodEmoji}>😊</Text>
            <Text style={styles.methodLabel}>Face Recognition</Text>
            {faceModelsLoaded && (
              <View style={styles.availableDot} />
            )}
          </TouchableOpacity>
        </View>

        {verificationType === 'Face' && (
          <View style={styles.cameraContainer}>
            {cameraPermission ? (
              <>
                <Camera
                  ref={cameraRef}
                  style={styles.camera}
                  type={Camera.Constants.Type.front}
                />
                <Text style={styles.cameraHint}>
                  💡 Ensure good lighting and face the camera directly
                </Text>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestCameraPermission}
              >
                <Text style={styles.permissionText}>📷 Grant Camera Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {verificationType === 'Fingerprint' && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Instructions:</Text>
            <Text style={styles.instructionText}>1. Ensure finger is clean and dry</Text>
            <Text style={styles.instructionText}>2. Place finger firmly on scanner</Text>
            <Text style={styles.instructionText}>3. Do not move until complete</Text>
            <Text style={styles.instructionText}>4. Use the same finger you registered</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!verificationType || isVerifying) && styles.verifyButtonDisabled
          ]}
          onPress={verificationType === 'Face' ? handleFaceVerification : handleFingerprintVerification}
          disabled={!verificationType || isVerifying}
        >
          {isVerifying ? (
            <View style={styles.verifyingContent}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.verifyButtonText}>
                {verificationType === 'Face' ? 'Verifying face...' : 'Scanning fingerprint...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.verifyButtonText}>
              {verificationType === 'Face' ? '📸 Capture & Verify' : '👆 Start Scan'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  modelStatus: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '600'
  },
  errorCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  errorIcon: {
    fontSize: 24
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14
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
    margin: 16,
    marginTop: 0
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
  methodCard: {
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
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  methodButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative'
  },
  methodButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF'
  },
  methodEmoji: {
    fontSize: 40,
    marginBottom: 8
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  availableDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981'
  },
  cameraContainer: {
    marginBottom: 20
  },
  camera: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden'
  },
  cameraHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8
  },
  permissionButton: {
    height: 300,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed'
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600'
  },
  instructionsCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
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
    marginBottom: 4,
    paddingLeft: 8
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  verifyingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  resultCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 10
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8
  },
  confidence: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#10B981'
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4
  },
  matricNumber: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 12
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600'
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right'
  }
});