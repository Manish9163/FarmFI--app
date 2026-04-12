import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, LayoutDashboard, Users, ShoppingBag, Package, ClipboardList,
  CreditCard, Briefcase, MessageSquare, BarChart3, Bug, Sprout, Shield, UserPlus, ShieldAlert
} from 'lucide-react-native';

export const MENU_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#10b981' },
    ],
  },
  {
    title: 'People',
    items: [
      { key: 'users', label: 'All Users', icon: Users, color: '#3b82f6' },
      { key: 'customers', label: 'Farmers', icon: UserPlus, color: '#8b5cf6' },
      { key: 'buyers', label: 'Buyers', icon: Users, color: '#f59e0b' },
      { key: 'workers', label: 'Workers', icon: Briefcase, color: '#ec4899' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { key: 'products', label: 'Inputs Store', icon: Package, color: '#f59e0b' },
      { key: 'orders', label: 'Market Orders', icon: ShoppingBag, color: '#06b6d4' },
      { key: 'kyc', label: 'KYC Approvals', icon: ShieldAlert, color: '#ef4444' },
      { key: 'credit', label: 'Credit', icon: CreditCard, color: '#14b8a6' },
    ],
  },
  {
    title: 'AI & Data',
    items: [
      { key: 'predictions', label: 'Disease Logs', icon: Bug, color: '#ef4444' },
      { key: 'crop-predictions', label: 'Crop Logs', icon: Sprout, color: '#22c55e' },
      { key: 'pesticides', label: 'Pesticides', icon: Shield, color: '#a855f7' },
      { key: 'feedback', label: 'Feedback', icon: MessageSquare, color: '#f97316' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { key: 'analytics', label: 'Charts', icon: BarChart3, color: '#6366f1' },
    ],
  },
];

// Helper to get section info by key
export const getSectionInfo = (key) => {
  for (const section of MENU_SECTIONS) {
    const item = section.items.find(i => i.key === key);
    if (item) return item;
  }
  return { label: 'Admin', color: '#10b981' };
};

const Sidebar = ({ user, activeSection, onSelect, onClose, slideAnim, sidebarWidth }) => {
  return (
    <Animated.View style={[styles.sidebar, { width: sidebarWidth, transform: [{ translateX: slideAnim }] }]}>
      {/* Header */}
      <LinearGradient colors={['#059669', '#10b981']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.full_name || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user?.full_name || 'Admin'}</Text>
        <Text style={styles.email}>{user?.email || 'admin@farmfi.com'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ADMINISTRATOR</Text>
        </View>
      </LinearGradient>

      {/* Menu Items */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {MENU_SECTIONS.map((section, si) => (
          <View key={si}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItem, isActive && { backgroundColor: `${item.color}15` }]}
                  onPress={() => onSelect(item.key)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}20` }]}>
                    <Icon size={18} color={item.color} />
                  </View>
                  <Text style={[styles.menuItemText, isActive && { color: item.color, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={[styles.activeBar, { backgroundColor: item.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: '#0f0f12', zIndex: 99, elevation: 20,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)',
  },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  name: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 2 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  menu: { flex: 1, paddingHorizontal: 12, paddingTop: 16 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginTop: 20, marginBottom: 8, marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, marginBottom: 2,
  },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  menuItemText: { fontSize: 14, color: '#94a3b8', fontWeight: '500', flex: 1 },
  activeBar: { width: 4, height: 20, borderRadius: 2 },
});

export default Sidebar;
