import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, TextInput, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Landmark, CreditCard, ShieldCheck, FileText, CheckCircle2, Lock, X, Wallet, ArrowRight, Zap, TrendingUp, CalendarDays, History, Loader2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../config/api';

const { width } = Dimensions.get('window');

export default function CreditScreen({ navigation }) {
  const { user } = useAuth();

  // KYC State Management
  const [kycStatus, setKycStatus] = useState('pending'); // 'pending', 'processing', 'pending_admin', 'verified', 'expired'
  const [showKycModal, setShowKycModal] = useState(false);

  // KYC Form Data
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [landAcres, setLandAcres] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');

  useEffect(() => {
    // Read from verified MySQL Database Pipeline first!
    const loadKyc = async () => {
      try {
        if (user?.token) {
          const res = await axios.get(`${API_BASE}/credit/kyc`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setKycStatus(res.data.status || 'pending');
        } else {
          const status = await AsyncStorage.getItem('@farmfi_kyc_status');
          if (status) setKycStatus(status);
        }
      } catch (e) {
        console.log("KYC Load Error", e);
      }
    };
    loadKyc();
  }, [user]);

  // BNPL / Slice-like Financial DB State
  const MAX_CREDIT_LIMIT = 10000;
  const [usedCredit, setUsedCredit] = useState(0);
  const currentCredit = kycStatus === 'verified' ? (MAX_CREDIT_LIMIT - usedCredit) : 0;

  // Borrow Modal State
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState(1000);
  const [borrowTenure, setBorrowTenure] = useState(1); // Months

  // Repay Modal State
  const [showRepayModal, setShowRepayModal] = useState(false);

  const [transactions, setTransactions] = useState([
    { title: 'Marketplace BNPL', amount: 450, type: 'withdrawal', date: 'April 2, 2026' },
    { title: 'Tractor EMI', amount: 900, type: 'withdrawal', date: 'April 1, 2026' }
  ]);

  // Format Aadhaar: xxxx xxxx xxxx
  const handleAadhaarChange = (text) => {
    const numericOnly = text.replace(/\D/g, '');
    const formatted = numericOnly.replace(/(.{4})/g, '$1 ').trim();
    setAadhaar(formatted);
  };

  const submitKYC = async () => {
    if (!fullName || !landAcres || !age || aadhaar.length < 14 || pan.length < 10) {
      Alert.alert("Invalid Input", "Please fill all fields with valid Government IDs.");
      return;
    }

    setKycStatus('processing');

    // Transmit exact payload safely over to Flask Engine
    setTimeout(async () => {
      try {
        if (user?.token) {
          await axios.post(`${API_BASE}/credit/kyc`, {
            full_name: fullName, age: parseInt(age), farm_size: landAcres, aadhaar, pan
          }, { headers: { Authorization: `Bearer ${user.token}` } });
        } else {
          await AsyncStorage.setItem('@farmfi_kyc_status', 'pending_admin');
        }

        setKycStatus('pending_admin');
        setShowKycModal(false);
        Alert.alert("Application Submitted", "Your documents are securely uploaded. Pending final approval by Administrators.");
      } catch (err) {
        Alert.alert("Error", "Could not submit application.");
        setKycStatus('pending');
      }
    }, 2000);
  };

  // Slice/mPokket Instant Borrow Function
  const executeBorrow = () => {
    if (currentCredit < borrowAmount) {
      Alert.alert("Limit Exceeded", "You do not have enough available limit for this amount.");
      return;
    }
    setUsedCredit(prev => prev + borrowAmount);
    setTransactions(prev => [
      { title: `Instant Cash (${borrowTenure}M EMI)`, amount: borrowAmount, type: 'withdrawal', date: 'Just Now' },
      ...prev
    ]);
    setShowBorrowModal(false);
    Alert.alert("Transfer Successful", `₹${borrowAmount} transferred instantly to your registered UPI / Bank Act.`);
  };

  // Immediate Repayment Function
  const executeRepay = () => {
    if (usedCredit <= 0) return;
    const repayAmount = usedCredit;
    setUsedCredit(0);
    setTransactions(prev => [
      { title: 'Full Bill Repayment', amount: repayAmount, type: 'repayment', date: 'Just Now' },
      ...prev
    ]);
    setShowRepayModal(false);
  };

  // Calculate generic Interest Rate (e.g. 2% per month)
  const calculateEMI = (principal, months) => {
    const interest = principal * 0.02 * months;
    return Math.round((principal + interest) / months);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>FarmFi Credit</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Slice-Style Premium Credit Card UI */}
        <LinearGradient
          colors={kycStatus === 'verified' ? ['#a97e53ff', '#8b5cf6'] : ['#27272a', '#18181b']}
          style={styles.card}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardTopRow}>
            <Text style={styles.brandText}>FARMFI <Text style={{ fontWeight: '400' }}>OPERT</Text></Text>
            {kycStatus === 'verified' ? <Zap size={20} color="#fff" fill="#fff" /> : <Lock size={20} color="#71717a" />}
          </View>

          <Text style={styles.balanceLabel}>AVAILABLE LIMIT</Text>
          <Text style={[styles.balance, kycStatus !== 'verified' && { color: '#a1a1aa' }]}>
            ₹{currentCredit.toLocaleString('en-IN')}
          </Text>

          {kycStatus === 'verified' && (
            <Text style={styles.cardNumber}>****  ****  ****  {aadhaar.slice(-4)}</Text>
          )}

          {kycStatus === 'processing' ? (
            <View style={styles.processingBlock}>
              <ActivityIndicator color="#ec4899" size="small" />
              <Text style={styles.processingText}>Uploading Encrypted Files...</Text>
            </View>
          ) : kycStatus === 'pending_admin' ? (
            <View style={[styles.processingBlock, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Loader2 size={18} color="#eab308" />
              <Text style={[styles.processingText, { color: '#eab308' }]}>Pending Admin Approval</Text>
            </View>
          ) : kycStatus === 'expired' ? (
            <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: '#fef2f2' }]} onPress={() => setShowKycModal(true)}>
              <Text style={[styles.unlockBtnText, { color: '#ef4444' }]}>KYC Expired (90 Days+). Please Re-Verify.</Text>
            </TouchableOpacity>
          ) : kycStatus !== 'verified' ? (
            <TouchableOpacity style={styles.unlockBtn} onPress={() => setShowKycModal(true)}>
              <Text style={styles.unlockBtnText}>Complete KYC to Unlock ₹10K Limit</Text>
            </TouchableOpacity>
          ) : null}
        </LinearGradient>

        {/* Slice/mPokket Action Buttons Zone */}
        {kycStatus === 'verified' && (
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionBlock} onPress={() => setShowBorrowModal(true)}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Wallet size={24} color="#ec4899" />
              </View>
              <Text style={styles.actionTitle}>Borrow</Text>
              <Text style={styles.actionDesc}>Get cash to bank</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBlock} onPress={() => setShowRepayModal(true)}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <TrendingUp size={24} color="#10b981" />
              </View>
              <Text style={styles.actionTitle}>Repay</Text>
              <Text style={styles.actionDesc}>Clear dues</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Due Amount Banner */}
        {kycStatus === 'verified' && usedCredit > 0 && (
          <View style={styles.dueBanner}>
            <View>
              <Text style={styles.dueLabel}>Total Outstanding</Text>
              <Text style={styles.dueAmount}>₹{usedCredit.toLocaleString('en-IN')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <CalendarDays size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '600' }}>Due on 5th May</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.payNowBtn} onPress={() => setShowRepayModal(true)}>
              <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Unified Transaction History (Slice style) */}
        {kycStatus === 'verified' ? (
          <View style={styles.historySection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <History size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>

            {transactions.map((item, i) => (
              <View key={i} style={styles.txRow}>
                <View style={[styles.txIconBox, item.type === 'repayment' && { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <CreditCard size={20} color={item.type === 'repayment' ? '#10b981' : '#a1a1aa'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{item.title}</Text>
                  <Text style={styles.txDate}>{item.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmount, item.type === 'repayment' && { color: '#10b981' }]}>
                    {item.type === 'repayment' ? 'Paid' : '-'} ₹{item.amount.toLocaleString('en-IN')}
                  </Text>
                  {item.type !== 'repayment' && <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Success</Text>}
                </View>
              </View>
            ))}
          </View>
        ) : (
          kycStatus === 'pending_admin' ? (
            <View style={styles.marketingContainer}>
              <View style={[styles.marketingPoint, { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 16 }]}>
                <ShieldCheck size={28} color="#f59e0b" style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Application Under Review</Text>
                  <Text style={{ color: '#fcd34d', fontSize: 13, lineHeight: 20 }}>Your documents have been securely transmitted to our administrative team. Approvals generally take 2-4 hours.</Text>
                </View>
              </View>
            </View>
          ) : kycStatus !== 'processing' ? (
            <View style={styles.marketingContainer}>
              <Text style={styles.marketingTitle}>The credit revolution for farmers.</Text>
              <View style={styles.marketingPoint}><CheckCircle2 size={16} color="#10b981" /><Text style={styles.mktText}>Zero Collateral</Text></View>
              <View style={styles.marketingPoint}><CheckCircle2 size={16} color="#10b981" /><Text style={styles.mktText}>Fast Bank Transfers</Text></View>
              <View style={styles.marketingPoint}><CheckCircle2 size={16} color="#10b981" /><Text style={styles.mktText}>Pay later for Seeds & Tractors</Text></View>
            </View>
          ) : null
        )}
      </ScrollView>

      {/* Modern Borrow Modal (mPokket style) */}
      <Modal visible={showBorrowModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Instant Cash Transfer</Text>

            <Text style={styles.sheetLabel}>SELECT AMOUNT</Text>
            <View style={styles.chipRow}>
              {[500, 1000, 2000, 5000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.amtChip, borrowAmount === amt && styles.amtChipActive]}
                  onPress={() => setBorrowAmount(amt)}
                >
                  <Text style={[styles.amtText, borrowAmount === amt && styles.amtTextActive]}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sheetLabel}>SELECT REPAYMENT TENURE</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3].map(month => (
                <TouchableOpacity
                  key={month}
                  style={[styles.amtChip, borrowTenure === month && styles.amtChipActive, { flex: 1 }]}
                  onPress={() => setBorrowTenure(month)}
                >
                  <Text style={[styles.amtText, borrowTenure === month && styles.amtTextActive]}>{month} Month</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.emiBox}>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Estimated EMI</Text>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>₹{calculateEMI(borrowAmount, borrowTenure)} <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '500' }}>/mo</Text></Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Interest via FarmFi</Text>
                <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '700' }}>@ 2% flat</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={executeBorrow}>
              <Text style={styles.primaryBtnText}>Transfer to Bank Acc</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBorrowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Repay Modal */}
      <Modal visible={showRepayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Clear Outstanding Dues</Text>

            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>Total Payable Amount</Text>
              <Text style={{ color: '#fff', fontSize: 48, fontWeight: '900' }}>₹{usedCredit.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={executeRepay}>
              <Text style={styles.primaryBtnText}>Pay via UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRepayModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Standard KYC Modal */}
      <Modal visible={showKycModal} transparent animationType="fade">
        <View style={styles.modalOverlayFull}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Unlock OPERT Line</Text>
                <TouchableOpacity onPress={() => setShowKycModal(false)}><X size={24} color="#f87171" /></TouchableOpacity>
              </View>

              <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 20 }}>
                Complete a fast, paperless verification. Your profile will be manually verified by a FarmFi Administrator.
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Full Legal Name</Text>
                  <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Est. Farm Size</Text>
                  <TextInput style={styles.input} placeholder="e.g. 10 Acres" placeholderTextColor="#64748b" value={landAcres} onChangeText={setLandAcres} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Farmer Age</Text>
              <TextInput style={styles.input} placeholder="e.g. 34" placeholderTextColor="#64748b" keyboardType="numeric" maxLength={3} value={age} onChangeText={setAge} />

              <Text style={styles.inputLabel}>Aadhaar Number</Text>
              <TextInput style={styles.input} placeholder="0000 0000 0000" placeholderTextColor="#64748b" keyboardType="numeric" maxLength={14} value={aadhaar} onChangeText={handleAadhaarChange} />

              <Text style={styles.inputLabel}>PAN Number</Text>
              <TextInput style={styles.input} placeholder="ABCDE1234F" placeholderTextColor="#64748b" autoCapitalize="characters" maxLength={10} value={pan} onChangeText={(t) => setPan(t.toUpperCase())} />

              <View style={styles.secureBadge}>
                <ShieldCheck size={16} color="#10b981" />
                <Text style={{ color: '#10b981', fontSize: 12, marginLeft: 8 }}>FarmFi Approved.</Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, (!fullName || aadhaar.length < 14 || pan.length < 10) && { opacity: 0.5 }]} onPress={submitKYC}>
                <Text style={styles.primaryBtnText}>Submit for Approval</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20 },

  // Slice Style Card
  card: { padding: 24, borderRadius: 24, marginBottom: 24, height: 210, justifyContent: 'space-between', overflow: 'hidden' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24 },
  balance: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  cardNumber: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', letterSpacing: 3, marginTop: 'auto' },
  processingBlock: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 },
  processingText: { color: '#fff', marginLeft: 12, fontWeight: '600' },
  unlockBtn: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 'auto' },
  unlockBtnText: { color: '#09090b', fontWeight: '800' },

  marketingContainer: { marginTop: 20, paddingHorizontal: 10 },
  marketingTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  marketingPoint: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mktText: { color: '#94a3b8', fontSize: 16, marginLeft: 12, fontWeight: '500' },

  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionBlock: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginHorizontal: 6, alignItems: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  actionDesc: { color: '#64748b', fontSize: 12 },

  dueBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: 24 },
  dueLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  dueAmount: { color: '#fff', fontSize: 24, fontWeight: '900' },
  payNowBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  payNowText: { color: '#09090b', fontWeight: '800' },

  historySection: { marginTop: 12, marginBottom: 40 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  txIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txDate: { color: '#64748b', fontSize: 12 },
  txAmount: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modals
  modalOverlayFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#18181b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },

  sheetLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  amtChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center' },
  amtChipActive: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: '#ec4899' },
  amtText: { color: '#a1a1aa', fontWeight: '600' },
  amtTextActive: { color: '#ec4899', fontWeight: '800' },

  emiBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 32, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 },

  inputLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: '#09090b', height: 50, borderRadius: 12, color: '#fff', paddingHorizontal: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#3f3f46' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 12, borderRadius: 12, marginBottom: 24 },

  primaryBtn: { backgroundColor: '#ec4899', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' }
});
