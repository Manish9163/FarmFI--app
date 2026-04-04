import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ShieldCheck, UserCheck, XCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'farmer_id', label: 'Farmer ID', width: 80 },
  { key: 'credit_limit', label: 'Limit', width: 90, render: (v) => `₹${v}` },
  { key: 'used_credit', label: 'Used', width: 80, render: (v) => `₹${v}` },
  { key: 'remaining_credit', label: 'Remaining', width: 100, render: (v) => `₹${v}` },
  { key: 'due_amount', label: 'Due', width: 80, render: (v) => `₹${v}` },
];

export default function CreditView({ data, loading }) {
  const [pendingKyc, setPendingKyc] = useState(null);

  useEffect(() => {
    // Check global async storage for any pending KYC applications
    const checkPendingKyc = async () => {
      const status = await AsyncStorage.getItem('@farmfi_kyc_status');
      if (status === 'pending_admin') {
        const rawData = await AsyncStorage.getItem('@farmfi_kyc_data');
        if (rawData) setPendingKyc(JSON.parse(rawData));
      }
    };
    checkPendingKyc();
  }, []);

  const handleApprove = async () => {
    try {
      await AsyncStorage.setItem('@farmfi_kyc_status', 'verified');
      Alert.alert("Success", "Credit SPARK line approved and activated for this user.");
      setPendingKyc(null);
    } catch (e) {}
  };

  const handleReject = async () => {
    try {
      await AsyncStorage.setItem('@farmfi_kyc_status', 'pending');
      await AsyncStorage.removeItem('@farmfi_kyc_data');
      Alert.alert("Rejected", "Application rejected. User must re-apply.");
      setPendingKyc(null);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Pending Admin Approvals Queue */}
      {pendingKyc && (
        <View style={styles.pendingQueue}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
             <ShieldCheck size={20} color="#f59e0b" style={{marginRight: 8}} />
             <Text style={styles.queueTitle}>Pending KYC Approvals (1)</Text>
          </View>
          
          <View style={styles.applicationCard}>
            <View style={styles.appHeader}>
              <Text style={styles.appName}>{pendingKyc.name}</Text>
              <Text style={styles.appTime}>{new Date(pendingKyc.timestamp).toLocaleTimeString()}</Text>
            </View>
            <View style={styles.row}>
               <Text style={styles.label}>Land Size:</Text>
               <Text style={styles.val}>{pendingKyc.acres} Acres</Text>
            </View>
            <View style={styles.row}>
               <Text style={styles.label}>Aadhaar UID:</Text>
               <Text style={[styles.val, {fontFamily: 'monospace'}]}>{pendingKyc.aadhaar}</Text>
            </View>
            <View style={styles.row}>
               <Text style={styles.label}>PAN Card:</Text>
               <Text style={[styles.val, {fontFamily: 'monospace'}]}>{pendingKyc.pan}</Text>
            </View>

            <View style={styles.actionRow}>
               <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#10b981'}]} onPress={handleApprove}>
                  <UserCheck size={18} color="#09090b" style={{marginRight: 6}} />
                  <Text style={[styles.btnText, {color: '#09090b'}]}>Approve application</Text>
               </TouchableOpacity>

               <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', flex: 0.4}]} onPress={handleReject}>
                  <XCircle size={18} color="#ef4444" style={{marginRight: 6}} />
                  <Text style={[styles.btnText, {color: '#ef4444'}]}>Reject</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Standard Active Accounts Database */}
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: pendingKyc ? 24 : 0}}>
         <Text style={styles.queueTitle}>Active Credit Accounts</Text>
      </View>
      <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No credit accounts found" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pendingQueue: { marginBottom: 20 },
  queueTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  applicationCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12 },
  appName: { color: '#f59e0b', fontSize: 18, fontWeight: '800' },
  appTime: { color: '#64748b', fontSize: 12 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#94a3b8', fontSize: 14 },
  val: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 14 }
});
