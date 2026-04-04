import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sprout, ThermometerSun, Droplets, CloudRain, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE } from '../config/api';

const SOIL_TYPES = ['Clay', 'Loam', 'Sandy', 'Silt', 'Peaty', 'Chalky'];
const SEASONS = ['Summer', 'Winter', 'Monsoon', 'Autumn', 'Spring'];

export default function CropRecommendationScreen({ navigation }) {
  const { t } = useTranslation();
  const [soilType, setSoilType] = useState('Loam');
  const [season, setSeason] = useState('Summer');
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [rainfall, setRainfall] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handlePredict = async () => {
    if (!temp || !humidity || !rainfall) {
      Alert.alert(t('crop.missingInfo'), t('crop.missingInfoMsg'));
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API_BASE}/crop/predict`, {
        soil_type: soilType,
        season: season,
        avg_temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        rainfall: parseFloat(rainfall)
      });
      setResults(res.data.top_crops);
    } catch (err) {
      console.error(err);
      Alert.alert(t('crop.error'), err.response?.data?.error || 'Failed to analyze data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('crop.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Sprout size={36} color="#bfdbfe" style={{ marginBottom: 12 }} />
          <Text style={styles.heroTitle}>{t('crop.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('crop.heroText')}</Text>
        </LinearGradient>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>{t('crop.soilTypeLabel')}</Text>
          <View style={styles.pillContainer}>
            {SOIL_TYPES.map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.pill, soilType === s && styles.pillActive]}
                onPress={() => setSoilType(s)}
              >
                <Text style={[styles.pillText, soilType === s && styles.pillTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('crop.seasonLabel')}</Text>
          <View style={styles.pillContainer}>
            {SEASONS.map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.pill, season === s && styles.pillActive]}
                onPress={() => setSeason(s)}
              >
                <Text style={[styles.pillText, season === s && styles.pillTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('crop.weatherStatsLabel')}</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <View style={styles.labelRow}><ThermometerSun size={14} color="#f59e0b"/><Text style={styles.inputLabel}>{t('crop.temp')}</Text></View>
              <TextInput style={styles.input} value={temp} onChangeText={setTemp} keyboardType="numeric" />
            </View>
            <View style={styles.inputBox}>
              <View style={styles.labelRow}><Droplets size={14} color="#06b6d4"/><Text style={styles.inputLabel}>{t('crop.humidity')}</Text></View>
              <TextInput style={styles.input} value={humidity} onChangeText={setHumidity} keyboardType="numeric" />
            </View>
            <View style={styles.inputBox}>
              <View style={styles.labelRow}><CloudRain size={14} color="#3b82f6"/><Text style={styles.inputLabel}>{t('crop.rain')}</Text></View>
              <TextInput style={styles.input} value={rainfall} onChangeText={setRainfall} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handlePredict} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('crop.analyzeBtn')}</Text>}
          </TouchableOpacity>
        </View>

        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader}>{t('crop.recommendedTitle')}</Text>
            {results.map((item, idx) => (
              <View key={idx} style={styles.resultCard}>
                <View style={styles.resultTop}>
                  <Text style={styles.cropName}>{item.crop}</Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{item.suitability_pct}% {t('crop.match')}</Text>
                  </View>
                </View>
                
                {item.risk_warning ? (
                  <View style={styles.warningRow}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <Text style={styles.warningText}>{item.risk_warning}</Text>
                  </View>
                ) : (
                  <View style={styles.successRow}>
                    <CheckCircle2 size={14} color="#10b981" />
                    <Text style={styles.successText}>{t('crop.perfectCondition')}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  heroCard: { padding: 24, borderRadius: 20, marginBottom: 24 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroText: { color: '#bfdbfe', fontSize: 14, lineHeight: 22 },
  
  formSection: { marginBottom: 32 },
  sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 16 },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: '#3b82f6', borderColor: '#60a5fa' },
  pillText: { color: '#94a3b8', fontWeight: '500', fontSize: 14 },
  pillTextActive: { color: '#fff', fontWeight: '700' },

  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  inputBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  inputLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  input: { color: '#f8fafc', fontSize: 18, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 4 },
  
  submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  resultsContainer: { marginTop: 16, paddingBottom: 40 },
  resultsHeader: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  resultCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cropName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scoreBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { color: '#60a5fa', fontWeight: '700', fontSize: 13 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  successText: { color: '#10b981', fontSize: 13, fontWeight: '500' },
});
