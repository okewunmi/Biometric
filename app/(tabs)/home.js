
import { getDashboardStats, getRecentActivity } from '@/lib/appwrite';
import { useAuth } from '@/lib/useAuth';
import {
  FontAwesome6,
  Ionicons,
  MaterialIcons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const DRAWER_WIDTH = isTablet ? 320 : 240;

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  const { user, loading, initialized, checkAuth, logout } = useAuth();

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    verifiedStudents: 0,
    pendingRegistrations: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);

  const drawerMenuItems = [
    {
      id: 'attendance',
      title: 'Mark Attendance',
      icon: 'clipboard-outline',
      iconType: 'Ionicons',
      route: '/mark-attendance',
    },
    {
      id: 'reports',
      title: 'View Reports',
      icon: 'bar-chart',
      iconType: 'Ionicons',
      route: '/reports',
    },
    {
      id: 'registered-courses',
      title: 'Registered Courses',
      icon: 'school',
      iconType: 'Ionicons',
      route: '/registered-courses',
    },
    // {
    //   id: 'exam-sessions',
    //   title: 'Exam Sessions',
    //   icon: 'document-text',
    //   iconType: 'Ionicons',
    //   route: '/exam-sessions',
    // },
    {
      id: 'sub-admin',
      title: 'Sub Admin',
      icon: 'person-add',
      iconType: 'Ionicons',
      route: '/sub-admin',
    },
    {
      id: 'manage-admins',
      title: 'Manage Admins',
      icon: 'people-circle',
      iconType: 'Ionicons',
      route: '/manage-admins',
    },
  ];

  
useEffect(() => {
  // Only verify auth if not already initialized
  const verifyAuth = async () => {
    if (!initialized) {
      console.log('🔍 Home: Initial auth check');
      const result = await checkAuth();

      if (!result.success || !result.user) {
        console.log('❌ No active session, redirecting to login');
        router.replace('/signIn');
      }
    } else {
      console.log('✅ Home: Auth already verified');
    }
  };

  verifyAuth();
}, [initialized]);


  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await getDashboardStats();

      if (result.success) {
        setDashboardStats(result.data);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const result = await getRecentActivity(4);

      if (result.success) {
        setRecentActivities(result.data);
      } else {
        console.error('Failed to fetch activity:', result.error);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStats();
      fetchActivity();
    }
  }, [loading, fetchStats, fetchActivity]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchActivity()]);
    setRefreshing(false);
  }, [fetchStats, fetchActivity]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set greeting based on time
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Day');
    }
  }, [currentTime]);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleMenuClick = (item) => {
    setDrawerVisible(false);
    router.push(item.route);
  };

  
  const handleSignOut = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      console.log('⏳ Logout already in progress');
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              console.log('🔴 Starting logout...');
              
              // Call logout (this will clear state and session)
              await logout();
              
              console.log('✅ Logout complete');
              setDrawerVisible(false);
              // Force navigation to login screen
              router.replace('/signIn');
              
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          }
        }
      ]
    );
  };

  const renderIcon = (item, isActive) => {
    const size = isTablet ? 24 : 22;
    const color = isActive ? '#4F46E5' : '#6B7280';

    switch (item.iconType) {
      case 'MaterialIcons':
        return <MaterialIcons name={item.icon} size={size} color={color} />;
      case 'FontAwesome6':
        return <FontAwesome6 name={item.icon} size={size} color={color} />;
      default:
        return <Ionicons name={item.icon} size={size} color={color} />;
    }
  };

  const stats = [
    {
      label: 'Total Students',
      value: statsLoading ? '...' : dashboardStats.totalStudents.toString(),
      icon: 'people',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
    },
    {
      label: 'Active Courses',
      value: statsLoading ? '...' : dashboardStats.activeCourses.toString(),
      icon: 'book',
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      label: 'Verified Students',
      value: statsLoading ? '...' : dashboardStats.verifiedStudents.toString(),
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
    },
    {
      label: 'Pending Registrations',
      value: statsLoading ? '...' : dashboardStats.pendingRegistrations.toString(),
      icon: 'time',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
  ];

  const quickActions = [
    {
      title: 'Add Student',
      icon: 'person-add',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      route: '/students',
    },
    {
      title: 'Upload Course',
      icon: 'cloud-upload',
      color: '#10B981',
      bgColor: '#D1FAE5',
      route: '/courses',
    },
    {
      title: 'Verify Student',
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      route: '/verify',
    },
    // {
    //   title: 'Exam Session',
    //   icon: 'school',
    //   color: '#F59E0B',
    //   bgColor: '#FEF3C7',
    //   route: '/(admin)/exam-sessions',
    // },
    {
      title: 'Attendace Report',
      icon: 'bar-chart',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      route: '/reports',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#9333EA" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <Text style={styles.headerTime}>{formatTime(currentTime)}</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting Section */}
        <LinearGradient
          colors={['#4F46E5', '#9333EA']}
          style={styles.greetingContainer}
        >
          <View style={styles.greetingContent}>
            <View>
              <Text style={styles.greetingText}>
                {greeting}, {user?.username || 'Admin'}! 👋
              </Text>
              <Text style={styles.greetingSubtext}>
                Biometrics Exam Authentication System
              </Text>
            </View>
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar" size={16} color="#C7D2FE" />
                <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View 
              key={index} 
              style={[
                styles.statCard,
                isTablet && styles.statCardTablet
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon} size={isTablet ? 28 : 24} color={stat.color} />
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: action.bgColor },
                  isTablet && styles.quickActionCardTablet
                ]}
                onPress={() => router.push(action.route)}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon} size={isTablet ? 36 : 32} color={action.color} />
                <Text style={[styles.quickActionText, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.sectionContainer, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            {activityLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>
            ) : recentActivities.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No recent activity</Text>
                <Text style={styles.emptySubtext}>
                  Activities will appear here as you use the system
                </Text>
              </View>
            ) : (
              recentActivities.map((activity, index) => (
                <View
                  key={index}
                  style={[
                    styles.activityItem,
                    index === recentActivities.length - 1 && styles.activityItemLast,
                  ]}
                >
                  <View style={styles.activityLeft}>
                    <View
                      style={[
                        styles.activityDot,
                        {
                          backgroundColor:
                            activity.activityType === 'success' ? '#10B981' : '#3B82F6',
                        },
                      ]}
                    />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityAction}>{activity.action}</Text>
                      {activity.student && (
                        <Text style={styles.activityStudent}>{activity.student}</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setDrawerVisible(false)}
        >
          <Pressable
            style={[styles.drawerContainer, { paddingTop: insets.top }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <LinearGradient
              colors={['#4F46E5', '#9333EA']}
              style={styles.drawerHeader}
            >
              <View style={styles.drawerHeaderContent}>
                <View style={styles.drawerHeaderLeft}>
                  <View style={styles.drawerIconContainer}>
                    <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.drawerTitle}>Exam Auth</Text>
                    <Text style={styles.drawerSubtitle}>Admin Panel</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setDrawerVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Drawer Menu */}
            <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
              {drawerMenuItems.map((item) => {
                const isActive = pathname === item.route;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.drawerMenuItem,
                      isActive && styles.drawerMenuItemActive,
                    ]}
                    onPress={() => handleMenuClick(item)}
                    activeOpacity={0.7}
                  >
                    {renderIcon(item, isActive)}
                    <Text
                      style={[
                        styles.drawerMenuText,
                        isActive && styles.drawerMenuTextActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Drawer Footer */}
            <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                onPress={handleSignOut}
                disabled={isLoggingOut}
                style={[
                  styles.logoutButton,
                  isLoggingOut && styles.logoutButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                )}
                <Text style={styles.logoutText}>
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginLeft: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTime: {
    fontSize: isTablet ? 14 : 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  greetingContainer: {
    borderRadius: 16,
    padding: isTablet ? 32 : 24,
    margin: isTablet ? 24 : 16,
    marginBottom: isTablet ? 24 : 16,
  },
  greetingContent: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isTablet ? 'center' : 'flex-start',
  },
  greetingText: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: isTablet ? 16 : 14,
    color: '#C7D2FE',
  },
  dateTimeContainer: {
    marginTop: isTablet ? 0 : 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: isTablet ? 14 : 12,
    color: '#C7D2FE',
    marginLeft: 8,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: isTablet ? 16 : 8,
    marginBottom: isTablet ? 24 : 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isTablet ? 24 : 16,
    margin: isTablet ? 8 : 8,
    width: isTablet ? '23%' : '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardTablet: {
    width: '23%',
  },
  statIconContainer: {
    width: isTablet ? 56 : 48,
    height: isTablet ? 56 : 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: isTablet ? 14 : 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isTablet ? 24 : 16,
    marginHorizontal: isTablet ? 24 : 16,
    marginBottom: isTablet ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastSection: {
    marginBottom: isTablet ? 32 : 24,
  },
  sectionTitle: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: isTablet ? 20 : 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: isTablet ? -8 : -4,
  },
  quickActionCard: {
    borderRadius: 12,
    padding: isTablet ? 24 : 16,
    margin: isTablet ? 8 : 4,
    width: isTablet ? '23%' : '47%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isTablet ? 140 : 120,
  },
  quickActionCardTablet: {
    width: '23%',
  },
  quickActionText: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  activityContainer: {
    minHeight: 200,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: isTablet ? 16 : 14,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: isTablet ? 14 : 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isTablet ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
    fontWeight: '500',
  },
  activityStudent: {
    fontSize: isTablet ? 14 : 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityTime: {
    fontSize: isTablet ? 13 : 12,
    color: '#6B7280',
    marginLeft: 12,
  },
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  drawerHeader: {
    padding: 20,
    paddingBottom: 24,
  },
  drawerHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  drawerSubtitle: {
    fontSize: isTablet ? 14 : 12,
    color: '#C7D2FE',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  drawerMenu: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerMenuItemActive: {
    backgroundColor: '#EEF2FF',
  },
  drawerMenuText: {
    fontSize: isTablet ? 16 : 15,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 12,
  },
  drawerMenuTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  logoutText: {
    fontSize: isTablet ? 16 : 15,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 10,
  },
});