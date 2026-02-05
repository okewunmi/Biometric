// MOBILE-ONLY FACE RECOGNITION - No Server-Side Processing Needed!

import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as faceapi from '@vladmandic/face-api';

const { width, height } = Dimensions.get("window");

export default function OptimizedExamVerification() {
  const router = useRouter();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("front");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState({ message: "", type: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [localModelsLoaded, setLocalModelsLoaded] = useState(false);

  const API_BASE_URL = "https://ftpv.appwrite.network";
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

  useEffect(() => {
    loadFaceRecognition();
    return () => {
      // Cleanup
    };
  }, []);

  const loadFaceRecognition = async () => {
    try {
      console.log('🔄 Loading face-api.js models on mobile device...');
      setStatus({
        message: "Loading face recognition models...",
        type: "info",
      });

      // Load models directly on the mobile device
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setLocalModelsLoaded(true);
      setModelsLoaded(true);
      console.log('✅ Face recognition models loaded successfully on mobile');
      
      setStatus({
        message: "✅ Face recognition ready - all processing happens locally on your device",
        type: "success",
      });

    } catch (error) {
      console.error('❌ Failed to load face recognition models:', error);
      setStatus({
        message: `Failed to load models: ${error.message}`,
        type: "error",
      });
      setErrorMessage(`Cannot load face recognition models: ${error.message}`);
    }
  };

  const getStatusColor = () => {
    switch (status.type) {
      case "success":
        return styles.statusSuccess;
      case "error":
        return styles.statusError;
      case "warning":
        return styles.statusWarning;
      default:
        return styles.statusInfo;
    }
  };

  const startCamera = async () => {
    console.log("📸 Starting camera...");

    if (!permission?.granted) {
      console.log("⚠️ Camera permission not granted, requesting...");
      const { granted } = await requestPermission();
      console.log("🔐 Permission result:", granted);

      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required for face verification.",
        );
        return;
      }
    }

    setCameraActive(true);
    setErrorMessage("");
    setStatus({
      message: "✅ Camera ready - position your face in frame",
      type: "success",
    });
    console.log("✅ Camera activated");
  };

  const stopCamera = () => {
    setCameraActive(false);
    setFaceDetected(false);
    console.log("📷 Camera stopped");
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    console.log("🔄 Camera toggled to:", facing === "back" ? "front" : "back");
  };

  const captureFaceImage = async () => {
    if (!cameraRef.current) {
      console.error("❌ Camera ref is null");
      return null;
    }

    try {
      console.log("📸 Capturing photo...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
        exif: false,
      });

      if (!photo || !photo.base64) {
        throw new Error("Failed to capture image");
      }

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      console.log("✅ Image captured, size:", imageData.length, "bytes");

      return imageData;
    } catch (error) {
      console.error("❌ Capture error:", error);
      return null;
    }
  };

  const handleFaceVerification = async () => {
    if (!cameraActive) {
      await startCamera();
      setStatus({
        message: '✅ Camera started. Position your face and click "Capture & Verify"',
        type: "success",
      });
      return;
    }

    if (!localModelsLoaded) {
      setErrorMessage('Face recognition models not loaded yet. Please wait...');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setProgress({ current: 0, total: 100 });
    setErrorMessage("");
    setStatus({ message: "Capturing face...", type: "info" });

    try {
      // ==========================================
      // STEP 1: Capture image from camera
      // ==========================================
      const capturedImageBase64 = await captureFaceImage();
      if (!capturedImageBase64) {
        throw new Error("Failed to capture image from camera");
      }

      console.log("✅ Image captured successfully");
      setProgress({ current: 20, total: 100 });
      setStatus({ message: "🔍 Detecting face on your device...", type: "info" });

      // ==========================================
      // STEP 2: Detect face LOCALLY on mobile
      // ==========================================
      const img = await faceapi.bufferToImage(capturedImageBase64);
      
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.3 
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error("No face detected. Please ensure your face is clearly visible and well-lit.");
      }

      const descriptor = Array.from(detection.descriptor);
      const confidence = Math.round(detection.detection.score * 100);

      console.log(`✅ Face detected locally (confidence: ${confidence}%)`);
      setProgress({ current: 50, total: 100 });
      setStatus({ message: "📥 Loading student database from server...", type: "info" });

      // ==========================================
      // STEP 3: Get students from server
      // ==========================================
      console.log(`📡 Fetching students from: ${API_BASE_URL}/api/students/face-descriptors`);

      const studentsResponse = await fetch(
        `${API_BASE_URL}/api/students/face-descriptors`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      console.log("📡 Students API response status:", studentsResponse.status);

      if (!studentsResponse.ok) {
        const errorText = await studentsResponse.text();
        console.error("❌ Students API error:", errorText);
        throw new Error(`Failed to load student database (${studentsResponse.status})`);
      }

      const studentsResult = await studentsResponse.json();
      console.log("✅ Loaded", studentsResult.count || studentsResult.data?.length || 0, "students from database");

      if (!studentsResult.success || !studentsResult.data || studentsResult.data.length === 0) {
        setVerificationResult({
          matched: false,
          message: "⚠️ No registered faces in database. Please register students first.",
        });
        setStatus({ message: "Database is empty", type: "warning" });
        setErrorMessage("No registered student faces found. Please add students first.");
        return;
      }

      const totalStudents = studentsResult.data.length;
      setProgress({ current: 70, total: 100 });
      setStatus({
        message: `🔄 Comparing against ${totalStudents} registered faces...`,
        type: "info",
      });

      // ==========================================
      // STEP 4: Parse stored descriptors
      // ==========================================
      const storedDescriptors = studentsResult.data.map((student) => ({
        ...student,
        descriptor: JSON.parse(student.faceDescriptor),
        matricNumber: student.matricNumber,
        firstName: student.firstName,
        surname: student.surname,
        middleName: student.middleName || '',
        department: student.department || 'N/A',
        level: student.level || 'N/A',
        profilePictureUrl: student.profilePictureUrl || null,
        studentId: student.$id,
      }));

      console.log(`✅ Parsed ${storedDescriptors.length} student face descriptors`);

      // ==========================================
      // STEP 5: Compare LOCALLY using FaceMatcher
      // ==========================================
      setStatus({ message: "🎯 Finding best match...", type: "info" });

      const labeledDescriptors = storedDescriptors.map(student => {
        return new faceapi.LabeledFaceDescriptors(
          student.matricNumber,
          [new Float32Array(student.descriptor)]
        );
      });

      const MATCH_THRESHOLD = 0.6; // Distance threshold (lower = stricter)
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);
      const bestMatch = faceMatcher.findBestMatch(new Float32Array(descriptor));

      setProgress({ current: 100, total: 100 });

      // ==========================================
      // STEP 6: Process match result
      // ==========================================
      if (bestMatch.label !== 'unknown') {
        // ✅ MATCH FOUND!
        const matchedStudent = storedDescriptors.find(
          s => s.matricNumber === bestMatch.label
        );
        const matchConfidence = Math.round((1 - bestMatch.distance) * 100);

        console.log("🎉 MATCH FOUND:", matchedStudent.matricNumber, `(${matchConfidence}% confidence)`);

        setVerificationResult({
          matched: true,
          student: matchedStudent,
          confidence: matchConfidence,
          distance: bestMatch.distance,
          matchTime: new Date().toLocaleTimeString(),
          verificationType: "Face Recognition",
          method: "FaceAPI_Mobile_Local",
        });
        
        setStatus({
          message: "✅ Identity verified successfully!",
          type: "success",
        });
        
        stopCamera();
      } else {
        // ❌ NO MATCH FOUND
        console.log("❌ No match found (best distance:", bestMatch.distance, ")");

        setVerificationResult({
          matched: false,
          message: `No matching student found in database (closest match: ${Math.round((1 - bestMatch.distance) * 100)}%)`,
          bestDistance: bestMatch.distance,
        });
        
        setStatus({ 
          message: "❌ Face not recognized", 
          type: "error" 
        });
      }

    } catch (err) {
      console.error("❌ Face verification failed:", err);
      setErrorMessage(err.message);
      setStatus({
        message: `Verification failed: ${err.message}`,
        type: "error",
      });
      setVerificationResult({
        matched: false,
        message: err.message,
      });
    } finally {
      setIsVerifying(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setIsVerifying(false);
    setErrorMessage("");
    setStatus({ message: "", type: "" });
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
      <View style={styles.centerContainer}>
        <Ionicons name="camera-off" size={64} color="#9ca3af" />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#eef2ff", "#faf5ff", "#fce7f3"]}
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

            {/* Models Status Indicator */}
            <View style={styles.apiStatus}>
              <View
                style={[
                  styles.apiDot,
                  localModelsLoaded ? styles.apiDotOnline : styles.apiDotOffline,
                ]}
              />
              <Text style={styles.apiStatusText}>
                Models: {localModelsLoaded ? "Loaded" : "Loading..."}
              </Text>
              <Text style={styles.apiUrlText}>
                {localModelsLoaded ? "All processing happens locally on device" : "Downloading models..."}
              </Text>
            </View>
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
                  status.type === "success"
                    ? "checkmark-circle"
                    : status.type === "error"
                      ? "close-circle"
                      : status.type === "warning"
                        ? "alert-circle"
                        : "information-circle"
                }
                size={20}
                color={
                  status.type === "success"
                    ? "#059669"
                    : status.type === "error"
                      ? "#dc2626"
                      : status.type === "warning"
                        ? "#d97706"
                        : "#2563eb"
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
                  style={[styles.progressBar, { width: `${progress.current}%` }]}
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
                      <View
                        style={[
                          styles.faceIndicator,
                          faceDetected
                            ? styles.faceDetectedIndicator
                            : styles.faceNotDetectedIndicator,
                        ]}
                      >
                        <Ionicons name="camera" size={16} color="white" />
                        <Text style={styles.faceIndicatorText}>
                          {faceDetected ? "Face Detected" : "Ready to Capture"}
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
                      <View
                        style={[
                          styles.processingBar,
                          { width: `${progress.current}%` },
                        ]}
                      />
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
                (isVerifying || !localModelsLoaded) && styles.verifyButtonDisabled,
              ]}
              onPress={handleFaceVerification}
              disabled={isVerifying || !localModelsLoaded}
            >
              <LinearGradient
                colors={
                  isVerifying || !localModelsLoaded
                    ? ["#9ca3af", "#9ca3af"]
                    : ["#6366f1", "#8b5cf6"]
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
                ) : !localModelsLoaded ? (
                  <>
                    <Ionicons name="cloud-download" size={20} color="white" />
                    <Text style={styles.verifyButtonText}>Loading Models...</Text>
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
                <Ionicons
                  name="shield-checkmark-outline"
                  size={120}
                  color="#d1d5db"
                />
                <Text style={styles.noResultTitle}>
                  No verification in progress
                </Text>
                <Text style={styles.noResultSubtitle}>
                  Start camera and verify to see results
                </Text>
              </View>
            ) : null}

            {verificationResult && !verificationResult.matched ? (
              <View style={styles.noMatchContainer}>
                <View style={styles.noMatchIconContainer}>
                  <Ionicons name="close-circle" size={64} color="#dc2626" />
                </View>
                <Text style={styles.noMatchTitle}>No Match Found</Text>
                <Text style={styles.noMatchMessage}>
                  {verificationResult.message}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={resetVerification}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {verificationResult &&
            verificationResult.matched &&
            verificationResult.student ? (
              <View style={styles.successContainer}>
                {/* Large Profile Picture */}
                <View style={styles.profileImageContainer}>
                  <Image
                    source={{
                      uri:
                        verificationResult.student.profilePictureUrl ||
                        "https://via.placeholder.com/300",
                    }}
                    style={styles.profileImage}
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
                      {verificationResult.student.firstName}{" "}
                      {verificationResult.student.middleName}{" "}
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
                            { width: `${verificationResult.confidence}%` },
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
                    colors={["#6366f1", "#8b5cf6"]}
                    style={styles.verifyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.verifyButtonText}>
                      Verify Another Student
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#4b5563",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 8,
  },
  apiStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  apiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  apiDotOnline: {
    backgroundColor: "#10b981",
  },
  apiDotOffline: {
    backgroundColor: "#ef4444",
  },
  apiStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  apiUrlText: {
    fontSize: 10,
    color: "#9ca3af",
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#fca5a5",
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
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: "#b91c1c",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },
  statusError: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  statusWarning: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  statusInfo: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 4,
  },
  cameraContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  cameraWrapper: {
    marginBottom: 16,
  },
  cameraViewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    padding: 16,
  },
  faceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  faceDetectedIndicator: {
    backgroundColor: "#10b981",
  },
  faceNotDetectedIndicator: {
    backgroundColor: "#6366f1",
  },
  faceIndicatorText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  flipButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 12,
    borderRadius: 50,
  },
  processingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(107, 114, 128, 0.5)",
  },
  processingBar: {
    height: "100%",
    backgroundColor: "#10b981",
  },
  cameraPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: "#1f2937",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  resultContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noResultContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  noResultSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  noMatchContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noMatchIconContainer: {
    width: 128,
    height: 128,
    backgroundColor: "#fee2e2",
    borderRadius: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  noMatchTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 8,
  },
  noMatchMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 24,
  },
  profileImage: {
    width: 256,
    height: 256,
    borderRadius: 16,
    borderWidth: 8,
    borderColor: "#10b981",
  },
  successBadge: {
    position: "absolute",
    top: -16,
    right: -16,
    backgroundColor: "#10b981",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  studentInfoContainer: {
    width: "100%",
  },
  matchTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#047857",
    textAlign: "center",
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  matricNumber: {
    fontFamily: "monospace",
    color: "#6366f1",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfCard: {
    width: "48%",
  },
  infoValueSmall: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 12,
  },
  confidenceBar: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#047857",
  },
  verifyAnotherButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 24,
  },
  permissionText: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 20,
    marginTop: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});