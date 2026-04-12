import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, User, Wallet, ShieldCheck, CreditCard, ShoppingBag, 
  TrendingUp, Package, ArrowUpRight, ArrowDownLeft, Clock, 
  CheckCircle2, AlertTriangle, XCircle, Plus
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../config/api';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, orders, wallet

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setProfile(res.data);
    } catch (e) {
      console.error('Profile fetch error:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.token) fetchProfile();
    else setLoading(false);
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  const getRoleBadge = (role) => {
    const colors = {
      'Farmer': { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
      'Buyer': { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
      'Worker': { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
    };
    const c = colors[role] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <View style={[styles.roleBadge, { backgroundColor: c.bg }]}>
        <Text style={[styles.roleBadgeText, { color: c.text }]}>{role}</Text>
      </View>
    );
  };

  const getKYCIcon = (status) => {
    switch(status) {
      case 'verified': return <CheckCircle2 size={16} color="#10b981" />;
      case 'pending_admin': return <Clock size={16} color="#f59e0b" />;
      case 'expired': return <AlertTriangle size={16} color="#ef4444" />;
      default: return <XCircle size={16} color="#64748b" />;
    }
  };

  const getKYCLabel = (status) => {
    switch(status) {
      case 'verified': return 'Verified';
      case 'pending_admin': return 'Under Review';
      case 'expired': return 'Expired';
      case 'not_submitted': return 'Not Submitted';
      default: return 'Pending';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" style={{marginTop: 100}} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#fafafa" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{width: 44}} />
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: '#94a3b8', fontSize: 16}}>Please log in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* ===== PROFILE CARD ===== */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#059669', '#10b981']}
            style={styles.profileGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          />
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <User size={32} color="#fff" />
            </View>
            <View style={{flex: 1, marginLeft: 16}}>
              <Text style={styles.profileName}>{profile.full_name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              {getRoleBadge(profile.role)}
            </View>
          </View>

          {/* KYC Strip */}
          <TouchableOpacity 
            style={styles.kycStrip}
            onPress={() => navigation.navigate('Credit')}
          >
            {getKYCIcon(profile.kyc?.status)}
            <Text style={styles.kycText}>KYC: {getKYCLabel(profile.kyc?.status)}</Text>
            {profile.kyc?.status === 'not_submitted' && (
              <Text style={{color: '#3b82f6', fontSize: 12, fontWeight: '700', marginLeft: 'auto'}}>Complete Now →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ===== WALLET CARD ===== */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIconWrap}>
              <Wallet size={20} color="#f59e0b" />
            </View>
            <Text style={styles.walletTitle}>Wallet</Text>
          </View>
          <Text style={styles.walletBalance}>
            {'\u20B9'}{parseFloat(profile.wallet?.balance || 0).toFixed(2)}
          </Text>
          <View style={styles.walletStats}>
            <View style={styles.walletStatItem}>
              <ArrowDownLeft size={14} color="#10b981" />
              <Text style={styles.walletStatLabel}>Earned</Text>
              <Text style={[styles.walletStatVal, {color: '#10b981'}]}>{'\u20B9'}{parseFloat(profile.wallet?.total_earned || 0).toFixed(0)}</Text>
            </View>
            <View style={[styles.walletStatItem, {borderLeftWidth: 1, borderLeftColor: '#27272a'}]}>
              <ArrowUpRight size={14} color="#ef4444" />
              <Text style={styles.walletStatLabel}>Spent</Text>
              <Text style={[styles.walletStatVal, {color: '#ef4444'}]}>{'\u20B9'}{parseFloat(profile.wallet?.total_spent || 0).toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* ===== QUICK STATS ===== */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ShoppingBag size={20} color="#3b82f6" />
            <Text style={styles.statNum}>{profile.purchases?.total_orders || 0}</Text>
            <Text style={styles.statLabel}>Purchases</Text>
          </View>
          {profile.role === 'Farmer' && (
            <>
              <View style={styles.statCard}>
                <TrendingUp size={20} color="#10b981" />
                <Text style={styles.statNum}>{profile.sales?.total_sales || 0}</Text>
                <Text style={styles.statLabel}>Sales</Text>
              </View>
              <View style={styles.statCard}>
                <Package size={20} color="#f59e0b" />
                <Text style={styles.statNum}>{profile.listings?.active || 0}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
            </>
          )}
          {profile.role === 'Buyer' && (
            <View style={styles.statCard}>
              <CreditCard size={20} color="#8b5cf6" />
              <Text style={styles.statNum}>{'\u20B9'}{parseFloat(profile.purchases?.total_spent || 0).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          )}
        </View>

        {/* ===== CREDIT SECTION (Farmers Only) ===== */}
        {profile.credit && (
          <TouchableOpacity style={styles.creditCard} onPress={() => navigation.navigate('Credit')}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
              <CreditCard size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Credit & Finance</Text>
            </View>
            <View style={styles.creditRow}>
              <View style={styles.creditItem}>
                <Text style={styles.creditLabel}>OUTSTANDING</Text>
                <Text style={[styles.creditVal, {color: '#ef4444'}]}>{'\u20B9'}{parseFloat(profile.credit?.outstanding_balance || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.creditItem}>
                <Text style={styles.creditLabel}>LIMIT</Text>
                <Text style={styles.creditVal}>{'\u20B9'}{parseFloat(profile.credit?.credit_limit || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.creditItem}>
                <Text style={styles.creditLabel}>SCORE</Text>
                <Text style={[styles.creditVal, {color: '#10b981'}]}>{profile.credit?.credit_score || 0}</Text>
              </View>
            </View>
            <Text style={{color: '#3b82f6', fontSize: 12, fontWeight: '700', marginTop: 12, textAlign: 'right'}}>Manage Credit →</Text>
          </TouchableOpacity>
        )}

        {/* ===== ORDER HISTORY ===== */}
        <View style={styles.sectionCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <Clock size={20} color="#06b6d4" />
            <Text style={styles.sectionTitle}>Recent Orders</Text>
          </View>

          {/* Tab Toggle: Purchases / Sales */}
          {profile.role === 'Farmer' && (
            <View style={styles.miniTabs}>
              <TouchableOpacity 
                style={[styles.miniTab, activeTab === 'overview' && styles.miniTabActive]}
                onPress={() => setActiveTab('overview')}
              >
                <Text style={[styles.miniTabText, activeTab === 'overview' && styles.miniTabTextActive]}>Purchases</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.miniTab, activeTab === 'orders' && styles.miniTabActive]}
                onPress={() => setActiveTab('orders')}
              >
                <Text style={[styles.miniTabText, activeTab === 'orders' && styles.miniTabTextActive]}>My Sales</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Order List */}
          {(activeTab === 'overview' ? profile.purchase_history : profile.sales_history)?.length === 0 ? (
            <View style={{paddingVertical: 24, alignItems: 'center'}}>
              <Text style={{color: '#64748b', fontSize: 14}}>No orders yet.</Text>
            </View>
          ) : (
            (activeTab === 'overview' ? profile.purchase_history : profile.sales_history)?.map((order, i) => (
              <View key={i} style={styles.orderRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.orderName}>{order.vegetable_name}</Text>
                  <Text style={styles.orderMeta}>
                    {order.quantity_kg} kg × {'\u20B9'}{order.price_per_kg}
                    {activeTab === 'overview' && order.farmer_name ? ` • ${order.farmer_name}` : ''}
                    {activeTab === 'orders' && order.buyer_name ? ` • ${order.buyer_name}` : ''}
                  </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.orderTotal}>{'\u20B9'}{parseFloat(order.total_amount).toFixed(0)}</Text>
                  <View style={[styles.statusBadge, {backgroundColor: order.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}]}>
                    <Text style={{color: order.status === 'confirmed' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '800'}}>{order.status?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ===== QUICK ACTIONS ===== */}
        <View style={styles.actionsRow}>
          {profile.role === 'Buyer' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Marketplace')}>
              <ShoppingBag size={18} color="#3b82f6" />
              <Text style={styles.actionText}>Go Shopping</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Credit')}>
            <ShieldCheck size={18} color="#f59e0b" />
            <Text style={styles.actionText}>KYC / Credit</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  // Profile Card
  profileCard: {
    borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  profileGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  profileName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  profileEmail: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  kycStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12, borderRadius: 14, gap: 8,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  kycText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Wallet Card
  walletCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 22, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  walletIconWrap: {
    backgroundColor: 'rgba(245,158,11,0.15)', padding: 8, borderRadius: 12, marginRight: 10,
  },
  walletTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  walletBalance: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 16 },
  walletStats: { flexDirection: 'row' },
  walletStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  walletStatLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  walletStatVal: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  // Credit Card
  creditCard: {
    backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: 22, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between' },
  creditItem: { alignItems: 'center', flex: 1 },
  creditLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  creditVal: { color: '#fff', fontSize: 18, fontWeight: '900' },

  // Section Card
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 22, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 10 },

  // Mini Tabs
  miniTabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  miniTab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46',
  },
  miniTabActive: { backgroundColor: '#fff', borderColor: '#fff' },
  miniTabText: { color: '#64748b', fontWeight: '800', fontSize: 13 },
  miniTabTextActive: { color: '#09090b' },

  // Order Row
  orderRow: {
    flexDirection: 'row', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  orderName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  orderMeta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  orderTotal: { color: '#fff', fontSize: 16, fontWeight: '900' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4,
  },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
