import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, ShoppingBag, Plus, Tag, IndianRupee, Tractor, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../config/api';

const { width } = Dimensions.get('window');

export default function VegetableMarketScreen({ navigation }) {
  const { user } = useAuth();
  const [vegetables, setVegetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('browse'); // 'browse', 'sell'
  
  // Sell Form (For Farmers)
  const [sellForm, setSellForm] = useState({ name: '', price: '', quantity: '' });

  useEffect(() => {
    fetchVegetables();
  }, [viewMode]);

  const fetchVegetables = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/vegetables`, {
         headers: { Authorization: `Bearer ${user?.token}` }
      });
      setVegetables(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSell = async () => {
    if (!sellForm.name || !sellForm.price || !sellForm.quantity) {
      Alert.alert("Incomplete Listing", "Please fill all fields to list your produce.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/vegetables`, {
        name: sellForm.name,
        price_per_kg: sellForm.price,
        quantity_kg: sellForm.quantity,
        image_url: null 
      }, { headers: { Authorization: `Bearer ${user?.token}` }});
      
      Alert.alert("Listed Successfully!", `${sellForm.name} is now live on the B2C Marketplace.`);
      setSellForm({ name: '', price: '', quantity: '' });
      setViewMode('browse');
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Could not list produce.");
    }
  };

  const handleBuy = (veg) => {
    Alert.alert(
      "Confirm Purchase",
      `Buy 1kg of ${veg.name} for ₹${veg.price_per_kg}? (Farm direct from ${veg.farmer_name})`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Purchase via UPI", onPress: async () => {
            try {
              await axios.post(`${API_BASE}/vegetables/buy`, {
                  vegetable_id: veg.id,
                  quantity_kg: 1
              }, { headers: { Authorization: `Bearer ${user?.token}` }});
              Alert.alert("Payment Success", `Your order for ${veg.name} is confirmed and payment routed directly to the farmer.`);
              fetchVegetables();
            } catch (e) {
              Alert.alert("Transaction Failed", e.response?.data?.error || "Unable to acquire stock.");
            }
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Consumer Access Market</Text>
        <View style={{ width: 44 }} />
      </View>

      {user?.role === 'Farmer' && (
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, viewMode === 'browse' && styles.activeTabBtn]} onPress={() => setViewMode('browse')}>
             <ShoppingBag size={18} color={viewMode === 'browse' ? '#09090b' : '#64748b'} />
             <Text style={[styles.tabText, viewMode === 'browse' && styles.activeTabText]}>My Live Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, viewMode === 'sell' && styles.activeTabBtn]} onPress={() => setViewMode('sell')}>
             <Plus size={18} color={viewMode === 'sell' ? '#09090b' : '#64748b'} />
             <Text style={[styles.tabText, viewMode === 'sell' && styles.activeTabText]}>List New Harvest</Text>
          </TouchableOpacity>
        </View>
      )}

      {user?.role === 'Buyer' && (
        <View style={styles.buyerBanner}>
           <ShieldCheck size={24} color="#10b981" style={{marginRight: 12}} />
           <View style={{flex: 1}}>
             <Text style={{color: '#fff', fontSize: 16, fontWeight: '800'}}>Farm-to-Table Guarantee</Text>
             <Text style={{color: '#94a3b8', fontSize: 13, marginTop: 2}}>Buying directly from verified active farmers.</Text>
           </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {viewMode === 'sell' && user?.role === 'Farmer' ? (
          <View style={styles.sellCard}>
             <View style={{alignItems: 'center', marginBottom: 24}}>
                <View style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 24, marginBottom: 12}}>
                   <Tractor size={32} color="#10b981" />
                </View>
                <Text style={{color: '#fff', fontSize: 20, fontWeight: '800'}}>Direct To Consumer</Text>
             </View>

             <Text style={styles.label}>Vegetable / Produce Name</Text>
             <TextInput style={styles.input} placeholder="e.g. Organic Tomatoes" placeholderTextColor="#64748b" value={sellForm.name} onChangeText={t => setSellForm({...sellForm, name: t})} />

             <View style={{flexDirection: 'row', gap: 12}}>
               <View style={{flex: 1}}>
                 <Text style={styles.label}>Price per KG (₹)</Text>
                 <TextInput style={styles.input} placeholder="e.g. 45" keyboardType="numeric" placeholderTextColor="#64748b" value={sellForm.price} onChangeText={t => setSellForm({...sellForm, price: t})} />
               </View>
               <View style={{flex: 1}}>
                 <Text style={styles.label}>Quantity to List (KG)</Text>
                 <TextInput style={styles.input} placeholder="e.g. 100" keyboardType="numeric" placeholderTextColor="#64748b" value={sellForm.quantity} onChangeText={t => setSellForm({...sellForm, quantity: t})} />
               </View>
             </View>

             <TouchableOpacity style={styles.primaryBtn} onPress={handleSell}>
                <Text style={styles.primaryBtnText}>Publish to B2C Market</Text>
             </TouchableOpacity>
          </View>
        ) : (
          <>
            {loading ? (
               <ActivityIndicator size="large" color="#10b981" style={{marginTop: 50}} />
            ) : vegetables.length === 0 ? (
               <View style={styles.emptyState}>
                 <Text style={{color: '#94a3b8'}}>No vegetables listed on the market currently.</Text>
               </View>
            ) : (
               <View style={styles.grid}>
                 {vegetables.map(v => (
                   <LinearGradient key={v.id} colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} style={styles.vegCard}>
                      <View style={styles.vegTop}>
                         <View style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8}}>
                           <Text style={{color: '#3b82f6', fontSize: 10, fontWeight: '800', textTransform: 'uppercase'}}>{v.farmer_name}</Text>
                         </View>
                         <Text style={{color: '#10b981', fontWeight: '800'}}>₹{v.price_per_kg}<Text style={{color: '#64748b', fontSize: 12}}>/kg</Text></Text>
                      </View>
                      
                      <Text style={styles.vegName}>{v.name}</Text>
                      
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                         <Tag size={12} color="#f59e0b" style={{marginRight: 4}} />
                         <Text style={{color: '#f59e0b', fontSize: 12, fontWeight: '700'}}>{v.quantity_kg} KG Available</Text>
                      </View>

                      {user?.role === 'Buyer' && (
                         <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(v)}>
                            <ShoppingCart size={16} color="#09090b" style={{marginRight: 6}} />
                            <Text style={styles.buyBtnText}>Quick Buy</Text>
                         </TouchableOpacity>
                      )}
                   </LinearGradient>
                 ))}
               </View>
            )}
          </>
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

  buyerBanner: { margin: 20, marginBottom: 0, padding: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, marginBottom: 8, gap: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
  activeTabBtn: { backgroundColor: '#fff', borderColor: '#fff' },
  tabText: { color: '#64748b', fontWeight: '800', marginLeft: 8 },
  activeTabText: { color: '#09090b' },

  content: { padding: 20 },
  sellCard: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#27272a' },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#09090b', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#3f3f46' },
  primaryBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vegCard: { width: (width - 40 - 12) / 2, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  vegTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vegName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8, lineHeight: 22 },
  buyBtn: { backgroundColor: '#fcfcfc', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  buyBtnText: { color: '#09090b', fontWeight: '800', fontSize: 13 },
  
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#18181b', borderRadius: 20, borderWidth: 1, borderColor: '#27272a' }
});
