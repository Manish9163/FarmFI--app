import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Upload, Camera, Sparkles, Activity, ShieldAlert, ShoppingCart, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function DiseaseScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [marketItems, setMarketItems] = useState([]);

  const takePhoto = async () => {
    let permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow camera access to take a photo of the leaf.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null); // Clear previous results
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow camera roll access to upload a photo.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      const filename = image.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', { uri: image, name: filename, type });

      const res = await axios.post(`${API_BASE}/disease/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data);

      // Instantly fetch marketplace items if disease found for direct buying
      if (res.data.result && !res.data.result.disease_name.toLowerCase().includes('healthy')) {
        try {
          const marketRes = await axios.get(`${API_BASE}/marketplace/products?category=Pesticide`);
          setMarketItems(marketRes.data?.products?.slice(0, 3) || []); // grab top 3 items
        } catch (e) {
          console.warn("Market fetch error:", e);
        }
      }

    } catch (err) {
      console.error("Analysis Error:", err);
      Alert.alert('Analysis Failed', err.response?.data?.error || 'Could not analyze image properly.');
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
        <Text style={styles.title}>Disease Detection</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>Scan Leaf</Text>
        <LinearGradient colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.05)']} style={styles.uploadCard}>
          {image ? (
            <Image 
              source={{ uri: image }} 
              style={{ width: 140, height: 140, borderRadius: 20, marginBottom: 16, borderWidth: 2, borderColor: '#10b981' }} 
            />
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Camera size={32} color="#10b981" />
              </View>
              <Text style={styles.uploadTitle}>Scan Crop Leaf</Text>
              <Text style={styles.uploadSubtitle}>Upload or capture a photo for AI analysis</Text>
            </>
          )}

          {!image ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
                <Camera size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                <Upload size={20} color="#10b981" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Sparkles size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.btnText}>Analyze Disease AI</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImage(null); setResult(null); }}>
                <Text style={styles.retakeText}>Remove & Retake</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* AI Analysis Result */}
        {result && result.result && (
          <View style={styles.resultBox}>
            <Text style={styles.sectionTitle}>AI Diagnosis</Text>
            
            <View style={[styles.diagnosisCard, { borderColor: result.result.disease_name.toLowerCase().includes('healthy') ? '#10b981' : '#f43f5e' }]}>
              {result.result.disease_name.toLowerCase().includes('healthy') ? (
                <>
                  <Activity size={32} color="#10b981" style={{ marginBottom: 12 }} />
                  <Text style={[styles.diseaseName, { color: '#10b981' }]}>Healthy</Text>
                  <Text style={styles.confidenceText}>{Math.round(result.result.confidence)}% Confidence</Text>
                </>
              ) : (
                <>
                  <ShieldAlert size={32} color="#f43f5e" style={{ marginBottom: 12 }} />
                  <Text style={[styles.diseaseName, { color: '#f43f5e' }]}>{result.result.disease_name.replace(/___/g, ' - ').replace(/_/g, ' ')}</Text>
                  <Text style={styles.confidenceText}>Severity: {result.result.severity_level.toUpperCase()} • {Math.round(result.result.confidence)}% Match</Text>
                  
                  {result.explanation && result.explanation.farmer_view && (
                    <View style={styles.explanationBox}>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                        <HelpCircle size={16} color="#3b82f6" />
                        <Text style={styles.explanationHeader}> Farmer Instructions:</Text>
                      </View>
                      
                      {/* What it means */}
                      {result.explanation.farmer_view.what_it_means && (
                        <Text style={[styles.solutionText, { marginBottom: 8, fontWeight: '700', color: '#60a5fa' }]}>
                          {result.explanation.farmer_view.what_it_means}
                        </Text>
                      )}

                      {/* Urgency */}
                      {result.explanation.farmer_view.urgency && (
                        <Text style={[styles.solutionText, { color: '#fb923c', marginBottom: 8, fontStyle: 'italic' }]}>
                          Urgency: {result.explanation.farmer_view.urgency}
                        </Text>
                      )}

                      {/* Action Steps */}
                      {result.explanation.farmer_view.action_steps && (
                        Array.isArray(result.explanation.farmer_view.action_steps) ? (
                          result.explanation.farmer_view.action_steps.map((step, idx) => (
                            <Text key={idx} style={[styles.solutionText, { marginBottom: 4 }]}>• {step}</Text>
                          ))
                        ) : (
                          <Text style={styles.solutionText}>{result.explanation.farmer_view.action_steps}</Text>
                        )
                      )}
                    </View>
                  )}

                  {result.solution && (
                    <View style={styles.solutionBox}>
                      <Text style={styles.solutionHeader}>Recommended Treatment:</Text>
                      <Text style={styles.solutionText}>• Pesticide: {result.solution.recommended_pesticide}</Text>
                      <Text style={styles.solutionText}>• Dosage: {result.solution.dosage}</Text>
                      <Text style={[styles.solutionText, { marginTop: 4, color: '#34d399' }]}>
                        🌿 Organic: {result.solution.organic_alternative}
                      </Text>
                      {result.solution.safety_precautions && (
                        <Text style={[styles.solutionText, { marginTop: 4, fontStyle: 'italic', color: '#f87171' }]}>
                          ⚠️ {result.solution.safety_precautions}
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {/* Marketplace Cross-sell */}
                  {marketItems.length > 0 && (
                    <View style={{ width: '100%', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                      <Text style={{color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12}}>
                        Recommended from Store
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {marketItems.map(item => (
                          <TouchableOpacity 
                            key={item.id} 
                            style={styles.marketCard}
                            onPress={() => navigation.navigate('Marketplace', { openProductId: item.id })}
                          >
                            <ShoppingCart size={24} color="#f59e0b" style={{marginBottom: 8}} />
                            <Text style={styles.marketItemName} numberOfLines={2}>{item.name}</Text>
                            <Text style={styles.marketItemPrice}>₹{item.price}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
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
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 24 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16, marginTop: 8 },

  uploadCard: {
    padding: 32, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center', marginBottom: 32,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  uploadSubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  
  actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  primaryBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: '#10b981', padding: 14,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: 'rgba(16,185,129,0.1)', padding: 14,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)'
  },
  secondaryBtnText: { color: '#10b981', fontWeight: '600', fontSize: 15 },
  
  analyzeBtn: {
    flexDirection: 'row', backgroundColor: '#3b82f6', padding: 16,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  retakeBtn: { padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  retakeText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

  resultBox: { paddingBottom: 40 },
  diagnosisCard: { 
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, 
    borderWidth: 1, alignItems: 'center' 
  },
  diseaseName: { fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  confidenceText: { fontSize: 14, color: '#94a3b8', fontWeight: '500', marginBottom: 16 },
  
  explanationBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12 },
  explanationHeader: { color: '#60a5fa', fontWeight: '700', fontSize: 14 },
  
  solutionBox: { backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: 16, borderRadius: 12, width: '100%' },
  solutionHeader: { color: '#fba918', fontWeight: '700', marginBottom: 6, fontSize: 14 },
  solutionText: { color: '#e2e8f0', lineHeight: 22, fontSize: 14 },

  marketCard: {
    backgroundColor: 'rgba(0,0,0,0.3)', width: 140, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', marginRight: 12,
  },
  marketItemName: { color: '#fff', fontWeight: '600', fontSize: 13, marginBottom: 8, height: 36 },
  marketItemPrice: { color: '#10b981', fontWeight: '800', fontSize: 16 }
});
