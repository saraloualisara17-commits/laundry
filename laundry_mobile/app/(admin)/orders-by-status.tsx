import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { adminApi } from '../../src/services/adminApi';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { StatusBadge } from '../../components/admin/StatusBadge';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OrdersByStatusScreen() {
  const { status } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersData, setOrdersData] = useState<any>(null);
  
  // Filters
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<{ visible: boolean, mode: 'date', type: 'start' | 'end' }>({ visible: false, mode: 'date', type: 'start' });

  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'PENDING_PICKUP': return { label: 'En attente', emoji: '⏳', color: '#D97706', bg: '#F59E0B' };
      case 'PICKED_UP': return { label: 'Récupérées', emoji: '📥', color: '#2563EB', bg: '#3B82F6' };
      case 'READY_FOR_DELIVERY': return { label: 'Prêtes', emoji: '✅', color: '#92400E', bg: '#C9A84C' };
      case 'DELIVERED': return { label: 'Livrées', emoji: '🚚', color: '#065F46', bg: '#10B981' };
      default: return { label: s, emoji: '📦', color: AdminColors.primary, bg: AdminColors.primary100 };
    }
  };

  const statusConfig = getStatusConfig(status as string);

  const fetchFilters = async () => {
    try {
      const usersRes = await adminApi.getUsers();
      setStaffList(usersRes.data);
    } catch (e) {
      console.error('Failed to load staff list', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        status: status,
        page: 0,
        limit: 100 // Fetch up to 100 for now
      };
      
      if (dateDebut) {
        params.dateDebut = dateDebut.toISOString().split('T')[0];
      }
      if (dateFin) {
        params.dateFin = dateFin.toISOString().split('T')[0];
      }
      if (selectedStaffId) {
        params.livreurId = selectedStaffId;
      }

      const res = await adminApi.getOrders(params);
      setOrdersData(res.data);
    } catch (error) {
      console.error('Error fetching orders by status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchData();
  }, [status, dateDebut, dateFin, selectedStaffId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [status, dateDebut, dateFin, selectedStaffId]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker({ ...showDatePicker, visible: Platform.OS === 'ios' });
    if (event.type === 'set' && selectedDate) {
      if (showDatePicker.type === 'start') {
        setDateDebut(selectedDate);
      } else {
        setDateFin(selectedDate);
      }
    }
  };

  const clearFilters = () => {
    setDateDebut(null);
    setDateFin(null);
    setSelectedStaffId(null);
  };

  const renderOrderCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBar, { backgroundColor: statusConfig.bg }]} />
      
      <View style={styles.orderTop}>
        <Text style={styles.orderRef}>#{item.numeroCommande}</Text>
        <Text style={styles.orderAmount}>{item.montantTotal} DH</Text>
      </View>
      
      <Text style={styles.orderClientName}>{item.client?.name || item.clientNom}</Text>
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderDate}>
          <Ionicons name="calendar-outline" size={12} /> {new Date(item.dateCreation).toLocaleDateString()}
        </Text>
        {item.livreurName && (
           <Text style={styles.orderDriver}>
             <Ionicons name="person-outline" size={12} /> {item.livreurName}
           </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={AdminColors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, marginRight: 6 }}>{statusConfig.emoji}</Text>
          <Text style={styles.headerTitle}>{statusConfig.label}</Text>
        </View>
        {(dateDebut || dateFin || selectedStaffId) && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { borderColor: statusConfig.bg }]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>TOTAL COMMANDES</Text>
            <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
              {ordersData?.totalElements || 0}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>MONTANT TOTAL</Text>
            <Text style={[styles.summaryValue, { color: statusConfig.color }]}>
              {ordersData?.totalValue?.toLocaleString() || 0} DH
            </Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={styles.filterBtn}
          onPress={() => setShowDatePicker({ visible: true, mode: 'date', type: 'start' })}
        >
          <Ionicons name="calendar" size={16} color={dateDebut ? AdminColors.primary : AdminColors.textMuted} />
          <Text style={[styles.filterBtnText, dateDebut && styles.filterBtnTextActive]}>
            {dateDebut ? dateDebut.toLocaleDateString() : 'Date début'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.filterBtn}
          onPress={() => setShowDatePicker({ visible: true, mode: 'date', type: 'end' })}
        >
          <Ionicons name="calendar" size={16} color={dateFin ? AdminColors.primary : AdminColors.textMuted} />
          <Text style={[styles.filterBtnText, dateFin && styles.filterBtnTextActive]}>
            {dateFin ? dateFin.toLocaleDateString() : 'Date fin'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.filterBtn}
          onPress={() => setShowStaffModal(true)}
        >
          <Ionicons name="person" size={16} color={selectedStaffId ? AdminColors.primary : AdminColors.textMuted} />
          <Text style={[styles.filterBtnText, selectedStaffId && styles.filterBtnTextActive]} numberOfLines={1}>
            {selectedStaffId ? staffList.find(s => s.id === selectedStaffId)?.name || 'Staff' : 'Staff'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={statusConfig.color} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ordersData?.content || []}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={statusConfig.color} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📄</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, textAlign: 'center' }}>
                Aucune commande
              </Text>
              <Text style={{ fontSize: 14, color: AdminColors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                Aucune commande ne correspond à ces critères
              </Text>
            </View>
          }
        />
      )}

      {/* Date Picker */}
      {showDatePicker.visible && (
        <DateTimePicker
          value={(showDatePicker.type === 'start' ? dateDebut : dateFin) || new Date()}
          mode={showDatePicker.mode}
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Staff Modal */}
      <Modal
        visible={showStaffModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowStaffModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filtrer par Staff</Text>
            
            <ScrollView style={{ maxHeight: 300, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.staffOption, !selectedStaffId && styles.staffOptionActive]}
                onPress={() => { setSelectedStaffId(null); setShowStaffModal(false); }}
              >
                <Text style={[styles.staffOptionText, !selectedStaffId && styles.staffOptionTextActive]}>Tous les staffs</Text>
                {!selectedStaffId && <Ionicons name="checkmark" size={20} color={AdminColors.primary} />}
              </TouchableOpacity>
              
              {staffList.map(staff => (
                <TouchableOpacity 
                  key={staff.id} 
                  style={[styles.staffOption, selectedStaffId === staff.id && styles.staffOptionActive]}
                  onPress={() => { setSelectedStaffId(staff.id); setShowStaffModal(false); }}
                >
                  <Text style={[styles.staffOptionText, selectedStaffId === staff.id && styles.staffOptionTextActive]}>{staff.name}</Text>
                  {selectedStaffId === staff.id && <Ionicons name="checkmark" size={20} color={AdminColors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setShowStaffModal(false)}
            >
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    ...AdminShadows.shadowSmall,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: AdminColors.primary50,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    borderTopWidth: 4,
    ...AdminShadows.shadowSmall,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  filtersContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AdminColors.border,
    ...AdminShadows.shadowSmall,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.textSecondary,
  },
  filterBtnTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...AdminShadows.shadowSmall,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.textMuted,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  orderClientName: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 10,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  orderDate: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  orderDriver: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.textPrimary,
    marginBottom: 20,
  },
  staffOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    paddingHorizontal: 10,
  },
  staffOptionActive: {
    backgroundColor: AdminColors.primary50,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  staffOptionText: {
    fontSize: 15,
    color: AdminColors.textPrimary,
  },
  staffOptionTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 14,
    backgroundColor: AdminColors.surface2,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.textSecondary,
  },
});
