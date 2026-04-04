import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import StatCard from '../../components/admin/StatCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const DashboardView = ({ data, loading }) => {
  if (loading) return <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 60 }} />;
  if (!data) return <Text style={styles.empty}>No data available</Text>;

  const stats = [
    { label: 'Total Users', value: data.total_users, color: '#3b82f6' },
    { label: 'Customers', value: data.total_customers, color: '#8b5cf6' },
    { label: 'Workers', value: data.total_workers, color: '#ec4899' },
    { label: 'Products', value: data.total_products, color: '#f59e0b' },
    { label: 'Orders', value: data.total_orders, color: '#06b6d4' },
    { label: 'Predictions', value: data.total_predictions, color: '#ef4444' },
    { label: 'Pending Jobs', value: data.pending_jobs, color: '#f97316' },
    { label: 'Credit Due', value: `₹${data.total_credit_due}`, color: '#14b8a6' },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((item, i) => (
        <StatCard key={i} {...item} width={CARD_WIDTH} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 15 },
});

export default DashboardView;
