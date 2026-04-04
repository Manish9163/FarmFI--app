import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import axios from 'axios';
import { ADMIN_API } from '../../config/api';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Users, Bug, Sprout, ShoppingBag, MessageSquare } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChartBar = ({ label, value, maxValue, color }) => {
  const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <LinearGradient
          colors={[color, `${color}88`]}
          style={[styles.barFill, { width: `${Math.max(barWidth, 3)}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={[styles.barValue, { color }]}>{value}</Text>
    </View>
  );
};

const ChartSection = ({ title, icon: Icon, color, data, labelKey, valueKey, loading }) => {
  if (loading) return <ActivityIndicator size="small" color={color} style={{ marginVertical: 20 }} />;
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d[valueKey] || 0));

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={[styles.chartIconWrap, { backgroundColor: `${color}20` }]}>
          <Icon size={18} color={color} />
        </View>
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      {data.slice(0, 8).map((item, i) => (
        <ChartBar
          key={i}
          label={String(item[labelKey] || '—')}
          value={item[valueKey] || 0}
          maxValue={maxValue}
          color={color}
        />
      ))}
    </View>
  );
};

const AnalyticsView = ({ loading: parentLoading }) => {
  const [userGrowth, setUserGrowth] = useState([]);
  const [diseaseData, setDiseaseData] = useState([]);
  const [cropData, setCropData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [growth, disease, crop, sales, feedback] = await Promise.allSettled([
        axios.get(`${ADMIN_API}/analytics/user-growth`),
        axios.get(`${ADMIN_API}/analytics/disease-distribution`),
        axios.get(`${ADMIN_API}/analytics/crop-recommendations`),
        axios.get(`${ADMIN_API}/analytics/product-sales`),
        axios.get(`${ADMIN_API}/analytics/feedback-trend`),
      ]);

      if (growth.status === 'fulfilled') setUserGrowth(growth.value.data);
      if (disease.status === 'fulfilled') setDiseaseData(disease.value.data);
      if (crop.status === 'fulfilled') setCropData(crop.value.data);
      if (sales.status === 'fulfilled') setSalesData(sales.value.data);
      if (feedback.status === 'fulfilled') setFeedbackData(feedback.value.data);
    } catch (err) {
      console.log('Analytics error:', err.message);
    }
    setLoading(false);
  };

  if (loading) return <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />;

  return (
    <View style={styles.container}>
      <ChartSection
        title="User Growth"
        icon={Users}
        color="#3b82f6"
        data={userGrowth}
        labelKey="date"
        valueKey="new_users"
        loading={false}
      />
      <ChartSection
        title="Disease Distribution"
        icon={Bug}
        color="#ef4444"
        data={diseaseData}
        labelKey="disease_name"
        valueKey="count"
        loading={false}
      />
      <ChartSection
        title="Top Crop Recommendations"
        icon={Sprout}
        color="#22c55e"
        data={cropData}
        labelKey="crop_name"
        valueKey="recommendation_count"
        loading={false}
      />
      <ChartSection
        title="Product Sales"
        icon={ShoppingBag}
        color="#f59e0b"
        data={salesData}
        labelKey="product_name"
        valueKey="total_orders"
        loading={false}
      />
      <ChartSection
        title="Feedback Trend"
        icon={MessageSquare}
        color="#f97316"
        data={feedbackData}
        labelKey="date"
        valueKey="correct_predictions"
        loading={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 20 },
  chartCard: {
    borderRadius: 16, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chartHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  chartIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  barRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8,
  },
  barLabel: { width: 80, fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  barTrack: {
    flex: 1, height: 20, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});

export default AnalyticsView;
