import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { ADMIN_API } from '../../config/api';
import { useAuth } from '../../hooks/useAuth';

export default function KycView({ data, loading, onRefresh }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(null); // id of KYC being processed

  const handleUpdateStatus = async (kycId, newStatus) => {
    Alert.alert('Confirm Update', `Are you sure you want to mark this KYC as ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Proceed', 
        onPress: async () => {
          setProcessing(kycId);
          try {
            await axios.patch(`${ADMIN_API}/kyc/${kycId}`, { status: newStatus }, {
              headers: { Authorization: `Bearer ${user.token}` }
            });
            onRefresh();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || e.message);
          }
          setProcessing(null);
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.role}>Role: {item.role_name}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'verified' ? 'rgba(16,185,129,0.1)' : 
                          item.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' 
        }]}>
          <Text style={[styles.statusText, { 
            color: item.status === 'verified' ? '#10b981' : 
                   item.status === 'rejected' ? '#ef4444' : '#f59e0b' 
          }]}>
            {(item.status || 'PENDING').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>AADHAAR</Text>
          <Text style={styles.detailValue}>{item.aadhaar}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>PAN</Text>
          <Text style={styles.detailValue}>{item.pan}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>FARM SIZE / AGE</Text>
          <Text style={styles.detailValue}>{item.farm_size} acres / {item.age} yrs</Text>
        </View>
      </View>

      {item.status === 'pending_admin' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.btn, styles.approveBtn]} 
            onPress={() => handleUpdateStatus(item.id, 'verified')}
            disabled={processing === item.id}
          >
            <CheckCircle size={16} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
          <View style={{width: 12}} />
          <TouchableOpacity 
            style={[styles.btn, styles.rejectBtn]} 
            onPress={() => handleUpdateStatus(item.id, 'rejected')}
            disabled={processing === item.id}
          >
            <XCircle size={16} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KYC Approvals</Text>
      <Text style={styles.subtitle}>Review and approve pending Farmer credit applications.</Text>
      
      {loading && !data.length ? (
        <Text style={styles.loadingText}>Loading applications...</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No KYC applications found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  loadingText: { color: '#94a3b8', marginTop: 20, textAlign: 'center' },
  emptyText: { color: '#94a3b8', marginTop: 40, textAlign: 'center', fontSize: 14 },
  
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 16,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  role: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10 },
  detailCol: { flex: 1, minWidth: '30%' },
  detailLabel: { fontSize: 10, color: '#64748b', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '600' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' }
});
