// import { useAuth } from '@/lib/useAuth';
// import { FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { usePathname, useRouter } from 'expo-router';
// import { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Dimensions,
//   Modal,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const { width, height } = Dimensions.get('window');
// const isTablet = width >= 768;
// const DRAWER_WIDTH = isTablet ? 320 : 240;

// export default function AdminDashboard() {
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [greeting, setGreeting] = useState('');
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [statsLoading, setStatsLoading] = useState(false);
//   const [activityLoading, setActivityLoading] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);
  
//   const router = useRouter();
//   const pathname = usePathname();
//   const insets = useSafeAreaInsets();
  
//   const { user, loading, logout } = useAuth();

//   // Mock user data
//   // const user = { username: 'Admin' };

//   // Mock data
//   const [dashboardStats, setDashboardStats] = useState({
//     totalStudents: 1245,
//     activeCourses: 32,
//     verifiedStudents: 980,
//     pendingRegistrations: 45,
//   });

//   const [recentActivities, setRecentActivities] = useState([
//     {
//       action: 'New student registered',
//       student: 'John Doe',
//       time: '5 mins ago',
//       activityType: 'success',
//     },
//     {
//       action: 'Course uploaded',
//       student: 'Mathematics 101',
//       time: '15 mins ago',
//       activityType: 'success',
//     },
//     {
//       action: 'Student verified',
//       student: 'Jane Smith',
//       time: '1 hour ago',
//       activityType: 'success',
//     },
//   ]);

  
//   const drawerMenuItems = [
    
//     {
//       id: 'reports',
//       title: 'View Reports',
//       icon: 'bar-chart',
//       iconType: 'Ionicons',
//       route: '/reports',
//     },
//     {
//       id: 'registered-courses',
//       title: 'Registered Courses',
//       icon: 'school',
//       iconType: 'Ionicons',
//       route: '/registered-courses',
//     },
//     {
//       id: 'exam-sessions',
//       title: 'Exam Sessions',
//       icon: 'document-text',
//       iconType: 'Ionicons',
//       route: '/exam-sessions',
//     },
//     {
//       id: 'sub-admin',
//       title: 'Sub Admin',
//       icon: 'person-add',
//       iconType: 'Ionicons',
//       route: '/sub-admin',
//     },
//     {
//       id: 'manage-admins',
//       title: 'Manage Admins',
//       icon: 'people-circle',
//       iconType: 'Ionicons',
//       route: '/manage-admins',
//     },
//   ];





//   // Update time every second
//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 1000);
//     return () => clearInterval(timer);
//   }, []);

//   // Set greeting based on time
//   useEffect(() => {
//     const hour = currentTime.getHours();
//     if (hour >= 5 && hour < 12) {
//       setGreeting('Good Morning');
//     } else if (hour >= 12 && hour < 17) {
//       setGreeting('Good Afternoon');
//     } else if (hour >= 17 && hour < 21) {
//       setGreeting('Good Evening');
//     } else {
//       setGreeting('Good Day');
//     }
//   }, [currentTime]);

//   const formatDate = (date) => {
//     const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
//     return date.toLocaleDateString('en-US', options);
//   };

//   const formatTime = (date) => {
//     return date.toLocaleTimeString('en-US', { 
//       hour: '2-digit', 
//       minute: '2-digit', 
//       second: '2-digit' 
//     });
//   };

//   const handleMenuClick = (item) => {
//     setDrawerVisible(false);
//     router.push(item.route);
//   };

//   const handleSignOut = async () => {
//     if (isLoggingOut) return;
    
//     try {
//       setIsLoggingOut(true);
//       await logout();
//       setDrawerVisible(false);
//       router.replace('/(auth)/signIn');
//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       setIsLoggingOut(false);
//     }
//   };

//   const renderIcon = (item, isActive) => {
//     const size = isTablet ? 24 : 22;
//     const color = isActive ? '#4F46E5' : '#6B7280';

//     switch (item.iconType) {
//       case 'MaterialIcons':
//         return <MaterialIcons name={item.icon} size={size} color={color} />;
//       case 'FontAwesome6':
//         return <FontAwesome6 name={item.icon} size={size} color={color} />;
//       default:
//         return <Ionicons name={item.icon} size={size} color={color} />;
//     }
//   };

//   const stats = [
//     {
//       label: 'Total Students',
//       value: dashboardStats.totalStudents.toString(),
//       icon: 'people',
//       color: '#3B82F6',
//       bgColor: '#DBEAFE',
//     },
//     {
//       label: 'Active Courses',
//       value: dashboardStats.activeCourses.toString(),
//       icon: 'book',
//       color: '#10B981',
//       bgColor: '#D1FAE5',
//     },
//     {
//       label: 'Verified Students',
//       value: dashboardStats.verifiedStudents.toString(),
//       icon: 'shield-checkmark',
//       color: '#8B5CF6',
//       bgColor: '#EDE9FE',
//     },
//     {
//       label: 'Pending Registrations',
//       value: dashboardStats.pendingRegistrations.toString(),
//       icon: 'time',
//       color: '#F59E0B',
//       bgColor: '#FEF3C7',
//     },
//   ];

//   const quickActions = [
//     {
//       title: 'Add Student',
//       icon: 'person-add',
//       color: '#3B82F6',
//       bgColor: '#DBEAFE',
//       route: '/students',
//     },
//     {
//       title: 'Upload Course',
//       icon: 'cloud-upload',
//       color: '#10B981',
//       bgColor: '#D1FAE5',
//       route: '/courses',
//     },
//     {
//       title: 'Verify Student',
//       icon: 'shield-checkmark',
//       color: '#8B5CF6',
//       bgColor: '#EDE9FE',
//       route: '/verify',
//     },
//     {
//       title: 'Exam Session',
//       icon: 'school',
//       color: '#F59E0B',
//       bgColor: '#FEF3C7',
//       route: '/exam-sessions',
//     },
//   ];

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
//         <View style={styles.headerContent}>
//           <TouchableOpacity
//             onPress={() => setDrawerVisible(true)}
//             style={styles.menuButton}
//             activeOpacity={0.7}
//           >
//             <Ionicons name="menu" size={28} color="#9333EA" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Admin Dashboard</Text>
//           <View style={styles.timeContainer}>
//             <Ionicons name="time-outline" size={18} color="#6B7280" />
//             <Text style={styles.headerTime}>{formatTime(currentTime)}</Text>
//           </View>
//         </View>
//       </View>

//       {/* Main Content */}
//       <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
//         {/* Greeting Section */}
//         <LinearGradient
//           colors={['#4F46E5', '#9333EA']}
//           style={styles.greetingContainer}
//         >
//           <View style={styles.greetingContent}>
//             <View>
//               <Text style={styles.greetingText}>
//                 {greeting}, {user?.username || 'Admin'}! 👋
//               </Text>
//               <Text style={styles.greetingSubtext}>
//                 Biometrics Exam Authentication System
//               </Text>
//             </View>
//             <View style={styles.dateTimeContainer}>
//               <View style={styles.dateRow}>
//                 <Ionicons name="calendar" size={16} color="#C7D2FE" />
//                 <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
//               </View>
//             </View>
//           </View>
//         </LinearGradient>

//         {/* Stats Cards */}
//         <View style={styles.statsContainer}>
//           {stats.map((stat, index) => (
//             <View 
//               key={index} 
//               style={[
//                 styles.statCard,
//                 isTablet && styles.statCardTablet
//               ]}
//             >
//               <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
//                 <Ionicons name={stat.icon} size={isTablet ? 28 : 24} color={stat.color} />
//               </View>
//               <Text style={styles.statLabel}>{stat.label}</Text>
//               <Text style={styles.statValue}>{stat.value}</Text>
//             </View>
//           ))}
//         </View>

//         {/* Quick Actions */}
//         <View style={styles.sectionContainer}>
//           <Text style={styles.sectionTitle}>Quick Actions</Text>
//           <View style={styles.quickActionsGrid}>
//             {quickActions.map((action, index) => (
//               <TouchableOpacity
//                 key={index}
//                 style={[
//                   styles.quickActionCard,
//                   { backgroundColor: action.bgColor },
//                   isTablet && styles.quickActionCardTablet
//                 ]}
//                 onPress={() => router.push(action.route)}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name={action.icon} size={isTablet ? 36 : 32} color={action.color} />
//                 <Text style={[styles.quickActionText, { color: action.color }]}>
//                   {action.title}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {/* Recent Activity */}
//         <View style={[styles.sectionContainer, styles.lastSection]}>
//           <Text style={styles.sectionTitle}>Recent Activity</Text>
//           <View style={styles.activityContainer}>
//             {activityLoading ? (
//               <View style={styles.loadingContainer}>
//                 <ActivityIndicator size="large" color="#4F46E5" />
//               </View>
//             ) : recentActivities.length === 0 ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
//                 <Text style={styles.emptyText}>No recent activity</Text>
//                 <Text style={styles.emptySubtext}>
//                   Activities will appear here as you use the system
//                 </Text>
//               </View>
//             ) : (
//               recentActivities.map((activity, index) => (
//                 <View
//                   key={index}
//                   style={[
//                     styles.activityItem,
//                     index === recentActivities.length - 1 && styles.activityItemLast,
//                   ]}
//                 >
//                   <View style={styles.activityLeft}>
//                     <View
//                       style={[
//                         styles.activityDot,
//                         {
//                           backgroundColor:
//                             activity.activityType === 'success' ? '#10B981' : '#3B82F6',
//                         },
//                       ]}
//                     />
//                     <View style={styles.activityContent}>
//                       <Text style={styles.activityAction}>{activity.action}</Text>
//                       {activity.student && (
//                         <Text style={styles.activityStudent}>{activity.student}</Text>
//                       )}
//                     </View>
//                   </View>
//                   <Text style={styles.activityTime}>{activity.time}</Text>
//                 </View>
//               ))
//             )}
//           </View>
//         </View>
//       </ScrollView>

//       {/* Side Drawer Modal */}
//       <Modal
//         visible={drawerVisible}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setDrawerVisible(false)}
//       >
//         <Pressable
//           style={styles.drawerOverlay}
//           onPress={() => setDrawerVisible(false)}
//         >
//           <Pressable
//             style={[styles.drawerContainer, { paddingTop: insets.top }]}
//             onPress={(e) => e.stopPropagation()}
//           >
//             {/* Drawer Header */}
//             <LinearGradient
//               colors={['#4F46E5', '#9333EA']}
//               style={styles.drawerHeader}
//             >
//               <View style={styles.drawerHeaderContent}>
//                 <View style={styles.drawerHeaderLeft}>
//                   <View style={styles.drawerIconContainer}>
//                     <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
//                   </View>
//                   <View>
//                     <Text style={styles.drawerTitle}>Exam Auth</Text>
//                     <Text style={styles.drawerSubtitle}>Admin Panel</Text>
//                   </View>
//                 </View>
//                 <TouchableOpacity
//                   onPress={() => setDrawerVisible(false)}
//                   style={styles.closeButton}
//                 >
//                   <Ionicons name="close" size={28} color="#FFFFFF" />
//                 </TouchableOpacity>
//               </View>
//             </LinearGradient>

//             {/* Drawer Menu */}
//             <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
//               {drawerMenuItems.map((item) => {
//                 const isActive = pathname === item.route;
//                 return (
//                   <TouchableOpacity
//                     key={item.id}
//                     style={[
//                       styles.drawerMenuItem,
//                       isActive && styles.drawerMenuItemActive,
//                     ]}
//                     onPress={() => handleMenuClick(item)}
//                     activeOpacity={0.7}
//                   >
//                     {renderIcon(item, isActive)}
//                     <Text
//                       style={[
//                         styles.drawerMenuText,
//                         isActive && styles.drawerMenuTextActive,
//                       ]}
//                     >
//                       {item.title}
//                     </Text>
//                   </TouchableOpacity>
//                 );
//               })}
//             </ScrollView>

//             {/* Drawer Footer */}
//             <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 16 }]}>
//               <TouchableOpacity
//                 onPress={handleSignOut}
//                 disabled={isLoggingOut}
//                 style={[
//                   styles.logoutButton,
//                   isLoggingOut && styles.logoutButtonDisabled,
//                 ]}
//                 activeOpacity={0.7}
//               >
//                 {isLoggingOut ? (
//                   <ActivityIndicator size="small" color="#DC2626" />
//                 ) : (
//                   <Ionicons name="log-out-outline" size={22} color="#DC2626" />
//                 )}
//                 <Text style={styles.logoutText}>
//                   {isLoggingOut ? 'Logging out...' : 'Logout'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   header: {
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   headerContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   menuButton: {
//     padding: 4,
//   },
//   headerTitle: {
//     fontSize: isTablet ? 22 : 20,
//     fontWeight: 'bold',
//     color: '#1F2937',
//     flex: 1,
//     marginLeft: 16,
//   },
//   timeContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   headerTime: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#6B7280',
//     fontWeight: '500',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   greetingContainer: {
//     borderRadius: 16,
//     padding: isTablet ? 32 : 24,
//     margin: isTablet ? 24 : 16,
//     marginBottom: isTablet ? 24 : 16,
//   },
//   greetingContent: {
//     flexDirection: isTablet ? 'row' : 'column',
//     justifyContent: 'space-between',
//     alignItems: isTablet ? 'center' : 'flex-start',
//   },
//   greetingText: {
//     fontSize: isTablet ? 28 : 24,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//     marginBottom: 4,
//   },
//   greetingSubtext: {
//     fontSize: isTablet ? 16 : 14,
//     color: '#C7D2FE',
//   },
//   dateTimeContainer: {
//     marginTop: isTablet ? 0 : 16,
//   },
//   dateRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   dateText: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#C7D2FE',
//     marginLeft: 8,
//     fontWeight: '500',
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     paddingHorizontal: isTablet ? 16 : 8,
//     marginBottom: isTablet ? 24 : 16,
//   },
//   statCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: isTablet ? 24 : 16,
//     margin: isTablet ? 8 : 8,
//     width: isTablet ? '23%' : '45%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   statCardTablet: {
//     width: '23%',
//   },
//   statIconContainer: {
//     width: isTablet ? 56 : 48,
//     height: isTablet ? 56 : 48,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   statLabel: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#6B7280',
//     fontWeight: '500',
//     marginBottom: 4,
//   },
//   statValue: {
//     fontSize: isTablet ? 32 : 28,
//     fontWeight: 'bold',
//     color: '#1F2937',
//   },
//   sectionContainer: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: isTablet ? 24 : 16,
//     marginHorizontal: isTablet ? 24 : 16,
//     marginBottom: isTablet ? 24 : 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   lastSection: {
//     marginBottom: isTablet ? 32 : 24,
//   },
//   sectionTitle: {
//     fontSize: isTablet ? 22 : 20,
//     fontWeight: 'bold',
//     color: '#1F2937',
//     marginBottom: isTablet ? 20 : 16,
//   },
//   quickActionsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginHorizontal: isTablet ? -8 : -4,
//   },
//   quickActionCard: {
//     borderRadius: 12,
//     padding: isTablet ? 24 : 16,
//     margin: isTablet ? 8 : 4,
//     width: isTablet ? '23%' : '47%',
//     alignItems: 'center',
//     justifyContent: 'center',
//     minHeight: isTablet ? 140 : 120,
//   },
//   quickActionCardTablet: {
//     width: '23%',
//   },
//   quickActionText: {
//     fontSize: isTablet ? 15 : 14,
//     fontWeight: '600',
//     marginTop: 12,
//     textAlign: 'center',
//   },
//   activityContainer: {
//     minHeight: 200,
//   },
//   loadingContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyText: {
//     fontSize: isTablet ? 16 : 14,
//     color: '#6B7280',
//     marginTop: 16,
//     fontWeight: '500',
//   },
//   emptySubtext: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#9CA3AF',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   activityItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: isTablet ? 16 : 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   activityItemLast: {
//     borderBottomWidth: 0,
//   },
//   activityLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   activityDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 12,
//   },
//   activityContent: {
//     flex: 1,
//   },
//   activityAction: {
//     fontSize: isTablet ? 16 : 14,
//     color: '#374151',
//     fontWeight: '500',
//   },
//   activityStudent: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#6B7280',
//     marginTop: 2,
//   },
//   activityTime: {
//     fontSize: isTablet ? 13 : 12,
//     color: '#6B7280',
//     marginLeft: 12,
//   },
//   // Drawer Styles
//   drawerOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'flex-start',
//   },
//   drawerContainer: {
//     width: DRAWER_WIDTH,
//     height: '100%',
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 2, height: 0 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   drawerHeader: {
//     padding: 20,
//     paddingBottom: 24,
//   },
//   drawerHeaderContent: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   drawerHeaderLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   drawerIconContainer: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   drawerTitle: {
//     fontSize: isTablet ? 20 : 18,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//   },
//   drawerSubtitle: {
//     fontSize: isTablet ? 14 : 12,
//     color: '#C7D2FE',
//     marginTop: 2,
//   },
//   closeButton: {
//     padding: 4,
//   },
//   drawerMenu: {
//     flex: 1,
//     paddingHorizontal: 12,
//     paddingTop: 8,
//   },
//   drawerMenuItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 10,
//     marginBottom: 4,
//   },
//   drawerMenuItemActive: {
//     backgroundColor: '#EEF2FF',
//   },
//   drawerMenuText: {
//     fontSize: isTablet ? 16 : 15,
//     color: '#6B7280',
//     fontWeight: '500',
//     marginLeft: 12,
//   },
//   drawerMenuTextActive: {
//     color: '#4F46E5',
//     fontWeight: '600',
//   },
//   drawerFooter: {
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//     padding: 16,
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 10,
//     backgroundColor: '#FEF2F2',
//   },
//   logoutButtonDisabled: {
//     opacity: 0.5,
//   },
//   logoutText: {
//     fontSize: isTablet ? 16 : 15,
//     color: '#DC2626',
//     fontWeight: '600',
//     marginLeft: 10,
//   },
// });


// // import React, { useState, useEffect, useCallback } from 'react';
// // import {
// //   View,
// //   Text,
// //   ScrollView,
// //   TouchableOpacity,
// //   StyleSheet,
// //   ActivityIndicator,
// //   RefreshControl,
// //   useWindowDimensions,
// //   Platform,
// // } from 'react-native';
// // import { DrawerContentScrollView } from '@react-navigation/drawer';
// // import {
// //   Ionicons,
// //   MaterialCommunityIcons,
// //   MaterialIcons,
// // } from '@expo/vector-icons';
// // import { LinearGradient } from 'expo-linear-gradient';
// // import { useNavigation } from '@react-navigation/native';
// // import { getDashboardStats, getRecentActivity } from '@/lib/appwrite';
// // import { useAuth } from '@/lib/useAuth';

// // // Custom Drawer Content Component
// // export function CustomDrawerContent(props) {
// //   const navigation = useNavigation();
// //   const { user, logout } = useAuth();
// //   const [isLoggingOut, setIsLoggingOut] = useState(false);
// //   const [activeMenu, setActiveMenu] = useState('dashboard');

// //   const menuItems = [
// //     {
// //       id: 'dashboard',
// //       title: 'Dashboard',
// //       icon: 'home-outline',
// //       iconSet: Ionicons,
// //       screen: 'AdminDashboard',
// //     },
// //     {
// //       id: 'students',
// //       title: 'Students',
// //       icon: 'people-outline',
// //       iconSet: Ionicons,
// //       screen: 'Students',
// //     },
// //     {
// //       id: 'courses',
// //       title: 'Courses',
// //       icon: 'book-outline',
// //       iconSet: Ionicons,
// //       screen: 'CourseUpload',
// //     },
// //     {
// //       id: 'verify',
// //       title: 'Verify Student',
// //       icon: 'shield-checkmark-outline',
// //       iconSet: Ionicons,
// //       screen: 'Verify',
// //     },
// //     {
// //       id: 'attendance',
// //       title: 'Mark Attendance',
// //       icon: 'clipboard-outline',
// //       iconSet: Ionicons,
// //       screen: 'Attendance',
// //     },
// //     {
// //       id: 'attendanceReports',
// //       title: 'View Reports',
// //       icon: 'stats-chart-outline',
// //       iconSet: Ionicons,
// //       screen: 'AttendanceReports',
// //     },
// //     {
// //       id: 'exam-sessions',
// //       title: 'Registered Courses',
// //       icon: 'school-outline',
// //       iconSet: Ionicons,
// //       screen: 'RegisteredCourse',
// //     },
// //     {
// //       id: 'sub-admin',
// //       title: 'Sub Admin',
// //       icon: 'person-add-outline',
// //       iconSet: Ionicons,
// //       screen: 'SubAdmin',
// //     },
// //     {
// //       id: 'manageAdmins',
// //       title: 'Manage Admins',
// //       icon: 'people-circle-outline',
// //       iconSet: Ionicons,
// //       screen: 'ManageAdmins',
// //     },
// //   ];

// //   const handleMenuClick = (item) => {
// //     setActiveMenu(item.id);
// //     navigation.navigate(item.screen);
// //   };

// //   const handleSignOut = async () => {
// //     if (isLoggingOut) return;

// //     try {
// //       setIsLoggingOut(true);
// //       await logout();
// //       navigation.reset({
// //         index: 0,
// //         routes: [{ name: 'AdminLogin' }],
// //       });
// //     } catch (error) {
// //       console.error('Logout error:', error);
// //       navigation.reset({
// //         index: 0,
// //         routes: [{ name: 'AdminLogin' }],
// //       });
// //     } finally {
// //       setIsLoggingOut(false);
// //     }
// //   };

// //   return (
// //     <View style={styles.drawerContainer}>
// //       {/* Drawer Header */}
// //       <LinearGradient
// //         colors={['#4F46E5', '#7C3AED']}
// //         style={styles.drawerHeader}
// //       >
// //         <TouchableOpacity
// //           style={styles.drawerHeaderContent}
// //           onPress={() => handleMenuClick({ id: 'dashboard', screen: 'AdminDashboard' })}
// //         >
// //           <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
// //           <View style={styles.drawerHeaderText}>
// //             <Text style={styles.drawerTitle}>Exam Auth</Text>
// //             <Text style={styles.drawerSubtitle}>Admin Panel</Text>
// //           </View>
// //         </TouchableOpacity>
// //       </LinearGradient>

// //       {/* Drawer Menu */}
// //       <DrawerContentScrollView
// //         {...props}
// //         contentContainerStyle={styles.drawerScrollContent}
// //         showsVerticalScrollIndicator={false}
// //       >
// //         <View style={styles.menuContainer}>
// //           {menuItems.map((item) => {
// //             const IconComponent = item.iconSet;
// //             const isActive = activeMenu === item.id;

// //             return (
// //               <TouchableOpacity
// //                 key={item.id}
// //                 style={[
// //                   styles.menuItem,
// //                   isActive && styles.menuItemActive,
// //                 ]}
// //                 onPress={() => handleMenuClick(item)}
// //               >
// //                 <IconComponent
// //                   name={item.icon}
// //                   size={20}
// //                   color={isActive ? '#4F46E5' : '#6B7280'}
// //                 />
// //                 <Text
// //                   style={[
// //                     styles.menuItemText,
// //                     isActive && styles.menuItemTextActive,
// //                   ]}
// //                 >
// //                   {item.title}
// //                 </Text>
// //               </TouchableOpacity>
// //             );
// //           })}
// //         </View>
// //       </DrawerContentScrollView>

// //       {/* Drawer Footer */}
// //       <View style={styles.drawerFooter}>
// //         <TouchableOpacity
// //           style={styles.logoutButton}
// //           onPress={handleSignOut}
// //           disabled={isLoggingOut}
// //         >
// //           {isLoggingOut ? (
// //             <ActivityIndicator size="small" color="#DC2626" />
// //           ) : (
// //             <Ionicons name="log-out-outline" size={20} color="#DC2626" />
// //           )}
// //           <Text style={styles.logoutButtonText}>
// //             {isLoggingOut ? 'Logging out...' : 'Logout'}
// //           </Text>
// //         </TouchableOpacity>
// //       </View>
// //     </View>
// //   );
// // }

// // // Main Dashboard Screen Component
// // export default function AdminDashboard() {
// //   const { width } = useWindowDimensions();
// //   const isTablet = width >= 768;
// //   const navigation = useNavigation();
// //   const { user, loading, checkAuth } = useAuth();

// //   const [currentTime, setCurrentTime] = useState(new Date());
// //   const [greeting, setGreeting] = useState('');
// //   const [statsLoading, setStatsLoading] = useState(true);
// //   const [activityLoading, setActivityLoading] = useState(true);
// //   const [refreshing, setRefreshing] = useState(false);
// //   const [dashboardStats, setDashboardStats] = useState({
// //     totalStudents: 0,
// //     activeCourses: 0,
// //     verifiedStudents: 0,
// //     pendingRegistrations: 0,
// //   });
// //   const [recentActivities, setRecentActivities] = useState([]);

// //   // Auth check
// //   useEffect(() => {
// //     const verifyAuth = async () => {
// //       const result = await checkAuth();

// //       if (!result.success || !result.user) {
// //         console.log('No active session, redirecting to login');
// //         navigation.reset({
// //           index: 0,
// //           routes: [{ name: 'AdminLogin' }],
// //         });
// //       }
// //     };

// //     verifyAuth();
// //   }, [checkAuth, navigation]);

// //   // Fetch dashboard statistics
// //   const fetchStats = useCallback(async () => {
// //     try {
// //       setStatsLoading(true);
// //       const result = await getDashboardStats();

// //       if (result.success) {
// //         setDashboardStats(result.data);
// //       } else {
// //         console.error('Failed to fetch stats:', result.error);
// //       }
// //     } catch (error) {
// //       console.error('Error fetching dashboard stats:', error);
// //     } finally {
// //       setStatsLoading(false);
// //     }
// //   }, []);

// //   // Fetch recent activity
// //   const fetchActivity = useCallback(async () => {
// //     try {
// //       setActivityLoading(true);
// //       const result = await getRecentActivity(4);

// //       if (result.success) {
// //         setRecentActivities(result.data);
// //       } else {
// //         console.error('Failed to fetch activity:', result.error);
// //       }
// //     } catch (error) {
// //       console.error('Error fetching recent activity:', error);
// //     } finally {
// //       setActivityLoading(false);
// //     }
// //   }, []);

// //   useEffect(() => {
// //     if (!loading) {
// //       fetchStats();
// //       fetchActivity();
// //     }
// //   }, [loading, fetchStats, fetchActivity]);

// //   // Refresh handler
// //   const onRefresh = useCallback(async () => {
// //     setRefreshing(true);
// //     await Promise.all([fetchStats(), fetchActivity()]);
// //     setRefreshing(false);
// //   }, [fetchStats, fetchActivity]);

// //   // Current time updater
// //   useEffect(() => {
// //     const timer = setInterval(() => {
// //       setCurrentTime(new Date());
// //     }, 1000);

// //     return () => clearInterval(timer);
// //   }, []);

// //   // Greeting based on time
// //   useEffect(() => {
// //     const hour = currentTime.getHours();
// //     if (hour >= 5 && hour < 12) {
// //       setGreeting('Good Morning');
// //     } else if (hour >= 12 && hour < 17) {
// //       setGreeting('Good Afternoon');
// //     } else if (hour >= 17 && hour < 21) {
// //       setGreeting('Good Evening');
// //     } else {
// //       setGreeting('Good Day');
// //     }
// //   }, [currentTime]);

// //   const formatDate = (date) => {
// //     const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
// //     return date.toLocaleDateString('en-US', options);
// //   };

// //   const formatTime = (date) => {
// //     return date.toLocaleTimeString('en-US', {
// //       hour: '2-digit',
// //       minute: '2-digit',
// //       second: '2-digit',
// //     });
// //   };

// //   const stats = [
// //     {
// //       label: 'Total Students',
// //       value: statsLoading ? '...' : dashboardStats.totalStudents.toString(),
// //       icon: 'account-outline',
// //       color: '#3B82F6',
// //       bgColor: '#DBEAFE',
// //     },
// //     {
// //       label: 'Active Courses',
// //       value: statsLoading ? '...' : dashboardStats.activeCourses.toString(),
// //       icon: 'book-open-outline',
// //       color: '#10B981',
// //       bgColor: '#D1FAE5',
// //     },
// //     {
// //       label: 'Verified Students',
// //       value: statsLoading ? '...' : dashboardStats.verifiedStudents.toString(),
// //       icon: 'account-check-outline',
// //       color: '#8B5CF6',
// //       bgColor: '#EDE9FE',
// //     },
// //     {
// //       label: 'Pending Registrations',
// //       value: statsLoading ? '...' : dashboardStats.pendingRegistrations.toString(),
// //       icon: 'clock-outline',
// //       color: '#F59E0B',
// //       bgColor: '#FEF3C7',
// //     },
// //   ];

// //   const quickActions = [
// //     {
// //       label: 'Add Student',
// //       icon: 'account-plus-outline',
// //       color: '#3B82F6',
// //       bgColor: '#DBEAFE',
// //       screen: 'Students',
// //     },
// //     {
// //       label: 'Upload Course',
// //       icon: 'cloud-upload-outline',
// //       color: '#10B981',
// //       bgColor: '#D1FAE5',
// //       screen: 'CourseUpload',
// //     },
// //     {
// //       label: 'Verify Student',
// //       icon: 'shield-check-outline',
// //       color: '#8B5CF6',
// //       bgColor: '#EDE9FE',
// //       screen: 'Verify',
// //     },
// //     {
// //       label: 'Exam Session',
// //       icon: 'school-outline',
// //       color: '#F59E0B',
// //       bgColor: '#FEF3C7',
// //       screen: 'RegisteredCourse',
// //     },
// //   ];

// //   const handleQuickAction = (screen) => {
// //     navigation.navigate(screen);
// //   };

// //   if (loading) {
// //     return (
// //       <View style={styles.loadingContainer}>
// //         <ActivityIndicator size="large" color="#4F46E5" />
// //         <Text style={styles.loadingText}>Loading...</Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       {/* Header */}
// //       <View style={styles.header}>
// //         <View style={styles.headerContent}>
// //           <TouchableOpacity
// //             style={styles.menuButton}
// //             onPress={() => navigation.openDrawer()}
// //           >
// //             <Ionicons name="menu" size={24} color="#1F2937" />
// //           </TouchableOpacity>
// //           <Text style={styles.headerTitle}>Admin Dashboard</Text>
// //         </View>
// //         <View style={styles.headerRight}>
// //           <Ionicons name="time-outline" size={16} color="#6B7280" />
// //           <Text style={styles.headerTime}>{formatTime(currentTime)}</Text>
// //         </View>
// //       </View>

// //       <ScrollView
// //         style={styles.scrollView}
// //         contentContainerStyle={styles.scrollContent}
// //         showsVerticalScrollIndicator={false}
// //         refreshControl={
// //           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
// //         }
// //       >
// //         {/* Greeting Section */}
// //         <LinearGradient
// //           colors={['#4F46E5', '#7C3AED']}
// //           style={styles.greetingCard}
// //         >
// //           <View style={styles.greetingContent}>
// //             <View>
// //               <Text style={styles.greetingText}>
// //                 {greeting}, {user?.username || 'Admin'}! 👋
// //               </Text>
// //               <Text style={styles.greetingSubtext}>
// //                 Biometrics Exam Authentication System
// //               </Text>
// //             </View>
// //             <View style={styles.dateContainer}>
// //               <View style={styles.dateRow}>
// //                 <Ionicons name="calendar-outline" size={16} color="#C7D2FE" />
// //                 <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
// //               </View>
// //             </View>
// //           </View>
// //         </LinearGradient>

// //         {/* Stats Cards */}
// //         <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
// //           {stats.map((stat, index) => (
// //             <View
// //               key={index}
// //               style={[
// //                 styles.statCard,
// //                 isTablet && styles.statCardTablet,
// //               ]}
// //             >
// //               <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
// //                 <MaterialCommunityIcons
// //                   name={stat.icon}
// //                   size={20}
// //                   color={stat.color}
// //                 />
// //               </View>
// //               <Text style={styles.statLabel}>{stat.label}</Text>
// //               <Text style={styles.statValue}>{stat.value}</Text>
// //             </View>
// //           ))}
// //         </View>

// //         {/* Quick Actions */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Quick Actions</Text>
// //           <View style={[styles.quickActionsGrid, isTablet && styles.quickActionsGridTablet]}>
// //             {quickActions.map((action, index) => (
// //               <TouchableOpacity
// //                 key={index}
// //                 style={[
// //                   styles.quickActionCard,
// //                   { backgroundColor: action.bgColor },
// //                   isTablet && styles.quickActionCardTablet,
// //                 ]}
// //                 onPress={() => handleQuickAction(action.screen)}
// //               >
// //                 <MaterialCommunityIcons
// //                   name={action.icon}
// //                   size={32}
// //                   color={action.color}
// //                 />
// //                 <Text style={[styles.quickActionLabel, { color: action.color }]}>
// //                   {action.label}
// //                 </Text>
// //               </TouchableOpacity>
// //             ))}
// //           </View>
// //         </View>

// //         {/* Recent Activity */}
// //         <View style={styles.section}>
// //           <Text style={styles.sectionTitle}>Recent Activity</Text>
// //           <View style={styles.activityCard}>
// //             {activityLoading ? (
// //               <View style={styles.activityLoading}>
// //                 {[1, 2, 3, 4].map((i) => (
// //                   <View key={i} style={styles.activitySkeletonItem}>
// //                     <View style={styles.activitySkeletonDot} />
// //                     <View style={styles.activitySkeletonContent}>
// //                       <View style={styles.activitySkeletonLine} />
// //                       <View style={styles.activitySkeletonLineSmall} />
// //                     </View>
// //                   </View>
// //                 ))}
// //               </View>
// //             ) : recentActivities.length === 0 ? (
// //               <View style={styles.emptyActivity}>
// //                 <MaterialIcons name="assignment" size={64} color="#D1D5DB" />
// //                 <Text style={styles.emptyActivityText}>No recent activity</Text>
// //                 <Text style={styles.emptyActivitySubtext}>
// //                   Activities will appear here as you use the system
// //                 </Text>
// //               </View>
// //             ) : (
// //               <View style={styles.activityList}>
// //                 {recentActivities.map((activity, index) => (
// //                   <View
// //                     key={index}
// //                     style={[
// //                       styles.activityItem,
// //                       index === recentActivities.length - 1 && styles.activityItemLast,
// //                     ]}
// //                   >
// //                     <View style={styles.activityItemContent}>
// //                       <View
// //                         style={[
// //                           styles.activityDot,
// //                           {
// //                             backgroundColor:
// //                               activity.activityType === 'success'
// //                                 ? '#10B981'
// //                                 : '#3B82F6',
// //                           },
// //                         ]}
// //                       />
// //                       <View style={styles.activityTextContainer}>
// //                         <Text style={styles.activityAction}>{activity.action}</Text>
// //                         {activity.student && (
// //                           <Text style={styles.activityStudent}>
// //                             {activity.student}
// //                           </Text>
// //                         )}
// //                       </View>
// //                     </View>
// //                     <Text style={styles.activityTime}>{activity.time}</Text>
// //                   </View>
// //                 ))}
// //               </View>
// //             )}
// //           </View>
// //         </View>
// //       </ScrollView>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#F9FAFB',
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     backgroundColor: '#F9FAFB',
// //   },
// //   loadingText: {
// //     marginTop: 12,
// //     fontSize: 16,
// //     color: '#6B7280',
// //     fontWeight: '500',
// //   },
// //   // Drawer Styles
// //   drawerContainer: {
// //     flex: 1,
// //     backgroundColor: '#FFFFFF',
// //   },
// //   drawerHeader: {
// //     paddingTop: Platform.OS === 'ios' ? 50 : 30,
// //     paddingBottom: 20,
// //     paddingHorizontal: 20,
// //   },
// //   drawerHeaderContent: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   drawerHeaderText: {
// //     marginLeft: 12,
// //   },
// //   drawerTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: '#FFFFFF',
// //   },
// //   drawerSubtitle: {
// //     fontSize: 12,
// //     color: '#C7D2FE',
// //     marginTop: 2,
// //   },
// //   drawerScrollContent: {
// //     paddingTop: 8,
// //   },
// //   menuContainer: {
// //     paddingHorizontal: 12,
// //   },
// //   menuItem: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingVertical: 12,
// //     paddingHorizontal: 16,
// //     borderRadius: 8,
// //     marginBottom: 4,
// //   },
// //   menuItemActive: {
// //     backgroundColor: '#EEF2FF',
// //   },
// //   menuItemText: {
// //     marginLeft: 12,
// //     fontSize: 14,
// //     fontWeight: '500',
// //     color: '#6B7280',
// //   },
// //   menuItemTextActive: {
// //     color: '#4F46E5',
// //   },
// //   drawerFooter: {
// //     borderTopWidth: 1,
// //     borderTopColor: '#E5E7EB',
// //     padding: 16,
// //   },
// //   logoutButton: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     paddingVertical: 12,
// //     paddingHorizontal: 16,
// //     borderRadius: 8,
// //     backgroundColor: '#FEF2F2',
// //   },
// //   logoutButtonText: {
// //     marginLeft: 8,
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: '#DC2626',
// //   },
// //   // Header Styles
// //   header: {
// //     backgroundColor: '#FFFFFF',
// //     paddingTop: Platform.OS === 'ios' ? 50 : 20,
// //     paddingBottom: 16,
// //     paddingHorizontal: 16,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'space-between',
// //     ...Platform.select({
// //       ios: {
// //         shadowColor: '#000',
// //         shadowOffset: { width: 0, height: 2 },
// //         shadowOpacity: 0.1,
// //         shadowRadius: 3,
// //       },
// //       android: {
// //         elevation: 4,
// //       },
// //     }),
// //   },
// //   headerContent: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   menuButton: {
// //     marginRight: 12,
// //   },
// //   headerTitle: {
// //     fontSize: 20,
// //     fontWeight: 'bold',
// //     color: '#1F2937',
// //   },
// //   headerRight: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   headerTime: {
// //     marginLeft: 6,
// //     fontSize: 12,
// //     color: '#6B7280',
// //   },
// //   // ScrollView Styles
// //   scrollView: {
// //     flex: 1,
// //   },
// //   scrollContent: {
// //     padding: 16,
// //     paddingBottom: 32,
// //   },
// //   // Greeting Card Styles
// //   greetingCard: {
// //     borderRadius: 16,
// //     padding: 24,
// //     marginBottom: 20,
// //     ...Platform.select({
// //       ios: {
// //         shadowColor: '#000',
// //         shadowOffset: { width: 0, height: 4 },
// //         shadowOpacity: 0.15,
// //         shadowRadius: 8,
// //       },
// //       android: {
// //         elevation: 8,
// //       },
// //     }),
// //   },
// //   greetingContent: {
// //     flexDirection: 'column',
// //   },
// //   greetingText: {
// //     fontSize: 22,
// //     fontWeight: 'bold',
// //     color: '#FFFFFF',
// //     marginBottom: 4,
// //   },
// //   greetingSubtext: {
// //     fontSize: 14,
// //     color: '#C7D2FE',
// //   },
// //   dateContainer: {
// //     marginTop: 16,
// //   },
// //   dateRow: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   dateText: {
// //     marginLeft: 8,
// //     fontSize: 12,
// //     fontWeight: '500',
// //     color: '#C7D2FE',
// //   },
// //   // Stats Grid Styles
// //   statsGrid: {
// //     flexDirection: 'row',
// //     flexWrap: 'wrap',
// //     marginHorizontal: -6,
// //     marginBottom: 20,
// //   },
// //   statsGridTablet: {
// //     marginHorizontal: -8,
// //   },
// //   statCard: {
// //     width: '50%',
// //     padding: 6,
// //   },
// //   statCardTablet: {
// //     width: '25%',
// //     padding: 8,
// //   },
// //   statIcon: {
// //     width: 48,
// //     height: 48,
// //     borderRadius: 12,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     marginBottom: 12,
// //   },
// //   statLabel: {
// //     fontSize: 12,
// //     color: '#6B7280',
// //     fontWeight: '500',
// //     marginBottom: 4,
// //   },
// //   statValue: {
// //     fontSize: 28,
// //     fontWeight: 'bold',
// //     color: '#1F2937',
// //   },
// //   // Section Styles
// //   section: {
// //     marginBottom: 24,
// //   },
// //   sectionTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: '#1F2937',
// //     marginBottom: 12,
// //   },
// //   // Quick Actions Styles
// //   quickActionsGrid: {
// //     flexDirection: 'row',
// //     flexWrap: 'wrap',
// //     marginHorizontal: -6,
// //   },
// //   quickActionsGridTablet: {
// //     marginHorizontal: -8,
// //   },
// //   quickActionCard: {
// //     width: '50%',
// //     padding: 6,
// //   },
// //   quickActionCardTablet: {
// //     width: '25%',
// //     padding: 8,
// //   },
// //   quickActionLabel: {
// //     fontSize: 12,
// //     fontWeight: '600',
// //     textAlign: 'center',
// //     marginTop: 8,
// //   },
// //   // Activity Styles
// //   activityCard: {
// //     backgroundColor: '#FFFFFF',
// //     borderRadius: 12,
// //     padding: 16,
// //     ...Platform.select({
// //       ios: {
// //         shadowColor: '#000',
// //         shadowOffset: { width: 0, height: 2 },
// //         shadowOpacity: 0.1,
// //         shadowRadius: 3,
// //       },
// //       android: {
// //         elevation: 2,
// //       },
// //     }),
// //   },
// //   activityLoading: {
// //     paddingVertical: 8,
// //   },
// //   activitySkeletonItem: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingVertical: 12,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#F3F4F6',
// //   },
// //   activitySkeletonDot: {
// //     width: 8,
// //     height: 8,
// //     borderRadius: 4,
// //     backgroundColor: '#D1D5DB',
// //   },
// //   activitySkeletonContent: {
// //     flex: 1,
// //     marginLeft: 12,
// //   },
// //   activitySkeletonLine: {
// //     height: 16,
// //     backgroundColor: '#D1D5DB',
// //     borderRadius: 4,
// //     width: '75%',
// //     marginBottom: 8,
// //   },
// //   activitySkeletonLineSmall: {
// //     height: 12,
// //     backgroundColor: '#E5E7EB',
// //     borderRadius: 4,
// //     width: '50%',
// //   },
// //   emptyActivity: {
// //     alignItems: 'center',
// //     paddingVertical: 32,
// //   },
// //   emptyActivityText: {
// //     fontSize: 14,
// //     color: '#6B7280',
// //     marginTop: 16,
// //     fontWeight: '500',
// //   },
// //   emptyActivitySubtext: {
// //     fontSize: 12,
// //     color: '#9CA3AF',
// //     marginTop: 4,
// //   },
// //   activityList: {
// //     paddingVertical: 4,
// //   },
// //   activityItem: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'space-between',
// //     paddingVertical: 12,
// //     borderBottomWidth: 1,
// //     borderBottomColor: '#F3F4F6',
// //   },
// //   activityItemLast: {
// //     borderBottomWidth: 0,
// //   },
// //   activityItemContent: {
// //     flex: 1,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     marginRight: 12,
// //   },
// //   activityDot: {
// //     width: 8,
// //     height: 8,
// //     borderRadius: 4,
// //   },
// //   activityTextContainer: {
// //     flex: 1,
// //     marginLeft: 12,
// //   },
// //   activityAction: {
// //     fontSize: 14,
// //     color: '#1F2937',
// //     fontWeight: '500',
// //   },
// //   activityStudent: {
// //     fontSize: 12,
// //     color: '#6B7280',
// //     marginTop: 2,
// //   },
// //   activityTime: {
// //     fontSize: 12,
// //     color: '#6B7280',
// //   },
// // });
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome6,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDashboardStats, getRecentActivity } from '@/lib/appwrite';
import { useAuth } from '@/lib/useAuth';

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
  
  const { user, loading, checkAuth, logout } = useAuth();

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
      route: '/(admin)/attendance',
    },
    {
      id: 'reports',
      title: 'View Reports',
      icon: 'bar-chart',
      iconType: 'Ionicons',
      route: '/(admin)/reports',
    },
    {
      id: 'registered-courses',
      title: 'Registered Courses',
      icon: 'school',
      iconType: 'Ionicons',
      route: '/(admin)/registered-courses',
    },
    {
      id: 'exam-sessions',
      title: 'Exam Sessions',
      icon: 'document-text',
      iconType: 'Ionicons',
      route: '/(admin)/exam-sessions',
    },
    {
      id: 'sub-admin',
      title: 'Sub Admin',
      icon: 'person-add',
      iconType: 'Ionicons',
      route: '/(admin)/sub-admin',
    },
    {
      id: 'manage-admins',
      title: 'Manage Admins',
      icon: 'people-circle',
      iconType: 'Ionicons',
      route: '/(admin)/manage-admins',
    },
  ];

  // Auth check
  useEffect(() => {
    const verifyAuth = async () => {
      const result = await checkAuth();

      if (!result.success || !result.user) {
        console.log('No active session, redirecting to login');
        router.replace('/(auth)/signIn');
      }
    };

    verifyAuth();
  }, [checkAuth, router]);

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
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      setDrawerVisible(false);
      router.replace('/signIn');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
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
      route: '/(admin)/students',
    },
    {
      title: 'Upload Course',
      icon: 'cloud-upload',
      color: '#10B981',
      bgColor: '#D1FAE5',
      route: '/(admin)/courses',
    },
    {
      title: 'Verify Student',
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      route: '/(admin)/verify',
    },
    {
      title: 'Exam Session',
      icon: 'school',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      route: '/(admin)/exam-sessions',
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
    fontSize: isTablet ? 22 : 20,
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