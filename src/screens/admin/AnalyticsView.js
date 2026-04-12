import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import axios from 'axios';
import { ADMIN_API } from '../../config/api';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Users, Bug, Sprout, ShoppingBag, MessageSquare, DollarSign } from 'lucide-react-native';
import Svg, { Path, Circle, Polyline, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── SVG PIE / DONUT CHART ──
const DonutChart = ({ data, size = 150, strokeWidth = 25 }) => {
  let cumulativePercent = 0;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const getCoordinatesForPercent = (percent) => {
    const x = cx + radius * Math.cos(2 * Math.PI * percent);
    const y = cy + radius * Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
      <Svg width={size} height={size}>
        {data.map((slice, i) => {
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += slice.percent;
          // If a single slice is 100%, render a circle to avoid SVG rendering bug
          if (slice.percent === 1) {
            return <Circle key={i} cx={cx} cy={cy} r={radius} fill="transparent" stroke={slice.color} strokeWidth={strokeWidth} />;
          }
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = slice.percent > 0.5 ? 1 : 0;
          const pathData = [
            `M ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
          ].join(' ');

          return (
            <Path key={i} d={pathData} fill="none" stroke={slice.color} strokeWidth={strokeWidth} />
          );
        })}
      </Svg>
      {/* Center Label */}
      <View style={[StyleSheet.absoluteFillObject, styles.donutCenter]} pointerEvents="none">
        <Text style={styles.donutCenterText}>{data.length}</Text>
        <Text style={styles.donutCenterLabel}>Items</Text>
      </View>
    </View>
  );
};

// ── SVG LINE CHART ──
const LineChart = ({ data, color, height = 120 }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = SCREEN_WIDTH - 80;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value / maxValue) * (height - 20)) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ height, marginVertical: 20 }}>
      <Svg width="100%" height="100%">
        <Polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - ((d.value / maxValue) * (height - 20)) - 10;
          return <Circle key={i} cx={x} cy={y} r="4" fill="#09090b" stroke={color} strokeWidth="2" />;
        })}
      </Svg>
    </View>
  );
};

// ── VERTICAL BAR CHART (Revenue) ──
const VerticalBarChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.vBarContainer}>
      {data.slice(0, 7).map((item, i) => {
        const heightPct = (item.value / maxValue) * 100;
        return (
          <View key={i} style={styles.vBarWrapper}>
            <Text style={styles.vBarTopLabel}>{item.value}</Text>
            <View style={styles.vBarTrack}>
              <LinearGradient
                colors={[color, `${color}55`]}
                style={[styles.vBarFill, { height: `${Math.max(heightPct, 5)}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              />
            </View>
            <Text style={styles.vBarBottomLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ── WRAPPER SECTION ──
const ChartSection = ({ title, icon: Icon, color, children }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <View style={[styles.chartIconWrap, { backgroundColor: `${color}20` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const AnalyticsView = ({ loading: parentLoading }) => {
  const [analytics, setAnalytics] = useState(null);
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

      setAnalytics({
        userGrowth: growth.status === 'fulfilled' ? growth.value.data : [],
        diseaseData: disease.status === 'fulfilled' ? disease.value.data : [],
        cropData: crop.status === 'fulfilled' ? crop.value.data : [],
        salesData: sales.status === 'fulfilled' ? sales.value.data : [],
        feedbackData: feedback.status === 'fulfilled' ? feedback.value.data : [],
      });
    } catch (err) {
      console.log('Analytics error:', err.message);
    }
    setLoading(false);
  };

  if (loading || !analytics) return <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />;

  // 1. Format Line Chart
  const growthTrend = analytics.userGrowth.map(d => ({ label: d.date.slice(5), value: d.new_users }));
  
  // 2. Format Donut Charts
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#0ea5e9', '#6366f1'];
  
  const totalDisease = analytics.diseaseData.reduce((acc, d) => acc + d.count, 0) || 1;
  const diseasePie = analytics.diseaseData.slice(0, 6).map((d, i) => ({
    label: d.disease_name, value: d.count, percent: d.count / totalDisease, color: COLORS[i]
  }));

  const totalCrop = analytics.cropData.reduce((acc, d) => acc + d.recommendation_count, 0) || 1;
  const cropPie = analytics.cropData.slice(0, 6).map((d, i) => ({
    label: d.crop_name, value: d.recommendation_count, percent: d.recommendation_count / totalCrop, color: COLORS[i]
  }));

  // 3. Format Bars
  const salesBars = analytics.salesData.map(d => ({ label: d.product_name, value: d.total_orders }));

  // 4. Format Feedback Trend
  const feedbackTrend = analytics.feedbackData.map(d => ({ label: d.date.slice(5), value: d.correct_predictions }));

  return (
    <View style={styles.container}>
      {/* GROWTH LINE TREND */}
      <ChartSection title="User Acquisition Trend" icon={TrendingUp} color="#3b82f6">
        <LineChart data={growthTrend.slice(-14)} color="#3b82f6" />
      </ChartSection>

      {/* SALES REVENUE BLOCKS */}
      <ChartSection title="Product Sales Revenue" icon={DollarSign} color="#10b981">
        <VerticalBarChart data={salesBars} color="#10b981" />
      </ChartSection>

      {/* PIE CHARTS */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <ChartSection title="Diseases" icon={Bug} color="#ef4444">
            <DonutChart data={diseasePie} size={110} strokeWidth={16} />
            <View style={styles.legendWrap}>
              {diseasePie.map((p, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{p.label}</Text>
                </View>
              ))}
            </View>
          </ChartSection>
        </View>

        <View style={{ flex: 1 }}>
          <ChartSection title="Crop AI Analysis" icon={Sprout} color="#84cc16">
            <DonutChart data={cropPie} size={110} strokeWidth={16} />
            <View style={styles.legendWrap}>
              {cropPie.map((p, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{p.label}</Text>
                </View>
              ))}
            </View>
          </ChartSection>
        </View>
      </View>

      {/* FEEDBACK TREND */}
      <ChartSection title="Accuracy Feedback Trend" icon={MessageSquare} color="#f97316">
        <LineChart data={feedbackTrend.slice(-14)} color="#f97316" />
      </ChartSection>
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
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  chartIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  
  // Donut Layout
  donutCenter: { alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  donutCenterText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  donutCenterLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  legendWrap: { marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#cbd5e1', flex: 1 },

  // Vertical Bar
  vBarContainer: { flexDirection: 'row', gap: 8, height: 160, alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 },
  vBarWrapper: { alignItems: 'center', flex: 1 },
  vBarTopLabel: { fontSize: 9, color: '#f8fafc', fontWeight: '700', marginBottom: 4 },
  vBarTrack: { width: '100%', height: 100, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  vBarFill: { width: '100%', borderRadius: 6 },
  vBarBottomLabel: { fontSize: 8, color: '#94a3b8', marginTop: 8, textAlign: 'center', height: 20 }
});

export default AnalyticsView;
