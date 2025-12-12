import {
  courseCodeExists,
  createMultipleCourses,
  deleteCourse,
  getAllCourses,
  getCourseStats
} from '@/lib/appwrite';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

export default function CourseUploadPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingCourses, setExistingCourses] = useState([]);
  const [stats, setStats] = useState({ total: 0, byDepartment: {}, byLevel: {}, bySemester: {} });
  const [showSemesterPicker, setShowSemesterPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  const [newCourse, setNewCourse] = useState({
    courseTitle: '',
    courseCode: '',
    courseUnit: ''
  });

  const semesters = [
    { id: '1', name: 'First Semester', value: 'First' },
    { id: '2', name: 'Second Semester', value: 'Second' }
  ];

  const levels = [
    { id: '1', name: '100 Level', value: '100' },
    { id: '2', name: '200 Level', value: '200' },
    { id: '3', name: '300 Level', value: '300' },
    { id: '4', name: '400 Level', value: '400' },
    { id: '5', name: '500 Level', value: '500' }
  ];

  const departments = [
  { id: '6', name: 'Electrical Electronics Engineering', value: 'Electrical Electronics Engineering' },
];

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const result = await getAllCourses();
    if (result.success) {
      setExistingCourses(result.data);
    } else {
      showNotification('Error loading courses: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getCourseStats();
    if (result.success) {
      setStats(result.data);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddCourse = async () => {
    if (!newCourse.courseTitle || !newCourse.courseCode || !newCourse.courseUnit) {
      showNotification('Please fill all course fields', 'error');
      return;
    }

    if (!selectedSemester || !selectedLevel || !selectedDepartment) {
      showNotification('Please select semester, level, and department', 'error');
      return;
    }

    const exists = await courseCodeExists(newCourse.courseCode);
    if (exists) {
      showNotification(`Course code ${newCourse.courseCode} already exists`, 'error');
      return;
    }

    const inList = courses.find(c => c.courseCode === newCourse.courseCode.toUpperCase());
    if (inList) {
      showNotification('Course already added to list', 'error');
      return;
    }

    const course = {
      courseTitle: newCourse.courseTitle,
      courseCode: newCourse.courseCode.toUpperCase(),
      courseUnit: parseInt(newCourse.courseUnit),
      semester: selectedSemester,
      level: selectedLevel,
      department: selectedDepartment,
    };

    setCourses([...courses, course]);
    setNewCourse({ courseTitle: '', courseCode: '', courseUnit: '' });
    showNotification('Course added to list successfully', 'success');
  };

  const handleRemoveCourse = (code) => {
    setCourses(courses.filter(c => c.courseCode !== code));
    showNotification('Course removed from list', 'success');
  };

  const handleSaveAllCourses = async () => {
    if (courses.length === 0) {
      showNotification('No courses to save', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createMultipleCourses(courses);

      if (result.success) {
        showNotification(result.message, 'success');
        setCourses([]);
        setShowCreateForm(false);
        fetchCourses();
        fetchStats();
      } else {
        showNotification('Some courses failed to save', 'error');
        if (result.errors && result.errors.length > 0) {
          console.error('Failed courses:', result.errors);
        }
      }
    } catch (error) {
      showNotification('Error saving courses: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = (course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete ${course.courseCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteCourse(course.$id);
            if (result.success) {
              showNotification('Course deleted successfully', 'success');
              fetchCourses();
              fetchStats();
            } else {
              showNotification('Error deleting course: ' + result.error, 'error');
            }
          }
        }
      ]
    );
  };

  const filteredExistingCourses = existingCourses.filter(course => 
    course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PickerModal = ({ visible, onClose, title, data, onSelect, selectedValue }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {data.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.modalItem,
                  selectedValue === item.value && styles.modalItemSelected
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  selectedValue === item.value && styles.modalItemTextSelected
                ]}>
                  {item.name}
                </Text>
                {selectedValue === item.value && (
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
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {notification && (
        <View style={[
          styles.notification,
          notification.type === 'success' ? styles.notificationSuccess : styles.notificationError
        ]}>
          <Ionicons 
            name={notification.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
            size={20} 
            color="white" 
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
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
                <Ionicons name="cloud-upload-outline" size={32} color="#6366f1" />
                <Text style={styles.headerTitle}>Course Management</Text>
              </View>
              <Text style={styles.headerSubtitle}>Upload and manage courses for students</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateForm(!showCreateForm)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Create New</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="book-outline" size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Courses</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="document-text-outline" size={24} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>{courses.length}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="business-outline" size={24} color="#9333ea" />
              </View>
              <View>
                <Text style={styles.statLabel}>Departments</Text>
                <Text style={styles.statValue}>{Object.keys(stats.byDepartment).length}</Text>
              </View>
            </View>
          </View>

          {/* Create Form */}
          {showCreateForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add New Course</Text>

              {/* Dropdowns */}
              <View style={styles.dropdownRow}>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowSemesterPicker(true)}
                >
                  <Text style={selectedSemester ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {selectedSemester ? semesters.find(s => s.value === selectedSemester)?.name : 'Select Semester'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowLevelPicker(true)}
                >
                  <Text style={selectedLevel ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {selectedLevel ? levels.find(l => l.value === selectedLevel)?.name : 'Select Level'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.dropdown, { marginBottom: 16 }]}
                onPress={() => setShowDepartmentPicker(true)}
              >
                <Text style={selectedDepartment ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedDepartment || 'Select Department'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {/* Input Fields */}
              <TextInput
                style={styles.input}
                placeholder="Course Title (e.g., Introduction to Programming)"
                value={newCourse.courseTitle}
                onChangeText={(text) => setNewCourse({...newCourse, courseTitle: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Course Code (e.g., CSC101)"
                value={newCourse.courseCode}
                onChangeText={(text) => setNewCourse({...newCourse, courseCode: text.toUpperCase()})}
                autoCapitalize="characters"
              />

              <TextInput
                style={styles.input}
                placeholder="Course Unit (e.g., 3)"
                value={newCourse.courseUnit}
                onChangeText={(text) => setNewCourse({...newCourse, courseUnit: text})}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCourse}
              >
                <Text style={styles.addButtonText}>Add Course to List</Text>
              </TouchableOpacity>

              {/* Pending Courses */}
              {courses.length > 0 && (
                <View style={styles.pendingSection}>
                  <Text style={styles.pendingTitle}>Pending Courses ({courses.length})</Text>
                  {courses.map((course, index) => (
                    <View key={index} style={styles.pendingCourse}>
                      <View style={styles.pendingCourseInfo}>
                        <Text style={styles.pendingCourseCode}>{course.courseCode}</Text>
                        <Text style={styles.pendingCourseTitle}> - {course.courseTitle}</Text>
                        <Text style={styles.pendingCourseUnit}> ({course.courseUnit} units)</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveCourse(course.courseCode)}>
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                    onPress={handleSaveAllCourses}
                    disabled={submitting}
                  >
                    <Text style={styles.saveButtonText}>
                      {submitting ? 'Saving...' : `Save All ${courses.length} Courses`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Existing Courses */}
          <View style={styles.coursesCard}>
            <View style={styles.coursesHeader}>
              <Text style={styles.coursesTitle}>Existing Courses</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>
            </View>

            {filteredExistingCourses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No courses found</Text>
                <Text style={styles.emptyStateText}>Start by creating your first course</Text>
              </View>
            ) : (
              filteredExistingCourses.map((course) => (
                <View key={course.$id} style={styles.courseItem}>
                  <View style={styles.courseItemHeader}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCourse(course)}>
                      <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.courseTitle}>{course.courseTitle}</Text>
                  <View style={styles.courseItemFooter}>
                    <View style={styles.courseBadge}>
                      <Text style={styles.courseBadgeText}>{course.courseUnit} units</Text>
                    </View>
                    <View style={[styles.courseBadge, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.courseBadgeText, { color: '#2563eb' }]}>{course.semester}</Text>
                    </View>
                    <View style={[styles.courseBadge, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={[styles.courseBadgeText, { color: '#9333ea' }]}>{course.level}</Text>
                    </View>
                  </View>
                  <Text style={styles.courseDepartment}>{course.department}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal
        visible={showSemesterPicker}
        onClose={() => setShowSemesterPicker(false)}
        title="Select Semester"
        data={semesters}
        onSelect={setSelectedSemester}
        selectedValue={selectedSemester}
      />

      <PickerModal
        visible={showLevelPicker}
        onClose={() => setShowLevelPicker(false)}
        title="Select Level"
        data={levels}
        onSelect={setSelectedLevel}
        selectedValue={selectedLevel}
      />

      <PickerModal
        visible={showDepartmentPicker}
        onClose={() => setShowDepartmentPicker(false)}
        title="Select Department"
        data={departments}
        onSelect={setSelectedDepartment}
        selectedValue={selectedDepartment}
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
  formCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e7ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dropdown: {
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
  dropdownText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  addButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingSection: {
    marginTop: 16,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  pendingCourse: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  pendingCourseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  pendingCourseCode: {
    fontWeight: '600',
    color: '#6366f1',
    fontSize: 14,
  },
  pendingCourseTitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  pendingCourseUnit: {
    color: '#9ca3af',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  coursesCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coursesHeader: {
    marginBottom: 16,
  },
  coursesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
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
  courseItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
  },
  courseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  courseTitle: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  courseItemFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  courseBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  courseBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  courseDepartment: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  modalItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalItemTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
});