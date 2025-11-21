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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  getAllCourseRegistrationsWithStudents,
  approveCourseRegistration,
  rejectCourseRegistration,
  getCourseRegistrationStats,
  bulkApproveCourses,
  bulkRejectCourses
} from '@/lib/appwrite';
import { useAuth } from '@/lib/useAuth';

export default function AdminCourseRegistrations() {
  const router = useRouter();
  const { user, loading: authLoading, checkAuth } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState({});
  const [studentDetailsMap, setStudentDetailsMap] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  const [filters, setFilters] = useState({
    status: 'all',
    level: 'all',
    department: 'all',
    search: ''
  });

  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [viewMode, setViewMode] = useState('students');

  const [uniqueLevels, setUniqueLevels] = useState([]);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/signIn');
      } else {
        setLoading(false);
        fetchRegistrations();
        fetchStats();
      }
    }
  }, [authLoading, user]);

  useEffect(() => {
    applyFilters();
  }, [registrations, filters, viewMode]);

  const fetchRegistrations = async () => {
    try {
      setRegistrationsLoading(true);
      
      const result = await getAllCourseRegistrationsWithStudents();
      
      if (result.success) {
        setRegistrations(result.data);
        setStudentDetailsMap(result.studentDetailsMap || {});
        
        const levels = new Set();
        const departments = new Set();
        
        result.data.forEach(reg => {
          if (reg.studentDetails) {
            levels.add(reg.studentDetails.level);
            departments.add(reg.studentDetails.department);
          }
        });
        
        setUniqueLevels([...levels].filter(Boolean));
        setUniqueDepartments([...departments].filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      showNotification('Failed to fetch registrations', 'error');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getCourseRegistrationStats();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRegistrations(), fetchStats()]);
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...registrations];

    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.level !== 'all') {
      filtered = filtered.filter(r => 
        r.studentDetails && r.studentDetails.level === filters.level
      );
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(r => 
        r.studentDetails && r.studentDetails.department === filters.department
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => {
        const student = r.studentDetails;
        return (
          r.matricNumber.toLowerCase().includes(searchLower) ||
          r.courseCode.toLowerCase().includes(searchLower) ||
          r.courseTitle.toLowerCase().includes(searchLower) ||
          (student && `${student.firstName} ${student.surname}`.toLowerCase().includes(searchLower))
        );
      });
    }

    if (viewMode === 'students') {
      const groupedByStudent = filtered.reduce((acc, reg) => {
        if (!acc[reg.matricNumber]) {
          acc[reg.matricNumber] = {
            student: reg.studentDetails,
            registrations: []
          };
        }
        acc[reg.matricNumber].registrations.push(reg);
        return acc;
      }, {});

      setFilteredRegistrations(groupedByStudent);
    } else {
      const groupedByCourse = filtered.reduce((acc, reg) => {
        if (!acc[reg.courseCode]) {
          acc[reg.courseCode] = {
            courseCode: reg.courseCode,
            courseTitle: reg.courseTitle,
            courseUnit: reg.courseUnit,
            registrations: []
          };
        }
        acc[reg.courseCode].registrations.push(reg);
        return acc;
      }, {});

      setFilteredRegistrations(groupedByCourse);
    }
  };

  const handleApprove = async (registrationId) => {
    try {
      setActionLoading(registrationId);
      const result = await approveCourseRegistration(registrationId);
      
      if (result.success) {
        showNotification('Course registration approved successfully', 'success');
        await fetchRegistrations();
        await fetchStats();
      } else {
        showNotification(result.error || 'Failed to approve registration', 'error');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      showNotification('Failed to approve registration', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (registrationId) => {
    Alert.alert(
      'Reject Registration',
      'Are you sure you want to reject this course registration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(registrationId);
              const result = await rejectCourseRegistration(registrationId);
              
              if (result.success) {
                showNotification('Course registration rejected', 'success');
                await fetchRegistrations();
                await fetchStats();
              } else {
                showNotification(result.error || 'Failed to reject registration', 'error');
              }
            } catch (error) {
              console.error('Error rejecting registration:', error);
              showNotification('Failed to reject registration', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleBulkApprove = async (matricNumber, pendingRegs) => {
    Alert.alert(
      'Approve All Courses',
      `Approve all ${pendingRegs.length} pending course(s) for ${matricNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              setActionLoading(matricNumber);
              
              const result = await bulkApproveCourses(matricNumber);
              
              if (result.success) {
                showNotification(result.message, 'success');
                await fetchRegistrations();
                await fetchStats();
              } else {
                showNotification(result.error || 'Failed to approve courses', 'error');
              }
            } catch (error) {
              console.error('Error bulk approving:', error);
              showNotification('Failed to approve some registrations', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleBulkReject = async (matricNumber, pendingRegs) => {
    Alert.alert(
      'Reject All Courses',
      `Reject all ${pendingRegs.length} pending course(s) for ${matricNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(matricNumber + '_reject');
              
              const result = await bulkRejectCourses(matricNumber);
              
              if (result.success) {
                showNotification(result.message, 'success');
                await fetchRegistrations();
                await fetchStats();
              } else {
                showNotification(result.error || 'Failed to reject courses', 'error');
              }
            } catch (error) {
              console.error('Error bulk rejecting:', error);
              showNotification('Failed to reject some registrations', 'error');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const toggleExpansion = (key) => {
    setExpandedStudent(expandedStudent === key ? null : key);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Notification */}
      {notification && (
        <View style={[
          styles.notification,
          notification.type === 'success' ? styles.notificationSuccess : styles.notificationError
        ]}>
          <MaterialIcons
            name={notification.type === 'success' ? 'check-circle' : 'error'}
            size={20}
            color="white"
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Registrations</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <MaterialIcons name="description" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={[styles.statCard, styles.statCardYellow]}>
            <MaterialIcons name="schedule" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, styles.statCardGreen]}>
            <MaterialIcons name="check-circle" size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>

          <View style={[styles.statCard, styles.statCardRed]}>
            <MaterialIcons name="cancel" size={24} color="#EF4444" />
            <Text style={styles.statValue}>{stats.rejected}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'students' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('students')}
          >
            <Text style={[
              styles.viewModeButtonText,
              viewMode === 'students' && styles.viewModeButtonTextActive
            ]}>
              By Students
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'courses' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('courses')}
          >
            <Text style={[
              styles.viewModeButtonText,
              viewMode === 'courses' && styles.viewModeButtonTextActive
            ]}>
              By Courses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filters</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, matric, or course..."
            placeholderTextColor="#9CA3AF"
            value={filters.search}
            onChangeText={(text) => setFilters({...filters, search: text})}
          />

          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.status}
                  onValueChange={(value) => setFilters({...filters, status: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="All Status" value="all" />
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="Approved" value="Approved" />
                  <Picker.Item label="Rejected" value="Rejected" />
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Level</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.level}
                  onValueChange={(value) => setFilters({...filters, level: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="All Levels" value="all" />
                  {uniqueLevels.map(level => (
                    <Picker.Item key={level} label={level} value={level} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Department</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={filters.department}
                onValueChange={(value) => setFilters({...filters, department: value})}
                style={styles.picker}
              >
                <Picker.Item label="All Departments" value="all" />
                {uniqueDepartments.map(dept => (
                  <Picker.Item key={dept} label={dept} value={dept} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setFilters({
              status: 'all',
              level: 'all',
              department: 'all',
              search: ''
            })}
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Registrations List */}
        <View style={styles.registrationsCard}>
          <Text style={styles.registrationsTitle}>
            {viewMode === 'students' 
              ? `${Object.keys(filteredRegistrations).length} Student${Object.keys(filteredRegistrations).length !== 1 ? 's' : ''}`
              : `${Object.keys(filteredRegistrations).length} Course${Object.keys(filteredRegistrations).length !== 1 ? 's' : ''}`
            }
          </Text>

          {registrationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading registrations...</Text>
            </View>
          ) : Object.keys(filteredRegistrations).length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="description" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Registrations Found</Text>
              <Text style={styles.emptySubtitle}>
                No course registrations match your filters
              </Text>
            </View>
          ) : viewMode === 'students' ? (
            // Student View
            Object.entries(filteredRegistrations).map(([matricNumber, data]) => {
              const { student, registrations } = data;
              const isExpanded = expandedStudent === matricNumber;
              const totalUnits = registrations.reduce((sum, r) => sum + r.courseUnit, 0);
              const pendingRegs = registrations.filter(r => r.status === 'Pending');
              const approvedCount = registrations.filter(r => r.status === 'Approved').length;

              return (
                <View key={matricNumber} style={styles.studentItem}>
                  <TouchableOpacity
                    style={styles.studentHeader}
                    onPress={() => toggleExpansion(matricNumber)}
                  >
                    <View style={styles.studentHeaderLeft}>
                      <MaterialIcons
                        name={isExpanded ? 'expand-less' : 'expand-more'}
                        size={24}
                        color="#6B7280"
                      />
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentMatric}>{matricNumber}</Text>
                        {student && (
                          <Text style={styles.studentName}>
                            {student.firstName} {student.surname}
                          </Text>
                        )}
                        <View style={styles.badgeRow}>
                          <View style={styles.badgeBlue}>
                            <Text style={styles.badgeTextBlue}>
                              {registrations.length} Course{registrations.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.badgePurple}>
                            <Text style={styles.badgeTextPurple}>{totalUnits} Units</Text>
                          </View>
                          {pendingRegs.length > 0 && (
                            <View style={styles.badgeYellow}>
                              <Text style={styles.badgeTextYellow}>{pendingRegs.length} Pending</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {pendingRegs.length > 0 && (
                    <View style={styles.bulkActions}>
                      <TouchableOpacity
                        style={styles.approveAllButton}
                        onPress={() => handleBulkApprove(matricNumber, pendingRegs)}
                        disabled={actionLoading === matricNumber}
                      >
                        {actionLoading === matricNumber ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <MaterialIcons name="check" size={16} color="white" />
                            <Text style={styles.approveAllButtonText}>Approve All</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectAllButton}
                        onPress={() => handleBulkReject(matricNumber, pendingRegs)}
                        disabled={actionLoading === matricNumber + '_reject'}
                      >
                        {actionLoading === matricNumber + '_reject' ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <MaterialIcons name="close" size={16} color="white" />
                            <Text style={styles.rejectAllButtonText}>Reject All</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {isExpanded && (
                    <View style={styles.coursesList}>
                      {registrations.map(reg => (
                        <View key={reg.$id} style={styles.courseItem}>
                          <View style={styles.courseHeader}>
                            <Text style={styles.courseCode}>{reg.courseCode}</Text>
                            <View style={[
                              styles.statusBadge,
                              reg.status === 'Approved' ? styles.statusApproved :
                              reg.status === 'Rejected' ? styles.statusRejected :
                              styles.statusPending
                            ]}>
                              <Text style={[
                                styles.statusText,
                                reg.status === 'Approved' ? styles.statusTextApproved :
                                reg.status === 'Rejected' ? styles.statusTextRejected :
                                styles.statusTextPending
                              ]}>
                                {reg.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.courseTitle}>{reg.courseTitle}</Text>
                          <Text style={styles.courseDate}>
                            Registered: {formatDate(reg.registeredAt)}
                          </Text>

                          {reg.status === 'Pending' && (
                            <View style={styles.courseActions}>
                              <TouchableOpacity
                                style={styles.approveButton}
                                onPress={() => handleApprove(reg.$id)}
                                disabled={actionLoading === reg.$id}
                              >
                                {actionLoading === reg.$id ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <Text style={styles.approveButtonText}>Approve</Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => handleReject(reg.$id)}
                                disabled={actionLoading === reg.$id}
                              >
                                {actionLoading === reg.$id ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <Text style={styles.rejectButtonText}>Reject</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            // Course View (similar structure but grouped by courses)
            Object.entries(filteredRegistrations).map(([courseCode, data]) => {
              const { courseTitle, registrations } = data;
              const isExpanded = expandedStudent === courseCode;

              return (
                <View key={courseCode} style={styles.studentItem}>
                  <TouchableOpacity
                    style={styles.studentHeader}
                    onPress={() => toggleExpansion(courseCode)}
                  >
                    <View style={styles.studentHeaderLeft}>
                      <MaterialIcons
                        name={isExpanded ? 'expand-less' : 'expand-more'}
                        size={24}
                        color="#6B7280"
                      />
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentMatric}>{courseCode}</Text>
                        <Text style={styles.studentName}>{courseTitle}</Text>
                        <View style={styles.badgeRow}>
                          <View style={styles.badgePurple}>
                            <Text style={styles.badgeTextPurple}>
                              {registrations.length} Student{registrations.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.coursesList}>
                      {registrations.map(reg => {
                        const student = reg.studentDetails;
                        return (
                          <View key={reg.$id} style={styles.courseItem}>
                            <View style={styles.courseHeader}>
                              <Text style={styles.courseCode}>{reg.matricNumber}</Text>
                              {student && (
                                <Text style={styles.courseTitle}>
                                  {student.firstName} {student.surname}
                                </Text>
                              )}
                            </View>
                            
                            {reg.status === 'Pending' && (
                              <View style={styles.courseActions}>
                                <TouchableOpacity
                                  style={styles.approveButton}
                                  onPress={() => handleApprove(reg.$id)}
                                  disabled={actionLoading === reg.$id}
                                >
                                  {actionLoading === reg.$id ? (
                                    <ActivityIndicator size="small" color="white" />
                                  ) : (
                                    <Text style={styles.approveButtonText}>Approve</Text>
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.rejectButton}
                                  onPress={() => handleReject(reg.$id)}
                                  disabled={actionLoading === reg.$id}
                                >
                                  {actionLoading === reg.$id ? (
                                    <ActivityIndicator size="small" color="white" />
                                  ) : (
                                    <Text style={styles.rejectButtonText}>Reject</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
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
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#10B981',
  },
  notificationError: {
    backgroundColor: '#EF4444',
  },
  notificationText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: '#6366F1',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewModeButtonTextActive: {
    color: 'white',
  },
  filtersCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  resetButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  registrationsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registrationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  studentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  studentMatric: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeBlue: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTextBlue: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  badgePurple: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTextPurple: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTextYellow: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  approveAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  coursesList: {
    marginTop: 12,
    marginLeft: 32,
  },
  courseItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  courseTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  courseDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#10B981',
  },
  statusTextRejected: {
    color: '#EF4444',
  },
  statusTextPending: {
    color: '#D97706',
  },
  courseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});