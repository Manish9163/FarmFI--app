import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, ShieldAlert, CloudLightning, Activity, TrendingDown, Bug, Crosshair, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const CROPS = [
  'Wheat', 'Tomato', 'Rice', 'Potato', 'Cotton', 'Sugarcane', 'Maize',
  'Soybean', 'Onion', 'Garlic', 'Carrot', 'Cabbage', 'Chili', 'Sunflower',
  'Mango', 'Papaya', 'Banana', 'Coffee', 'Tea', 'Groundnut', 'Apple'
];
const SOILS = ['Loamy', 'Clay', 'Sandy', 'Silt', 'Peaty'];

export default function RiskScreen({ navigation }) {
  const [crop, setCrop] = useState('Wheat');
  const [soil, setSoil] = useState('Loamy');
  const [location, setLocation] = useState('Punjab, India');
  const [stage, setStage] = useState('Vegetative Growth');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const [showCropDrop, setShowCropDrop] = useState(false);
  const [showSoilDrop, setShowSoilDrop] = useState(false);

  const analyzeRisk = () => {
    setIsAnalyzing(true);
    setResults(null);
    
      // Simulate AI network delay
    setTimeout(() => {
      // Basic deterministic heuristic engine for mock AI response
      let pestScore = 20;
      let weatherScore = 30;
      let marketScore = 40;

      // Crop based risk
      if (['Tomato', 'Cotton', 'Cabbage', 'Chili', 'Papaya'].includes(crop)) pestScore += 45; // High pest vulnerability crops
      if (['Rice', 'Sugarcane', 'Banana', 'Tea'].includes(crop)) weatherScore += 35; // reliant on heavy monsoon/water
      if (['Apple', 'Coffee', 'Mango'].includes(crop)) weatherScore += 25; // sensitive to sudden temperature shifts (frost/drought)
      if (['Onion', 'Garlic', 'Potato', 'Carrot', 'Groundnut'].includes(crop)) weatherScore += 15; // root crops vulnerable to waterlogging
      
      // Dynamic Market Score
      if (['Onion', 'Tomato', 'Potato'].includes(crop)) marketScore += 40; // High market volatility (TOP crops)
      if (['Coffee', 'Tea', 'Cotton'].includes(crop)) marketScore -= 10; // Export/cash crops usually more stable
      
      // Soil based risk
      if (soil === 'Clay' && !['Rice', 'Sugarcane'].includes(crop)) weatherScore += 25; // drainage issue risk for non-wet crops
      if (soil === 'Sandy') {
        weatherScore -= 10;
        if (['Rice', 'Sugarcane'].includes(crop)) weatherScore += 30; // terrible water retention for wet crops
      }
      
      // Calculate derived metadata
      const avgRisk = Math.round((pestScore + weatherScore + marketScore) / 3);
      
      let overallRiskLevel = 'Low';
      let riskColor = '#10b981'; // Green
      if (avgRisk > 40) { overallRiskLevel = 'Moderate'; riskColor = '#f59e0b'; } // Yellow
      if (avgRisk > 70) { overallRiskLevel = 'Critical'; riskColor = '#ef4444'; } // Red

      setResults({
        overall: avgRisk,
        level: overallRiskLevel,
        color: riskColor,
        factors: {
          pest: Math.min(100, pestScore),
          weather: Math.min(100, weatherScore),
          market: Math.min(100, marketScore)
        },
        recommendations: [
          pestScore > 50 ? `High pest vulnerability detected for ${crop}. Procure preventative bio-pesticides immediately.` : `Pest risk is stable. Continue standard integrated pest management.`,
          weatherScore > 50 ? `Your ${soil} soil profile poses extreme waterlogging/drought risks right now. Adjust drainage infrastructure.` : `Weather & Soil combination looks optimal for current growth stage.`,
          marketScore > 50 ? `Market volatility detected for ${location}. Consider forward contracts or cold storage buffering.` : `Prices for ${crop} currently holding stable.`
        ]
      });

      setIsAnalyzing(false);
    }, 2500);
  };

  const getBarColor = (val) => {
    if (val < 35) return '#10b981';
    if (val < 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>AI Risk Predictor</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Crosshair size={22} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Input Form */}
        <Text style={styles.sectionTitle}>Farm Profile Settings</Text>
        <Text style={styles.sectionSubtitle}>Tune the AI parameters to your specific field.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Field Location / Region</Text>
          <TextInput 
            style={styles.input} 
            value={location} 
            onChangeText={setLocation} 
            placeholder="e.g., Punjab, India"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, {flex: 1, marginRight: 12}]}>
            <Text style={styles.label}>Target Crop</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowCropDrop(!showCropDrop)}>
              <Text style={styles.dropText}>{crop}</Text>
              <ChevronDown size={16} color="#94a3b8" />
            </TouchableOpacity>
            {showCropDrop && (
              <View style={styles.dropMenu}>
                {CROPS.map(c => (
                  <TouchableOpacity key={c} style={styles.dropItem} onPress={() => { setCrop(c); setShowCropDrop(false); }}>
                    <Text style={styles.dropItemText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.formGroup, {flex: 1}]}>
            <Text style={styles.label}>Soil Profile</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowSoilDrop(!showSoilDrop)}>
              <Text style={styles.dropText}>{soil}</Text>
              <ChevronDown size={16} color="#94a3b8" />
            </TouchableOpacity>
            {showSoilDrop && (
              <View style={styles.dropMenu}>
                {SOILS.map(s => (
                  <TouchableOpacity key={s} style={styles.dropItem} onPress={() => { setSoil(s); setShowSoilDrop(false); }}>
                    <Text style={styles.dropItemText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeRisk} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <ActivityIndicator color="#09090b" size="small" style={{marginRight: 10}} />
               <Text style={styles.analyzeBtnText}>Computing Risk Algorithms...</Text>
            </View>
          ) : (
            <>
               <Activity size={20} color="#09090b" style={{marginRight: 8}} />
               <Text style={styles.analyzeBtnText}>Run AI Risk Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results Dashboard */}
        {results && (
          <View style={styles.resultsContainer}>
            <LinearGradient 
              colors={[`${results.color}15`, `${results.color}05`]} 
              style={[styles.mainRiskCard, { borderColor: `${results.color}40` }]}
            >
              <ShieldAlert size={48} color={results.color} style={{ marginBottom: 12 }} />
              <Text style={{color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 1}}>Overall Farm Risk</Text>
              <Text style={{color: results.color, fontSize: 36, fontWeight: '900', marginTop: 4}}>{results.overall}%</Text>
              <View style={[styles.badge, { backgroundColor: `${results.color}30` }]}>
                 <Text style={[styles.badgeText, { color: results.color }]}>{results.level} Vulnerability</Text>
              </View>
            </LinearGradient>

            <Text style={[styles.sectionTitle, {marginTop: 24}]}>Risk Telemetry Data</Text>
            
            <View style={styles.metricRow}>
              <View style={styles.metricIconBox}><Bug size={20} color="#f59e0b" /></View>
              <View style={styles.metricData}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                  <Text style={styles.metricName}>Pest & Pathogen Threat</Text>
                  <Text style={{color: getBarColor(results.factors.pest), fontWeight: '700'}}>{results.factors.pest}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${results.factors.pest}%`, backgroundColor: getBarColor(results.factors.pest) }]} />
                </View>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricIconBox, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}><CloudLightning size={20} color="#3b82f6" /></View>
              <View style={styles.metricData}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                  <Text style={styles.metricName}>Weather & Soil Resilience</Text>
                  <Text style={{color: getBarColor(results.factors.weather), fontWeight: '700'}}>{results.factors.weather}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${results.factors.weather}%`, backgroundColor: getBarColor(results.factors.weather) }]} />
                </View>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricIconBox, {backgroundColor: 'rgba(139, 92, 246, 0.1)'}]}><TrendingDown size={20} color="#8b5cf6" /></View>
              <View style={styles.metricData}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                  <Text style={styles.metricName}>Market Volatility Exposure</Text>
                  <Text style={{color: getBarColor(results.factors.market), fontWeight: '700'}}>{results.factors.market}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${results.factors.market}%`, backgroundColor: getBarColor(results.factors.market) }]} />
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, {marginTop: 24}]}>AI Recommendations</Text>
            <View style={styles.recsBox}>
              {results.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recItem}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>

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
  content: { padding: 20, paddingBottom: 60 },
  
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  
  formGroup: { marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', height: 50, borderRadius: 12, paddingHorizontal: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  row: { flexDirection: 'row', zIndex: 10 },
  dropdownBtn: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.03)', height: 50, borderRadius: 12, paddingHorizontal: 16, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' 
  },
  dropText: { color: '#fff', fontSize: 15 },
  dropMenu: { 
    position: 'absolute', top: 56, left: 0, right: 0, 
    backgroundColor: '#18181b', borderRadius: 12, padding: 8, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 20,
    elevation: 5
  },
  dropItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  dropItemText: { color: '#e2e8f0', fontSize: 15 },

  analyzeBtn: { 
    backgroundColor: '#10b981', height: 54, borderRadius: 16, marginTop: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  analyzeBtnText: { color: '#09090b', fontSize: 16, fontWeight: '800' },

  resultsContainer: { marginTop: 32 },
  mainRiskCard: { 
    alignItems: 'center', padding: 32, borderRadius: 24, borderWidth: 1, marginBottom: 8 
  },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 16 },
  badgeText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  metricRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  metricIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center' },
  metricData: { flex: 1, marginLeft: 16 },
  metricName: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  recsBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginTop: 6, marginRight: 12 },
  recText: { flex: 1, color: '#94a3b8', fontSize: 14, lineHeight: 22 }
});
