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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllAdminUsers, updateAdminUserStatus, deleteAdminUser } from '@/lib/appwrite';

export default function AdminManagement() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await getAllAdminUsers();
      if (result.success) {
        setAdmins(result.data);
      } else {
        setError(result.error || 'Failed to load admins');
      }
    } catch (err) {
      setError('Error loading admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdmins();
    setRefreshing(false);
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    Alert.alert(
      currentStatus ? 'Deactivate Admin' : 'Activate Admin',
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentStatus ? 'Deactivate' : 'Activate',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = await updateAdminUserStatus(adminId, !currentStatus);
              if (result.success) {
                showSuccessMessage(result.message);
                fetchAdmins();
              } else {
                setError(result.error);
              }
            } catch (err) {
              setError('Failed to update admin status');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (adminId, username) => {
    Alert.alert(
      'Delete Admin',
      `Are you sure you want to delete admin "${username}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAdminUser(adminId);
              if (result.success) {
                showSuccessMessage(result.message);
                fetchAdmins();
              } else {
                setError(result.error);
              }
            } catch (err) {
              setError('Failed to delete admin');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="group" size={40} color="#6366F1" />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Admin Management</Text>
                <Text style={styles.headerSubtitle}>
                  Manage administrator accounts and permissions
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchAdmins}
            >
              <MaterialIcons name="refresh" size={20} color="#6B7280" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/sub-admin')}
            >
              <LinearGradient
                colors={['#6366F1', '#9333EA']}
                style={styles.addButtonGradient}
              >
                <MaterialIcons name="person-add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Admin</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Message */}
        {successMessage && (
          <View style={styles.successContainer}>
            <MaterialIcons name="check-circle" size={24} color="#10B981" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Admin List Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Administrator Accounts</Text>
            <Text style={styles.cardSubtitle}>
              Total: {admins.length} admin{admins.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading admins...</Text>
            </View>
          ) : admins.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No administrators found</Text>
              <Text style={styles.emptySubtitle}>
                Click "Add Admin" to create one
              </Text>
            </View>
          ) : (
            <View style={styles.adminList}>
              {admins.map((admin, index) => (
                <View
                  key={admin.id}
                  style={[
                    styles.adminItem,
                    index === admins.length - 1 && styles.adminItemLast
                  ]}
                >
                  {/* Admin Info */}
                  <View style={styles.adminHeader}>
                    <View style={styles.adminInfo}>
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                          {admin.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.adminDetails}>
                        <Text style={styles.adminName}>{admin.username}</Text>
                        <Text style={styles.adminId}>
                          ID: {admin.id.substring(0, 8)}...
                        </Text>
                        <Text style={styles.adminEmail}>{admin.email}</Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={styles.statusContainer}>
                      {admin.isActive ? (
                        <View style={styles.activeStatusBadge}>
                          <MaterialIcons name="check-circle" size={16} color="#10B981" />
                          <Text style={styles.activeStatusText}>Active</Text>
                        </View>
                      ) : (
                        <View style={styles.inactiveStatusBadge}>
                          <MaterialIcons name="block" size={16} color="#DC2626" />
                          <Text style={styles.inactiveStatusText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Created Date */}
                  <Text style={styles.createdDate}>
                    Created: {formatDate(admin.createdAt)}
                  </Text>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        admin.isActive ? styles.deactivateButton : styles.activateButton
                      ]}
                      onPress={() => handleToggleStatus(admin.id, admin.isActive)}
                    >
                      <MaterialIcons
                        name={admin.isActive ? 'block' : 'check-circle'}
                        size={18}
                        color={admin.isActive ? '#D97706' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          admin.isActive ? styles.deactivateButtonText : styles.activateButtonText
                        ]}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(admin.id, admin.username)}
                    >
                      <MaterialIcons name="delete" size={18} color="#DC2626" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerContent: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6EE7B7',
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  errorText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  adminList: {
    padding: 16,
  },
  adminItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  adminItemLast: {
    borderBottomWidth: 0,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  adminInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
  },
  adminDetails: {
    marginLeft: 12,
    flex: 1,
  },
  adminName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  adminId: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  adminEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusContainer: {
    marginLeft: 12,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  inactiveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveStatusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  createdDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  deactivateButton: {
    backgroundColor: '#FEF3C7',
  },
  activateButton: {
    backgroundColor: '#D1FAE5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  deactivateButtonText: {
    color: '#D97706',
  },
  activateButtonText: {
    color: '#10B981',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
});