import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_API } from '../../config/api';

// Sidebar
import Sidebar, { getSectionInfo } from '../../components/admin/Sidebar';

// Section Views
import DashboardView from './DashboardView';
import UsersView from './UsersView';
import CustomersView from './CustomersView';
import BuyersView from './BuyersView';
import WorkersView from './WorkersView';
import ProductsView from './ProductsView';
import OrdersView from './OrdersView';
import CreditView from './CreditView';
import PredictionsView from './PredictionsView';
import CropPredictionsView from './CropPredictionsView';
import PesticidesView from './PesticidesView';
import FeedbackView from './FeedbackView';
import AnalyticsView from './AnalyticsView';
import KycView from './KycView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

// Maps section keys → API endpoints
const ENDPOINT_MAP = {
  dashboard: '/dashboard',
  users: '/users',
  customers: '/customers',
  buyers: '/buyers',
  workers: '/workers',
  products: '/products',
  orders: '/orders',
  credit: '/credit',
  predictions: '/predictions',
  'crop-predictions': '/crop-predictions',
  pesticides: '/pesticides',
  feedback: '/feedback',
  analytics: null, // Analytics fetches its own data internally
  kyc: '/kyc',
};

export default function AdminScreen({ navigation }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // ── Sidebar Toggle ──
  const toggleSidebar = useCallback((open) => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: open ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true, friction: 25, tension: 200,
      }),
      Animated.timing(overlayAnim, {
        toValue: open ? 1 : 0, duration: 250, useNativeDriver: true,
      }),
    ]).start();
    setSidebarOpen(open);
  }, [slideAnim, overlayAnim]);

  // ── Data Fetching ──
  const fetchData = useCallback(async (section) => {
    const endpoint = ENDPOINT_MAP[section];
    if (!endpoint) { setData(null); setLoading(false); return; }

    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}${endpoint}`);
      setData(res.data);
    } catch (err) {
      console.log('Admin fetch error:', err.message);
      setData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(activeSection); }, [activeSection, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(activeSection);
    setRefreshing(false);
  }, [activeSection, fetchData]);

  const handleSelectSection = useCallback((key) => {
    toggleSidebar(false);
    // Wait for animation to finish before causing a heavy render
    setTimeout(() => {
      setActiveSection(key);
    }, 250);
  }, [toggleSidebar]);

  // ── Render Active View ──
  const renderView = () => {
    const arrayData = Array.isArray(data) ? data : [];

    switch (activeSection) {
      case 'dashboard':
        return <DashboardView data={data} loading={loading} />;
      case 'users':
        return <UsersView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'customers':
        return <CustomersView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'buyers':
        return <BuyersView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'workers':
        return <WorkersView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'products':
        return <ProductsView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'orders':
        return <OrdersView data={arrayData} loading={loading} />;
      case 'credit':
        return <CreditView data={arrayData} loading={loading} />;
      case 'predictions':
        return <PredictionsView data={arrayData} loading={loading} />;
      case 'crop-predictions':
        return <CropPredictionsView data={arrayData} loading={loading} />;
      case 'pesticides':
        return <PesticidesView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'feedback':
        return <FeedbackView data={arrayData} loading={loading} />;
      case 'kyc':
        return <KycView data={arrayData} loading={loading} onRefresh={onRefresh} />;
      case 'analytics':
        return <AnalyticsView loading={loading} />;
      default:
        return <DashboardView data={data} loading={loading} />;
    }
  };

  const sectionInfo = getSectionInfo(activeSection);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => toggleSidebar(!sidebarOpen)}>
          <Menu size={22} color="#fafafa" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <View style={[styles.activeDot, { backgroundColor: sectionInfo.color }]} />
          <Text style={styles.topBarTitle}>{sectionInfo.label}</Text>
        </View>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#fafafa" />
        </TouchableOpacity>
      </View>

      {/* ── CONTENT ── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>Admin</Text>
          <ChevronRight size={14} color="#475569" />
          <Text style={[styles.breadcrumbText, { color: sectionInfo.color }]}>
            {sectionInfo.label}
          </Text>
        </View>

        {renderView()}
      </ScrollView>

      {/* ── OVERLAY ── */}
      <Animated.View 
        style={[styles.overlay, { opacity: overlayAnim }]} 
        pointerEvents={sidebarOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => toggleSidebar(false)}
          activeOpacity={1}
        />
      </Animated.View>

      {/* ── SIDEBAR ── */}
      <Sidebar
        user={user}
        activeSection={activeSection}
        onSelect={handleSelectSection}
        onClose={() => toggleSidebar(false)}
        slideAnim={slideAnim}
        sidebarWidth={SIDEBAR_WIDTH}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#fafafa' },
  content: { padding: 16, paddingBottom: 40 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  breadcrumbText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 98,
  },
});
