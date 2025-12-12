import {
  createStudent,
  deleteStudent,
  generateDepartmentCode,
  getAllStudents,
  getStudentStats,
  getStudentsWithFingerprintsPNG,
  saveFingerprintsPNG,
  updateStudent
} from '@/lib/appwrite';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeEventEmitter,
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

const { FingerprintModule } = NativeModules;
const fingerprintEmitter = FingerprintModule ? new NativeEventEmitter(FingerprintModule) : null;

// ⚠️ IMPORTANT: Replace with your actual server URL
const API_BASE_URL = 'https://ftpv.appwrite.network';

export default function StudentManagement() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showFilterDeptPicker, setShowFilterDeptPicker] = useState(false);
  const [showFilterLevelPicker, setShowFilterLevelPicker] = useState(false);
  
  // Fingerprint capture states
  const [currentFingerIndex, setCurrentFingerIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFingers, setCapturedFingers] = useState({});
  const [captureStatus, setCaptureStatus] = useState(null);
  const scannerInitializedRef = useRef(false);
  const [scannerStatus, setScannerStatus] = useState({ ready: false, message: null, type: null });
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const fingers = [
    { id: 'thumb', label: 'Thumb', icon: '👍', field: 'thumbTemplate' },
    { id: 'index', label: 'Index Finger', icon: '☝️', field: 'indexTemplate' },
    { id: 'middle', label: 'Middle Finger', icon: '🖕', field: 'middleTemplate' },
    { id: 'ring', label: 'Ring Finger', icon: '💍', field: 'ringTemplate' },
    { id: 'pinky', label: 'Pinky Finger', icon: '🤙', field: 'pinkyTemplate' }
  ];

  const [formData, setFormData] = useState({
    surname: '',
    firstName: '',
    middleName: '',
    age: '',
    phoneNumber: '',
    email: '',
    department: '',
    course: '',
    level: '',
    profilePicture: null
  });

  const departments = [
    'Engineering',
    // 'Social Science',
    // 'Education',
    // 'Environmetal',
  ];

  const courses = [
    'Electrical Electronics Engineering',
    // 'Social Science',
    // 'Education',
    // 'Environmetal',
  ];

  const levels = ['100', '200', '300', '400', '500'];

  useEffect(() => {
    fetchStudents();
    fetchStats();
    
    // Setup fingerprint event listeners
    if (fingerprintEmitter) {
      const listeners = [
        fingerprintEmitter.addListener('onScanStarted', () => {
          setCaptureStatus({ type: 'info', message: 'Place finger on scanner...' });
        }),
        
        fingerprintEmitter.addListener('onScanComplete', async (data) => {
          console.log('✅ Scan complete, received data');
          await handleScanComplete(data);
        }),
        
        fingerprintEmitter.addListener('onScanError', (error) => {
          setCaptureStatus({ type: 'error', message: `Error: ${error.error}` });
          setIsCapturing(false);
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

  const fetchStudents = async () => {
    setLoading(true);
    const result = await getAllStudents();
    if (result.success) {
      setStudents(result.data);
    } else {
      showNotification('Error loading students: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getStudentStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        showNotification('Permission to access camera roll is required!', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showNotification('File size must be less than 5MB', 'error');
          return;
        }

        setFormData({ ...formData, profilePicture: asset });
        setProfilePreview(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showNotification('Failed to pick image: ' + error.message, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!formData.surname || !formData.firstName || !formData.middleName || 
        !formData.email || !formData.course || !formData.age || 
        !formData.phoneNumber || !formData.department || !formData.level) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);

    try {
      if (editMode) {
        const result = await updateStudent(
          selectedStudent.$id,
          {
            surname: formData.surname,
            firstName: formData.firstName,
            middleName: formData.middleName,
            age: parseInt(formData.age),
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            department: formData.department,
            course: formData.course,
            level: formData.level
          },
          formData.profilePicture?.uri ? formData.profilePicture : null
        );

        if (result.success) {
          showNotification('Student updated successfully!', 'success');
          fetchStudents();
          fetchStats();
        } else {
          showNotification('Error updating student: ' + result.error, 'error');
        }
      } else {
        const result = await createStudent(
          formData,
          formData.profilePicture?.uri ? formData.profilePicture : null
        );

        if (result.success) {
          const message = result.emailSent 
            ? `Student created! Matric: ${result.matricNumber}. Welcome email sent to ${formData.email}`
            : `Student created! Matric: ${result.matricNumber}. ⚠️ Email not sent - please notify student manually.`;
          
          showNotification(message, result.emailSent ? 'success' : 'warning');
          fetchStudents();
          fetchStats();
        } else {
          showNotification('Error creating student: ' + result.error, 'error');
        }
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      surname: student.surname,
      firstName: student.firstName,
      middleName: student.middleName,
      age: student.age.toString(),
      phoneNumber: student.phoneNumber,
      email: student.email,
      department: student.department,
      course: student.course,
      level: student.level,
      profilePicture: student.profilePictureUrl
    });
    setProfilePreview(student.profilePictureUrl);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = (student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.firstName} ${student.surname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteStudent(student.$id);
            if (result.success) {
              showNotification('Student deleted successfully!', 'success');
              fetchStudents();
              fetchStats();
            } else {
              showNotification('Error deleting student: ' + result.error, 'error');
            }
          }
        }
      ]
    );
  };

 const openFingerprintModal = async (student) => {
  setSelectedStudent(student);
  setShowFingerprintModal(true);
  setCurrentFingerIndex(0);
  setCapturedFingers({});
  setCaptureStatus(null);
  
  // Reset scanner status to loading state
  setScannerStatus({ ready: false, message: 'Initializing scanner...', type: 'info' });

  // Check if FingerprintModule is available
  if (!FingerprintModule) {
    setScannerStatus({ 
      ready: false, 
      message: 'Fingerprint scanner module not available. Please ensure native module is properly installed.', 
      type: 'error' 
    });
    return;
  }

  try {
    // Always check availability when opening modal (don't trust cached state)
    console.log('🔍 Checking scanner availability...');
    const availability = await FingerprintModule.isAvailable();
    
    if (!availability.available) {
      setScannerStatus({ 
        ready: false, 
        message: 'Scanner not connected. Please connect DigitalPersona scanner via OTG.', 
        type: 'error' 
      });
      return;
    }

    // Initialize scanner (even if previously initialized, reinitialize for safety)
    console.log('🔧 Initializing scanner...');
    const initResult = await FingerprintModule.initialize();
    
    if (initResult.success) {
      scannerInitializedRef.current = true;
      setScannerStatus({ 
        ready: true, 
        message: 'Scanner ready! Click "Capture" to begin.', 
        type: 'success' 
      });
      console.log('✅ Scanner initialized successfully');
    } else {
      scannerInitializedRef.current = false;
      setScannerStatus({ 
        ready: false, 
        message: initResult.message || 'Failed to initialize scanner. Please try reconnecting the device.', 
        type: 'error' 
      });
      console.error('❌ Scanner initialization failed:', initResult.message);
    }
  } catch (error) {
    console.error('❌ Scanner initialization error:', error);
    scannerInitializedRef.current = false;
    setScannerStatus({ 
      ready: false, 
      message: `Error: ${error.message}. Please reconnect the scanner and try again.`, 
      type: 'error' 
    });
  }
};

  const handleCaptureFinger = async () => {
    if (!scannerStatus.ready) {
      setCaptureStatus({ type: 'error', message: scannerStatus.message || 'Scanner not initialized.' });
      return;
    }

    if (!FingerprintModule) {
      setCaptureStatus({ type: 'error', message: 'Fingerprint module not available' });
      return;
    }

    setIsCapturing(true);
    setCaptureStatus({ type: 'info', message: 'Place finger on scanner...' });

    try {
      const currentFinger = fingers[currentFingerIndex];
      console.log(`\n🔍 Capturing ${currentFinger.label}...`);

      // Start fingerprint capture
      const captureResult = await FingerprintModule.capturePrint({
        fingerName: currentFinger.label
      });

      if (!captureResult.success) {
        throw new Error(captureResult.message || 'Scan failed');
      }

      // The actual processing will happen in handleScanComplete
      // which is triggered by the native event listener

    } catch (error) {
      console.error('❌ Capture error:', error);
      setCaptureStatus({ 
        type: 'error', 
        message: error.message || 'Capture failed. Please try again.' 
      });
      setIsCapturing(false);
      setCheckingDuplicates(false);
    }
  };

  const handleScanComplete = async (data) => {
    try {
      const currentFinger = fingers[currentFingerIndex];
      
      console.log('✅ Captured successfully');
      console.log('📊 Quality:', data.quality + '%');
      console.log('📏 Size:', data.imageData?.length || 0, 'bytes');

      // Quality check
      if (data.quality < 50) {
        setCaptureStatus({ 
          type: 'warning', 
          message: `Quality too low (${data.quality}%). Please clean your finger and try again.` 
        });
        setIsCapturing(false);
        return;
      }

      // ===== STEP 2: Check for duplicates (OPTIMIZED) =====
      setCheckingDuplicates(true);
      setCaptureStatus({ type: 'info', message: 'Checking for duplicates...' });
      
      console.log('🔍 Starting duplicate check...');

      // Get all stored fingerprints
      const storedFingerprints = await getStudentsWithFingerprintsPNG();
      
      if (storedFingerprints.success && storedFingerprints.data.length > 0) {
        console.log(`📊 Checking against ${storedFingerprints.data.length} stored fingerprints...`);
        
        // 🚀 USE BATCH COMPARISON (MUCH FASTER!)
        const response = await fetch(`${API_BASE_URL}/api/fingerprint/verify-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryImage: data.imageData,
            database: storedFingerprints.data.map(fp => ({
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
        
        const batchResult = await response.json();
        
        if (batchResult.success && batchResult.matched) {
          const match = batchResult.bestMatch;
          
          // Check if it's the SAME student (OK) or DIFFERENT student (DUPLICATE)
          if (match.studentId !== selectedStudent.$id) {
            console.error('❌ DUPLICATE DETECTED!');
            setCheckingDuplicates(false);
            setCaptureStatus({ 
              type: 'error', 
              message: `⚠️ DUPLICATE! This fingerprint is already registered to ${match.studentName}` 
            });
            setIsCapturing(false);
            return;
          }
          
          console.log('✓ Same student - checking if same finger slot...');
        }
      }

      setCheckingDuplicates(false);

      // ===== STEP 3: Check current session duplicates =====
      console.log('🔍 Checking session duplicates...');
      
      const sessionFingers = Object.entries(capturedFingers).filter(
        ([fingerId, fingerData]) => fingerId !== currentFinger.id && fingerData?.imageData
      );
      
      if (sessionFingers.length > 0) {
        const sessionResponse = await fetch(`${API_BASE_URL}/api/fingerprint/verify-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryImage: data.imageData,
            database: sessionFingers.map(([fingerId, fingerData]) => ({
              id: fingerId,
              fingerName: fingers.find(f => f.id === fingerId)?.label,
              imageData: fingerData.imageData
            }))
          })
        });
        
        const sessionResult = await sessionResponse.json();
        
        if (sessionResult.success && sessionResult.matched) {
          setCaptureStatus({ 
            type: 'error', 
            message: `⚠️ DUPLICATE! You already captured this finger as "${sessionResult.bestMatch.fingerName}". Please use a different finger.` 
          });
          setIsCapturing(false);
          return;
        }
      }

      // ===== STEP 4: Check if slot already used =====
      if (capturedFingers[currentFinger.id]) {
        setCaptureStatus({ 
          type: 'error', 
          message: `This finger slot (${currentFinger.label}) has already been captured. Please move to the next slot.` 
        });
        setIsCapturing(false);
        return;
      }

      console.log('✅ Fingerprint is unique - accepting');
      
      // ===== STEP 5: Save fingerprint =====
      const newCapturedFingers = {
        ...capturedFingers,
        [currentFinger.id]: {
          imageData: data.imageData,
          quality: data.quality,
          capturedAt: new Date().toISOString()
        }
      };
      
      setCapturedFingers(newCapturedFingers);

      setCaptureStatus({ 
        type: 'success', 
        message: `✅ ${currentFinger.label} captured successfully! (Quality: ${data.quality}%)` 
      });
      
      const nextIndex = currentFingerIndex + 1;
      const isLastFinger = nextIndex >= fingers.length;
      
      setTimeout(() => {
        if (isLastFinger) {
          console.log('🎉 All 5 fingers captured! Saving to storage...');
          saveFingerprintsPNGToStorage(newCapturedFingers);
        } else {
          setCurrentFingerIndex(nextIndex);
          setCaptureStatus({ type: 'info', message: 'Ready for next finger...' });
        }
        setIsCapturing(false);
      }, 1500);

    } catch (error) {
      console.error('❌ Processing error:', error);
      setCaptureStatus({ 
        type: 'error', 
        message: error.message || 'Processing failed. Please try again.' 
      });
      setIsCapturing(false);
      setCheckingDuplicates(false);
    }
  };

  const saveFingerprintsPNGToStorage = async (fingersData = null) => {
    setCaptureStatus({ type: 'info', message: 'Saving fingerprints to storage...' });
    
    try {
      const dataToSave = fingersData || capturedFingers;
      
      console.log('💾 Preparing to save fingerprints');
      
      const fingerprintData = {
        thumb: dataToSave.thumb?.imageData || '',
        index: dataToSave.index?.imageData || '',
        middle: dataToSave.middle?.imageData || '',
        ring: dataToSave.ring?.imageData || '',
        pinky: dataToSave.pinky?.imageData || ''
      };

      const result = await saveFingerprintsPNG(selectedStudent.$id, fingerprintData);

      if (result.success) {
        console.log('✅ Fingerprints saved successfully');
        showNotification('All fingerprints saved to storage successfully!', 'success');
        fetchStudents();
        fetchStats();
        
        setTimeout(() => {
          closeFingerprintModal();
        }, 2000);
      } else {
        console.error('❌ Failed to save:', result.error);
        showNotification('Error saving fingerprints: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
      console.error('❌ Error in saveFingerprintsPNGToStorage:', error);
    }
  };

  const closeFingerprintModal = async () => {
    scannerInitializedRef.current = false;
    
    if (FingerprintModule?.close) {
      await FingerprintModule.close();
    }

    setShowFingerprintModal(false);
    setCurrentFingerIndex(0);
    setCapturedFingers({});
    setCaptureStatus(null);
    setSelectedStudent(null);
  };

  const resetForm = () => {
    setFormData({
      surname: '',
      firstName: '',
      middleName: '',
      age: '',
      phoneNumber: '',
      email: '',
      department: '',
      course: '',
      level: '',
      profilePicture: null
    });
    setProfilePreview(null);
    setEditMode(false);
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.matricNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !filterDepartment || student.department === filterDepartment;
    const matchesLevel = !filterLevel || student.level === filterLevel;

    return matchesSearch && matchesDepartment && matchesLevel;
  });

  const capturedCount = Object.keys(capturedFingers).length;
  const captureProgress = (capturedCount / 5) * 100;

  const PickerModal = ({ visible, onClose, title, data, onSelect, selectedValue }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerModalList}>
            {data.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.pickerModalItem,
                  selectedValue === item && styles.pickerModalItemSelected
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[
                  styles.pickerModalItemText,
                  selectedValue === item && styles.pickerModalItemTextSelected
                ]}>
                  {item}
                </Text>
                {selectedValue === item && (
                  <Ionicons name="checkmark" size={20} color="#6366f1" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {notification && (
        <View style={[
          styles.notification,
          notification.type === 'success' ? styles.notificationSuccess : 
          notification.type === 'warning' ? styles.notificationWarning :
          styles.notificationError
        ]}>
          <Ionicons 
            name={
              notification.type === 'success' ? 'checkmark-circle' : 
              notification.type === 'warning' ? 'warning' :
              'alert-circle'
            } 
            size={20} 
            color="white" 
          />
          <Text style={styles.notificationText} numberOfLines={3}>{notification.message}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="people-outline" size={32} color="#6366f1" />
                <Text style={styles.headerTitle}>Student Management</Text>
              </View>
              <Text style={styles.headerSubtitle}>Manage student records and biometric data</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Add Student</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="people-outline" size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Students</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.statLabel}>Verified</Text>
                <Text style={styles.statValue}>{stats.verified}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#fed7aa' }]}>
                <Ionicons name="alert-circle-outline" size={24} color="#ea580c" />
              </View>
              <View>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>{stats.pending}</Text>
              </View>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersCard}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by matric, name, or email..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={styles.filterDropdown}
                onPress={() => setShowFilterDeptPicker(true)}
              >
                <Text style={filterDepartment ? styles.filterText : styles.filterPlaceholder}>
                  {filterDepartment || 'All Departments'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterDropdown}
                onPress={() => setShowFilterLevelPicker(true)}
              >
                <Text style={filterLevel ? styles.filterText : styles.filterPlaceholder}>
                  {filterLevel ? `${filterLevel} Level` : 'All Levels'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Students List */}
          <View style={styles.studentsCard}>
            {filteredStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No students found</Text>
                <Text style={styles.emptyStateText}>Try adjusting your search or filters</Text>
              </View>
            ) : (
              filteredStudents.map((student) => (
                <View key={student.$id} style={styles.studentItem}>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentInfo}>
                      <Image
                        source={{ 
                          uri: student.profilePictureUrl && student.profilePictureUrl.trim() !== '' 
                            ? student.profilePictureUrl 
                            : 'https://via.placeholder.com/40'
                        }}
                        style={styles.studentAvatar}
                      />
                      <View style={styles.studentDetails}>
                        <Text style={styles.studentName}>
                          {student.firstName} {student.surname}
                        </Text>
                        <Text style={styles.studentMiddleName}>{student.middleName}</Text>
                        <Text style={styles.studentMatric}>{student.matricNumber}</Text>
                      </View>
                    </View>
                    
                    {student.fingerprintsCaptured ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.studentContact}>
                    <Text style={styles.studentContactText}>{student.email}</Text>
                    <Text style={styles.studentContactText}>{student.phoneNumber}</Text>
                  </View>

                  <View style={styles.studentMeta}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{student.department}</Text>
                    </View>
                    <View style={[styles.metaBadge, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={[styles.metaBadgeText, { color: '#9333ea' }]}>
                        {student.level}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentActions}>
                    {!student.fingerprintsCaptured && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openFingerprintModal(student)}
                      >
                        <MaterialCommunityIcons name="fingerprint" size={20} color="#9333ea" />
                        <Text style={styles.actionButtonText}>Capture</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(student)}
                    >
                      <Ionicons name="create-outline" size={20} color="#2563eb" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(student)}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create/Edit Student Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>
              {editMode ? 'Edit Student' : 'Add New Student'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            {/* Profile Picture */}
            <View style={styles.profileSection}>
              <Image
                source={{ uri: profilePreview || 'https://via.placeholder.com/150' }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.profileHint}>Tap camera to upload photo (Max 5MB)</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Surname *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.surname}
                  onChangeText={(text) => handleInputChange('surname', text)}
                  placeholder="Enter surname"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                  placeholder="Enter first name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Middle Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.middleName}
                  onChangeText={(text) => handleInputChange('middleName', text)}
                  placeholder="Enter middle name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Age *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.age}
                  onChangeText={(text) => handleInputChange('age', text)}
                  placeholder="Enter age"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleInputChange('phoneNumber', text)}
                  placeholder="+234 xxx xxx xxxx"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Faculty *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowDepartmentPicker(true)}
                >
                  <Text style={formData.department ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formData.department || 'Select Department'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Department *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.course}
                  onChangeText={(text) => handleInputChange('course', text)}
                  placeholder="e.g., Computer Science"
                />
                {formData.course && (
                  <Text style={styles.hint}>
                    Code: {generateDepartmentCode(formData.course)}
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Level *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() =>setShowLevelPicker(true)}
                >
                  <Text style={formData.level ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formData.level ? `${formData.level} Level` : 'Select Level'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Saving...' : editMode ? 'Update Student' : 'Create Student'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Fingerprint Capture Modal */}
      <Modal
        visible={showFingerprintModal}
        animationType="slide"
        onRequestClose={closeFingerprintModal}
      >
        <SafeAreaView style={styles.fingerprintModalContainer}>
          <View style={styles.fingerprintHeader}>
            <View>
              <Text style={styles.fingerprintHeaderTitle}>
                DigitalPersona Fingerprint Capture
              </Text>
              {selectedStudent && (
                <Text style={styles.fingerprintHeaderSubtitle}>
                  {selectedStudent.firstName} {selectedStudent.surname} - {selectedStudent.matricNumber}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={closeFingerprintModal}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.fingerprintContent}>
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressCount}>{capturedCount} / 5 fingers</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${captureProgress}%` }]} />
              </View>
            </View>

            {/* Scanner Status - Shows errors/warnings */}
{scannerStatus.message && !scannerStatus.ready && (
  <View style={[
    styles.scannerStatusBox,
    { 
      borderColor: scannerStatus.type === 'error' ? '#ef4444' : '#f59e0b',
      backgroundColor: scannerStatus.type === 'error' ? '#fef2f2' : '#fef3c7'
    }
  ]}>
    <Ionicons 
      name={scannerStatus.type === 'error' ? 'alert-circle' : 'warning'} 
      size={32} 
      color={scannerStatus.type === 'error' ? '#dc2626' : '#ca8a04'} 
      style={{ marginBottom: 8 }}
    />
    <Text style={[
      styles.scannerStatusText, 
      { color: scannerStatus.type === 'error' ? '#991b1b' : '#92400e' }
    ]}>
      {scannerStatus.message}
    </Text>
    
    {/* Retry button - only show for errors */}
    {scannerStatus.type === 'error' && (
      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: '#ef4444',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
        onPress={() => openFingerprintModal(selectedStudent)}
      >
        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
          Retry Connection
        </Text>
      </TouchableOpacity>
    )}
  </View>
)}

{/* Scanner Status - Shows loading when initializing */}
{!scannerStatus.ready && !scannerStatus.message && (
  <View style={styles.scannerInitializing}>
    <ActivityIndicator size="large" color="#6366f1" />
    <Text style={styles.scannerInitializingText}>Initializing scanner...</Text>
  </View>
)}

            {/* Current Finger */}
            {capturedCount < 5 && scannerStatus.ready && (
              <View style={styles.currentFingerSection}>
                <Text style={styles.fingerEmoji}>{fingers[currentFingerIndex].icon}</Text>
                <Text style={styles.fingerLabel}>{fingers[currentFingerIndex].label}</Text>
                <Text style={styles.fingerInstruction}>
                  Place your {fingers[currentFingerIndex].label.toLowerCase()} on the DigitalPersona scanner
                </Text>

                {/* Capture Status */}
                {captureStatus && (
                  <View style={[
                    styles.captureStatus,
                    captureStatus.type === 'success' ? styles.captureStatusSuccess :
                    captureStatus.type === 'error' ? styles.captureStatusError :
                    styles.captureStatusInfo
                  ]}>
                    <Text style={[
                      styles.captureStatusText,
                      captureStatus.type === 'success' ? styles.captureStatusTextSuccess :
                      captureStatus.type === 'error' ? styles.captureStatusTextError :
                      styles.captureStatusTextInfo
                    ]}>
                      {captureStatus.message}
                    </Text>
                  </View>
                )}

                {checkingDuplicates && (
                  <View style={styles.duplicateCheckStatus}>
                    <ActivityIndicator size="small" color="#ca8a04" />
                    <Text style={styles.duplicateCheckText}>
                      Checking for duplicate fingerprints...
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    (isCapturing || checkingDuplicates) && styles.captureButtonDisabled
                  ]}
                  onPress={handleCaptureFinger}
                  disabled={isCapturing || checkingDuplicates}
                >
                  {checkingDuplicates ? (
                    <View style={styles.captureButtonContent}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.captureButtonText}>Checking...</Text>
                    </View>
                  ) : isCapturing ? (
                    <View style={styles.captureButtonContent}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.captureButtonText}>Scanning...</Text>
                    </View>
                  ) : (
                    <Text style={styles.captureButtonText}>Capture Fingerprint</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* All Captured - Success */}
            {capturedCount === 5 && (
              <View style={styles.allCapturedSection}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={80} color="#16a34a" />
                </View>
                <Text style={styles.allCapturedTitle}>All Fingerprints Captured!</Text>
                <Text style={styles.allCapturedText}>Saving to database...</Text>
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 16 }} />
              </View>
            )}

            {/* Captured Fingers List */}
            <View style={styles.fingersGrid}>
              {fingers.map((finger, index) => {
                const isCaptured = capturedFingers[finger.id];
                const isCurrent = index === currentFingerIndex && !isCaptured;
                
                return (
                  <View
                    key={finger.id}
                    style={[
                      styles.fingerCard,
                      isCaptured && styles.fingerCardCaptured,
                      isCurrent && styles.fingerCardCurrent
                    ]}
                  >
                    <Text style={styles.fingerCardEmoji}>{finger.icon}</Text>
                    <Text style={styles.fingerCardLabel}>{finger.label}</Text>
                    {isCaptured && (
                      <Text style={styles.fingerCardQuality}>
                        ✓ {capturedFingers[finger.id].quality}%
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Important Notice */}
            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Ionicons name="warning-outline" size={20} color="#ca8a04" />
                <Text style={styles.noticeTitle}>Duplicate Detection Enabled</Text>
              </View>
              <Text style={styles.noticeText}>
                Each fingerprint is checked against all registered students to prevent duplicates. 
                If a duplicate is detected, you'll be prompted to use a different finger.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Modals */}
      <PickerModal
        visible={showDepartmentPicker}
        onClose={() => setShowDepartmentPicker(false)}
        title="Select Department"
        data={departments}
        onSelect={(dept) => handleInputChange('department', dept)}
        selectedValue={formData.department}
      />

      <PickerModal
        visible={showLevelPicker}
        onClose={() => setShowLevelPicker(false)}
        title="Select Level"
        data={levels}
        onSelect={(level) => handleInputChange('level', level)}
        selectedValue={formData.level}
      />

      <PickerModal
        visible={showFilterDeptPicker}
        onClose={() => setShowFilterDeptPicker(false)}
        title="Filter by Department"
        data={['All', ...departments]}
        onSelect={(dept) => setFilterDepartment(dept === 'All' ? '' : dept)}
        selectedValue={filterDepartment || 'All'}
      />

      <PickerModal
        visible={showFilterLevelPicker}
        onClose={() => setShowFilterLevelPicker(false)}
        title="Filter by Level"
        data={['All', ...levels]}
        onSelect={(level) => setFilterLevel(level === 'All' ? '' : level)}
        selectedValue={filterLevel || 'All'}
      />
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
  notification: {
    position: 'absolute',
    top: 50,
    right: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationSuccess: {
    backgroundColor: '#22c55e',
  },
  notificationWarning: {
    backgroundColor: '#eab308',
  },
  notificationError: {
    backgroundColor: '#ef4444',
  },
  notificationText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  headerContainer: {
    marginBottom: 16,
  },
  headerLeft: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filtersCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: 'white',
  },
  filterText: {
    fontSize: 14,
    color: '#1f2937',
  },
  filterPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  studentsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  studentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentMiddleName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  studentMatric: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: '#ca8a04',
    fontWeight: '600',
  },
  studentContact: {
    marginBottom: 12,
  },
  studentContactText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  studentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  metaBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  studentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#1f2937',
    marginLeft: 4,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalForm: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 24,
    right: '35%',
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  formGrid: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 32,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  fingerprintModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  fingerprintHeader: {
    backgroundColor: '#7c3aed',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fingerprintHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  fingerprintHeaderSubtitle: {
    fontSize: 13,
    color: '#e9d5ff',
    marginTop: 4,
  },
  fingerprintContent: {
    flex: 1,
    padding: 16,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },
  scannerInitializing: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scannerInitializingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  currentFingerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fingerEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  fingerLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  fingerInstruction: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  captureStatus: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    width: '100%',
  },
  captureStatusSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  captureStatusError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  captureStatusInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  captureStatusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  captureStatusTextSuccess: {
    color: '#15803d',
  },
  captureStatusTextError: {
    color: '#b91c1c',
  },
  captureStatusTextInfo: {
    color: '#1e40af',
  },
  duplicateCheckStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fde68a',
    marginBottom: 16,
    width: '100%',
  },
  duplicateCheckText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
    marginLeft: 8,
  },
  captureButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  allCapturedSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  allCapturedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  allCapturedText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  fingersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  fingerCard: {
    width: '18%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    marginBottom: 8,
  },
  fingerCardCaptured: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  fingerCardCurrent: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  fingerCardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  fingerCardLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  fingerCardQuality: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 4,
  },
  noticeCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fde68a',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  pickerModalList: {
    padding: 8,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  pickerModalItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  pickerModalItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  pickerModalItemTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  scannerStatusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    alignItems: 'center'
  },
  scannerStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  retryButton: {
  marginTop: 12,
  backgroundColor: '#ef4444',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
},
retryButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '600',
},
});