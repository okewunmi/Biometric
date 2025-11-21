import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Image,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  saveFingerprints,
  getStudentStats,
  generateDepartmentCode
} from '@/lib/appwrite';
import fingerprintScanner from '@/lib/fingerprint-digitalpersona';

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
  const [showFilterDeptPicker, setShowFilterDeptPicker] = useState(false);
  const [showFilterLevelPicker, setShowFilterLevelPicker] = useState(false);
  
  // Fingerprint capture states
  const [currentFingerIndex, setCurrentFingerIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFingers, setCapturedFingers] = useState({});
  const [captureStatus, setCaptureStatus] = useState(null);
  const [scannerReady, setScannerReady] = useState(false);
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
    'Computer Science',
    'Software Engineering',
    'Information Technology',
    'Cyber Security',
    'Data Science',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering'
  ];

  const levels = ['100', '200', '300', '400', '500'];

  useEffect(() => {
    fetchStudents();
    fetchStats();
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

  // const pickImage = async () => {
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaType.Images,
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //     quality: 0.8,
  //   });

  //   if (!result.canceled && result.assets[0]) {
  //     const asset = result.assets[0];
      
  //     // Check file size (estimate from URI)
  //     if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
  //       showNotification('File size must be less than 5MB', 'error');
  //       return;
  //     }

  //     setFormData({ ...formData, profilePicture: asset });
  //     setProfilePreview(asset.uri);
  //   }
  // };
// Fix for the pickImage function in your students.js file

const pickImage = async () => {
  try {
    // Request permissions first
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      showNotification('Permission to access camera roll is required!', 'error');
      return;
    }

    // Launch image picker with correct configuration
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Use array of strings instead
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    console.log('Image picker result:', result);

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      
      // Check file size if available
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
      }

      // Store the complete asset object
      setFormData({ ...formData, profilePicture: asset });
      setProfilePreview(asset.uri);
      
      console.log('Image selected:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type
      });
    } else {
      console.log('Image picker cancelled');
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
    setScannerReady(false);
    
    const initResult = await fingerprintScanner.initialize();
    if (initResult.success) {
      setScannerReady(true);
      setCaptureStatus({ type: 'success', message: 'Scanner ready! Click "Capture" to begin.' });
    } else {
      setCaptureStatus({ type: 'error', message: initResult.error });
    }
  };

  const handleCaptureFinger = async () => {
    if (!scannerReady) {
      setCaptureStatus({ type: 'error', message: 'Scanner not ready. Please wait...' });
      return;
    }

    setIsCapturing(true);
    setCaptureStatus({ type: 'info', message: 'Place finger on scanner...' });

    try {
      const currentFinger = fingers[currentFingerIndex];
      
      const captureResult = await fingerprintScanner.capture(
        selectedStudent.$id,
        currentFinger.label
      );

      if (!captureResult.success) {
        throw new Error(captureResult.error);
      }

      setCheckingDuplicates(true);
      setCaptureStatus({ type: 'info', message: 'Checking for duplicates...' });
      
      const existingTemplates = [];
      for (const student of students) {
        if (student.$id === selectedStudent.$id) continue;
        
        if (student.thumbTemplate) existingTemplates.push({ 
          studentId: student.$id, 
          matricNumber: student.matricNumber,
          template: student.thumbTemplate,
          fingerName: 'Thumb'
        });
        if (student.indexTemplate) existingTemplates.push({ 
          studentId: student.$id, 
          matricNumber: student.matricNumber,
          template: student.indexTemplate,
          fingerName: 'Index'
        });
        if (student.middleTemplate) existingTemplates.push({ 
          studentId: student.$id, 
          matricNumber: student.matricNumber,
          template: student.middleTemplate,
          fingerName: 'Middle'
        });
        if (student.ringTemplate) existingTemplates.push({ 
          studentId: student.$id, 
          matricNumber: student.matricNumber,
          template: student.ringTemplate,
          fingerName: 'Ring'
        });
        if (student.pinkyTemplate) existingTemplates.push({ 
          studentId: student.$id, 
          matricNumber: student.matricNumber,
          template: student.pinkyTemplate,
          fingerName: 'Pinky'
        });
      }

      Object.entries(capturedFingers).forEach(([fingerId, data]) => {
        existingTemplates.push({
          studentId: selectedStudent.$id,
          matricNumber: selectedStudent.matricNumber,
          template: data.template,
          fingerName: fingerId
        });
      });

      const duplicateCheck = await fingerprintScanner.checkForDuplicates(
        captureResult.template,
        existingTemplates
      );

      setCheckingDuplicates(false);

      if (duplicateCheck.hasDuplicates) {
        const duplicate = duplicateCheck.duplicates[0];
        setCaptureStatus({ 
          type: 'error', 
          message: `⚠️ DUPLICATE! This fingerprint is already registered to ${duplicate.matricNumber} (${duplicate.fingerName}). Please use a different finger.` 
        });
        setIsCapturing(false);
        return;
      }

      setCapturedFingers(prev => ({
        ...prev,
        [currentFinger.id]: {
          template: captureResult.template,
          quality: captureResult.quality,
          capturedAt: captureResult.capturedAt
        }
      }));

      setCaptureStatus({ 
        type: 'success', 
        message: `✅ ${currentFinger.label} captured successfully! (Quality: ${captureResult.quality}%)` 
      });
      
      setTimeout(() => {
        if (currentFingerIndex < fingers.length - 1) {
          setCurrentFingerIndex(currentFingerIndex + 1);
          setCaptureStatus({ type: 'info', message: 'Ready for next finger...' });
        } else {
          saveFingerprintsToDatabase();
        }
        setIsCapturing(false);
      }, 1500);

    } catch (error) {
      setCaptureStatus({ 
        type: 'error', 
        message: error.message || 'Capture failed. Please try again.' 
      });
      setIsCapturing(false);
      setCheckingDuplicates(false);
    }
  };

  const saveFingerprintsToDatabase = async () => {
    setCaptureStatus({ type: 'info', message: 'Saving fingerprints to database...' });
    
    try {
      const fingerprintData = {
        thumb: capturedFingers.thumb?.template || '',
        index: capturedFingers.index?.template || '',
        middle: capturedFingers.middle?.template || '',
        ring: capturedFingers.ring?.template || '',
        pinky: capturedFingers.pinky?.template || ''
      };

      const result = await saveFingerprints(selectedStudent.$id, fingerprintData);

      if (result.success) {
        showNotification('All fingerprints saved successfully!', 'success');
        fetchStudents();
        fetchStats();
        
        setTimeout(() => {
          closeFingerprintModal();
        }, 2000);
      } else {
        showNotification('Error saving fingerprints: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
    }
  };

  const closeFingerprintModal = () => {
    fingerprintScanner.stop();
    setShowFingerprintModal(false);
    setCurrentFingerIndex(0);
    setCapturedFingers({});
    setCaptureStatus(null);
    setSelectedStudent(null);
    setScannerReady(false);
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
          {/* Header */}
          {/* <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/home")}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity> */}

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
                <Text style={styles.label}>Department *</Text>
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
                <Text style={styles.label}>Course *</Text>
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

            {/* Scanner Status */}
            {!scannerReady && !captureStatus && (
              <View style={styles.scannerInitializing}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.scannerInitializingText}>Initializing scanner...</Text>
              </View>
            )}

            {/* Current Finger */}
            {capturedCount < 5 && scannerReady && (
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
});