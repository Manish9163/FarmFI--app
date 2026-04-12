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
    { icon: Leaf, label: t('dashboard.diseaseDetect'), route: 'Disease', color: '#10b981', roles: ['Farmer','Worker'] },
    { icon: Sprout, label: t('dashboard.cropRecommend'), route: 'CropRecommendation', color: '#3b82f6', roles: ['Farmer'] },
    { icon: Store, label: t('dashboard.marketplace'), route: 'Marketplace', color: '#f59e0b', roles: ['Farmer', 'Buyer', 'Worker'] },
    { icon: Landmark, label: t('dashboard.credit'), route: 'Credit', color: '#8b5cf6', roles: ['Farmer', 'Buyer', 'Worker'] },
    { icon: Cloud, label: t('dashboard.weather'), route: 'Weather', color: '#06b6d4', roles: ['Farmer', 'Worker', 'Admin'] },
    { icon: AlertTriangle, label: t('dashboard.riskPredictor'), route: 'Risk', color: '#ef4444', roles: ['Farmer'] },
    { icon: Users, label: t('dashboard.workers'), route: 'Workers', color: '#ec4899', roles: ['Farmer', 'Worker'] },
    { icon: Calculator, label: t('dashboard.calendar'), route: 'PlantingCalendar', color: '#14b8a6', roles: ['Farmer'] },
  ];

  const CARDS = user?.role
    ? ALL_CARDS.filter(card => card.roles.includes(user.role))
    : ALL_CARDS;

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#09090b', '#18181b', '#09090b']} 
        style={StyleSheet.absoluteFill}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{user ? t('dashboard.welcome') : t('dashboard.hello')}</Text>
            <Text style={styles.name}>{user?.full_name || t('dashboard.guest')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langText}>{t('common.changeLang')}</Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
                <Users size={22} color="#10b981" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.profileBtn} onPress={user ? handleLogout : () => navigation.navigate('Login')}>
              {user ? <LogOut size={22} color="#fafafa" /> : <LogIn size={22} color="#10b981" />}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[2]}
        >
          {/* Farm Overview Card - Securely Gated */}
          {user?.role === 'Buyer' ? (
            <View style={styles.overviewCard}>
              <LinearGradient 
                colors={['rgba(39, 39, 42, 0.5)', 'rgba(24, 24, 27, 0.8)']} 
                style={styles.cardGradient}
              />
              <View style={{alignItems: 'center', paddingVertical: 12}}>
                  <View style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 32, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)'}}>
                    <ShoppingBag size={36} color="#10b981" />
                  </View>
                  <Text style={{color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8}}>Consumer Dashboard</Text>
                  <Text style={{color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12}}>
                    Welcome to the specialized buyer interface. Explore the marketplace below to connect with local farmers.
                  </Text>
              </View>
            </View>
          ) : user ? (
            <View style={styles.overviewCard}>
              <LinearGradient 
                colors={['#059669', '#10b981']} 
                style={styles.cardGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.overviewTitle}>{t('dashboard.farmOverview')}</Text>
                <TouchableOpacity onPress={openEditor} style={styles.editCapsule}>
                  <Edit3 size={14} color="#fff" style={{marginRight: 6}} />
                  <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>Configure</Text>
                </TouchableOpacity>
              </View>
  
              {/* Primary Operations Top Row */}
              <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 20, marginBottom: 20, justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <View>
                  <Text style={{color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5}}>Dominant Crop</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color: '#fff', fontSize: 20, fontWeight: '800'}}>{farmData.primary_crop}</Text>
                  </View>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={{color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5}}>Moisture Level</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Droplets size={18} color="#38bdf8" style={{marginRight: 6}} />
                    <Text style={{color: '#fff', fontSize: 20, fontWeight: '800'}}>{farmData.soil_moisture}%</Text>
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
            </View>
          ) : (
            <View style={[styles.overviewCard, { paddingVertical: 32 }]}>
              <LinearGradient 
                colors={['rgba(39, 39, 42, 0.5)', 'rgba(24, 24, 27, 0.8)']} 
                style={styles.cardGradient}
              />
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
          </View>
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
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
            <Text style={styles.sectionTitle}>{t('dashboard.services')}</Text>
            <View style={{height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16}} />
          </View>
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
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
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
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  editCapsule: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.25)', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)' 
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexGrow: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5
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
    width: (width - 48 - 14) / 2, 
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
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
