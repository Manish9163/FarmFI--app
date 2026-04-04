import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Sprout, Store, Landmark, Cloud, AlertTriangle, Users, Calculator, Settings, LogOut, LogIn, Edit3, Droplets, ShieldAlert, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { registerCropCycle } from '../utils/SmartAlerts';
import { calculateCropThresholds } from '../utils/CropHeuristics';
import { FARM_API } from '../config/api';

const { width } = Dimensions.get('window');

const CARDS = [
  { icon: Leaf, label: 'Disease Detect', route: 'Disease', color: '#10b981' },
  { icon: Sprout, label: 'Crop Recommend', route: 'CropRecommendation', color: '#3b82f6' },
  { icon: Store, label: 'Marketplace', route: 'Marketplace', color: '#f59e0b' },
  { icon: Landmark, label: 'Credit & Finance', route: 'Credit', color: '#8b5cf6' },
  { icon: Cloud, label: 'Weather', route: 'Weather', color: '#06b6d4' },
  { icon: AlertTriangle, label: 'Risk Predictor', route: 'Risk', color: '#ef4444' },
  { icon: Users, label: 'Workers', route: 'Workers', color: '#ec4899' },
  { icon: Calculator, label: 'Planting Calendar', route: 'PlantingCalendar', color: '#14b8a6' },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [plantingStatus, setPlantingStatus] = useState(t('dashboard.plantStatus'));

  // Editable Farm Stats
  const DEFAULT_FARM = { 
    acres: '10 Acres', status: 'Ready for Sowing', baseTemp: 24.5, 
    primary_crop: 'Wheat', soil_moisture: 65, alerts: 'None', weather_state: 'Sunny'
  };
  
  const [farmData, setFarmData] = useState(DEFAULT_FARM);
  const [liveTemp, setLiveTemp] = useState('24.5');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(DEFAULT_FARM);

  // Load Saved Farm Data
  useEffect(() => {
    const loadFarmData = async () => {
      try {
        if (user?.token) {
           const res = await axios.get(`${FARM_API}/overview`, {
               headers: { Authorization: `Bearer ${user.token}` }
           });
           setFarmData(res.data);
           setLiveTemp((res.data.baseTemp ?? 24.5).toFixed(1));
        } else {
           const saved = await AsyncStorage.getItem('@farm_data');
           if (saved) {
             const parsed = JSON.parse(saved);
             setFarmData(parsed);
             setLiveTemp((parsed.baseTemp ?? 24.5).toFixed(1));
           } else {
             // Default guest stats
             setFarmData(DEFAULT_FARM);
             setLiveTemp('24.5');
           }
        }
      } catch (e) {
        console.error("Dashboard overview error:", e);
        setFarmData(DEFAULT_FARM);
      }
    };
    loadFarmData();
  }, [user]);

  // Explicit Mathematical Soil Temperature (Average of Weather Env & Farm Base)
  useEffect(() => {
    let envTemp = 25; // Default reference
    switch(farmData.weather_state) {
        case 'Sunny': envTemp = 32.0; break;
        case 'Cloudy': envTemp = 26.0; break;
        case 'Rainy': envTemp = 22.0; break;
        case 'Heatwave': envTemp = 42.0; break;
        case 'Cold Snap': envTemp = 12.0; break;
        default: envTemp = 25.0; break;
    }
    
    // Pure calculation: no drift, no randomizer, no interval.
    const averageTemp = ((farmData.baseTemp ?? 24.5) + envTemp) / 2;
    setLiveTemp(averageTemp.toFixed(1));
  }, [farmData.baseTemp, farmData.weather_state]);

  const saveFarmData = async () => {
    const moist = parseInt(editForm.soil_moisture) || farmData.soil_moisture;
    const temp = parseFloat(editForm.baseTemp) || farmData.baseTemp;
    const crop = (editForm.primary_crop || farmData.primary_crop);
    
    // Execute live deep-nlp classification across 100+ DB vectors!
    const { minMoist, maxMoist, minTemp, maxTemp } = calculateCropThresholds(crop);

    // Auto-Heuristics for Status and Alerts based on dynamic thresholds
    let stat = 'Healthy'; let alert = 'None';
    if (moist <= minMoist) { stat = 'Severely Dry'; alert = 'Drought Warning'; }
    else if (moist >= maxMoist) { stat = 'Saturated'; alert = 'Fungal Risk'; }
    else if (temp > maxTemp) { stat = 'Heat Stress'; alert = 'Extreme Heat'; }
    else if (temp < minTemp) { stat = 'Cold Stress'; alert = 'Frost Risk'; }

    const newFarm = {
      acres: editForm.acres || farmData.acres,
      status: stat,
      baseTemp: temp,
      primary_crop: crop,
      soil_moisture: moist,
      alerts: alert,
      weather_state: editForm.weather_state || farmData.weather_state || 'Sunny'
    };
    setFarmData(newFarm);
    setIsEditing(false);
    
    try {
      if (user?.token) {
          await axios.post(`${FARM_API}/overview`, newFarm, {
             headers: { Authorization: `Bearer ${user.token}` }
          });
      } else {
          await AsyncStorage.setItem('@farm_data', JSON.stringify(newFarm));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditor = () => {
    setEditForm({ 
      acres: farmData.acres || '10 Acres', 
      status: farmData.status || 'Healthy', 
      baseTemp: farmData.baseTemp?.toString() || '24.5',
      primary_crop: farmData.primary_crop || 'Wheat', 
      soil_moisture: farmData.soil_moisture?.toString() || '65', 
      alerts: farmData.alerts || 'None',
      weather_state: farmData.weather_state || 'Sunny'
    });
    setIsEditing(true);
  };

  const handleMoistureChange = (delta) => {
    let val = parseInt(editForm.soil_moisture) + delta;
    if (val < 0) val = 0; if (val > 100) val = 100;
    setEditForm(prev => ({...prev, soil_moisture: val.toString()}));
  };

  const handleTempChange = (delta) => {
    let val = parseFloat(editForm.baseTemp) + delta;
    setEditForm(prev => ({...prev, baseTemp: (val ?? 24.5).toFixed(1)}));
  };

  useEffect(() => {
    setPlantingStatus(t('dashboard.plantStatus'));
  }, [i18n.language]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  const handlePlantWheat = async () => {
    setPlantingStatus(t('dashboard.plantMsg'));
    await registerCropCycle('wheat');
    
    setTimeout(() => setPlantingStatus(t('dashboard.plantStatus')), 3000);
  };

  const ALL_CARDS = [
    { icon: Leaf, label: t('dashboard.diseaseDetect'), route: 'Disease', color: '#10b981', roles: ['Farmer', 'Admin','Worker'] },
    { icon: Sprout, label: t('dashboard.cropRecommend'), route: 'CropRecommendation', color: '#3b82f6', roles: ['Farmer', 'Admin'] },
    { icon: Store, label: t('dashboard.marketplace'), route: 'Marketplace', color: '#f59e0b', roles: ['Farmer', 'Buyer', 'Worker', 'Admin'] },
    { icon: Landmark, label: t('dashboard.credit'), route: 'Credit', color: '#8b5cf6', roles: ['Farmer', 'Buyer', 'Worker', 'Admin'] },
    { icon: Cloud, label: t('dashboard.weather'), route: 'Weather', color: '#06b6d4', roles: ['Farmer', 'Worker', 'Admin'] },
    { icon: ShoppingBag, label: 'Veg Market', route: 'VegetableMarket', color: '#10b981', roles: ['Farmer', 'Buyer', 'Worker', 'Admin'] },
    { icon: AlertTriangle, label: t('dashboard.riskPredictor'), route: 'Risk', color: '#ef4444', roles: ['Farmer', 'Admin'] },
    { icon: Users, label: t('dashboard.workers'), route: 'Workers', color: '#ec4899', roles: ['Farmer', 'Worker', 'Admin'] },
    { icon: Calculator, label: t('dashboard.calendar'), route: 'PlantingCalendar', color: '#14b8a6', roles: ['Farmer', 'Admin'] },
  ];

  const CARDS = user?.role
    ? ALL_CARDS.filter(card => card.roles.includes(user.role))
    : ALL_CARDS;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{user ? t('dashboard.welcome') : t('dashboard.hello')}</Text>
          <Text style={styles.name}>{user?.full_name || t('dashboard.guest')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Text style={styles.langText}>{t('common.changeLang')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={user ? handleLogout : () => navigation.navigate('Login')}>
            {user ? <LogOut size={22} color="#fafafa" /> : <LogIn size={22} color="#10b981" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Farm Overview Card - Securely Gated */}
        {user?.role === 'Buyer' ? (
          <LinearGradient colors={['#18181b', '#27272a']} style={[styles.overviewCard, { paddingVertical: 32 }]}>
             <View style={{alignItems: 'center'}}>
                <View style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 32, marginBottom: 16}}>
                   <ShoppingBag size={36} color="#10b981" />
                </View>
                <Text style={{color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8}}>Consumer Dashboard</Text>
                <Text style={{color: '#a1a1aa', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12}}>
                   You have successfully accessed the platform as a verified buyer. Go to the Veg Market below to purchase directly from active, high-yield farmers!
                </Text>
             </View>
          </LinearGradient>
        ) : user ? (
          <LinearGradient
            colors={['#059669', '#10b981']}
            style={styles.overviewCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.overviewTitle}>{t('dashboard.farmOverview')}</Text>
              <TouchableOpacity onPress={openEditor} style={styles.editCapsule}>
                <Edit3 size={14} color="#fff" style={{marginRight: 6}} />
                <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>Config</Text>
              </TouchableOpacity>
            </View>

          {/* Primary Operations Top Row */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 16, marginBottom: 20, justifyContent: 'space-between' }}>
             <View>
               <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase'}}>Main Crop</Text>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={{color: '#fff', fontSize: 18, fontWeight: '800'}}>{farmData.primary_crop}</Text>
               </View>
             </View>
             <View style={{alignItems: 'flex-end'}}>
               <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase'}}>Water Level</Text>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Droplets size={18} color="#38bdf8" style={{marginRight: 6}} />
                 <Text style={{color: '#fff', fontSize: 18, fontWeight: '800'}}>{farmData.soil_moisture}%</Text>
               </View>
             </View>
          </View>
          
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{farmData.acres}</Text>
              <Text style={styles.statLabel}>{t('dashboard.acresActive')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: farmData.status.toLowerCase().includes('sick') || farmData.status.toLowerCase().includes('dry') ? '#fcd34d' : '#fff' }]}>
                {farmData.status}
              </Text>
              <Text style={styles.statLabel}>{t('dashboard.cropStatus')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveTemp}°C</Text>
              <Text style={styles.statLabel}>{t('dashboard.soilTemp')}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                 {farmData.alerts !== 'None' && <ShieldAlert size={14} color="#f87171" style={{marginRight: 4, marginTop: 2}} />}
                 <Text style={[styles.statValue, farmData.alerts !== 'None' && {color: '#f87171'}]}>{farmData.alerts}</Text>
              </View>
              <Text style={styles.statLabel}>Active Alerts</Text>
            </View>
          </View>
        </LinearGradient>
        ) : (
          <LinearGradient colors={['#18181b', '#27272a']} style={[styles.overviewCard, { paddingVertical: 32 }]}>
             <View style={{alignItems: 'center'}}>
                <View style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 32, marginBottom: 16}}>
                   <ShieldAlert size={36} color="#10b981" />
                </View>
                <Text style={{color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8}}>Identify To Proceed</Text>
                <Text style={{color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22, paddingHorizontal: 12}}>
                   Please log in to your account to unlock live farm telemetry, weather risk prediction, and marketplace workflows.
                </Text>
                <TouchableOpacity 
                   style={{backgroundColor: '#10b981', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, elevation: 6}} 
                   onPress={() => navigation.navigate('Login')}
                >
                   <Text style={{color: '#09090b', fontWeight: '800', fontSize: 15, letterSpacing: 0.5}}>LOGIN / REGISTER</Text>
                </TouchableOpacity>
             </View>
          </LinearGradient>
        )}

        {/* Dynamic Editor Modal */}
        <Modal visible={isEditing} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Farm Profile</Text>
                
                <Text style={styles.modalLabel}>What crop are you growing?</Text>
                <View style={{marginBottom: 10}}>
                   <TextInput style={styles.modalInput} value={editForm.primary_crop} onChangeText={(txt) => setEditForm(prev => ({...prev, primary_crop: txt}))} placeholder="e.g. Soybeans, Sugarcane, Wheat" placeholderTextColor="#64748b" />
                </View>

                <Text style={styles.modalLabel}>How wet is the soil? (%)</Text>
                <View style={styles.stepperControl}>
                   <TouchableOpacity onPress={() => handleMoistureChange(-5)} style={styles.stepperBtn}><Minus size={22} color="#fff" /></TouchableOpacity>
                   <Text style={styles.stepperVal}>{editForm.soil_moisture}%</Text>
                   <TouchableOpacity onPress={() => handleMoistureChange(5)} style={styles.stepperBtn}><Plus size={22} color="#fff" /></TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Simulate Local Weather</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 20}}>
                  {['Sunny', 'Cloudy', 'Rainy', 'Heatwave', 'Cold Snap'].map(w => (
                    <TouchableOpacity 
                      key={w} 
                      style={[styles.cropChip, editForm.weather_state === w && styles.cropChipActive]} 
                      onPress={() => setEditForm(prev => ({...prev, weather_state: w}))}
                    >
                      <Text style={[styles.cropChipText, editForm.weather_state === w && {color: '#09090b', fontWeight: '800'}]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>Farm Temperature (°C)</Text>
                <View style={styles.stepperControl}>
                   <TouchableOpacity onPress={() => handleTempChange(-0.5)} style={styles.stepperBtn}><Minus size={22} color="#fff" /></TouchableOpacity>
                   <Text style={styles.stepperVal}>{editForm.baseTemp}°C</Text>
                   <TouchableOpacity onPress={() => handleTempChange(0.5)} style={styles.stepperBtn}><Plus size={22} color="#fff" /></TouchableOpacity>
                </View>
                
                <View style={{marginTop: 8, marginBottom: 24}}>
                   <Text style={styles.modalLabel}>Total Farm Size</Text>
                   <TextInput style={styles.modalInput} value={editForm.acres} onChangeText={(txt) => setEditForm(prev => ({...prev, acres: txt}))} placeholder="e.g. 10 Acres" placeholderTextColor="#64748b" />
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSave} onPress={saveFarmData}>
                    <Text style={styles.saveText}>Save Details</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Dashboard Grid */}
        <Text style={styles.sectionTitle}>{t('dashboard.services')}</Text>
        <View style={styles.grid}>
          {CARDS.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.gridCard}
                onPress={() => {
                  if (user) {
                    navigation.navigate(item.route);
                  } else {
                    navigation.navigate('Login', { returnTo: item.route });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                  <IconComponent size={28} color={item.color} />
                </View>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Smart Alerts & Settings */}
        {user && (
          <>
            {user.role === 'Admin' && (
              <TouchableOpacity style={styles.adminCard} onPress={() => navigation.navigate('Admin')}>
                <Settings size={20} color="#94a3b8" />
                <Text style={styles.adminText}>{t('dashboard.adminSettings')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fafafa',
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  langBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  langText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  overviewCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    boxShadow: '0px 6px 15px rgba(16, 185, 129, 0.25)',
    elevation: 8,
  },
  editCapsule: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexGrow: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 48 - 16) / 2, // 2 columns, padding 24 each side, gap 16
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  adminText: {
    color: '#94a3b8',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
  alertSub: {
    color: 'rgba(245, 158, 11, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%', backgroundColor: '#18181b',
    borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 40,
    borderWidth: 1, borderColor: '#27272a',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center'
  },
  modalLabel: {
    color: '#64748b', fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5
  },
  modalInput: {
    backgroundColor: '#09090b', color: '#f8fafc',
    borderWidth: 1, borderColor: '#3f3f46',
    borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20,
  },
  modalBtns: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12,
  },
  modalCancel: {
    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#27272a',
  },
  cancelText: { color: '#a1a1aa', fontWeight: '700', fontSize: 16 },
  modalSave: {
    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#10b981',
  },
  saveText: { color: '#09090b', fontWeight: '800', fontSize: 16 },
  cropChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, 
    backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46'
  },
  cropChipActive: {
    backgroundColor: '#10b981', borderColor: '#10b981'
  },
  cropChipText: { color: '#a1a1aa', fontWeight: '600' },
  stepperControl: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#09090b', borderWidth: 1, borderColor: '#3f3f46',
    borderRadius: 14, padding: 8, marginBottom: 20
  },
  stepperBtn: {
    backgroundColor: '#27272a', padding: 10, borderRadius: 10
  },
  stepperVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
