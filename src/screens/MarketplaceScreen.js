import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Search, Filter, Store, Star, ShoppingCart } from 'lucide-react-native';
import axios from 'axios';
import { MARKETPLACE_API } from '../config/api';

const { width } = Dimensions.get('window');

export default function MarketplaceScreen({ navigation, route }) {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeTab, setActiveTab] = useState('All');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCartCount();
    }, [])
  );

  const fetchCartCount = async () => {
    try {
      const res = await axios.get(`${MARKETPLACE_API}/cart`);
      if (res.data && Array.isArray(res.data)) {
        const count = res.data.reduce((acc, curr) => acc + curr.quantity, 0);
        setCartCount(count);
      }
    } catch (err) {
      console.warn("Cart count fetch err:", err.message);
    }
  };

  // When routed from Disease Screen with an openProductId, catch it and bypass straight to details
  useEffect(() => {
    if (route.params?.openProductId && allProducts.length > 0) {
      const targetProduct = allProducts.find(p => p.id === route.params.openProductId);
      if (targetProduct) {
        navigation.navigate('ProductDetail', { product: targetProduct });
        // Clear param so going back doesn't trigger an infinite loop
        navigation.setParams({ openProductId: undefined });
      }
    }
  }, [route.params?.openProductId, allProducts]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${MARKETPLACE_API}/products?per_page=100`);
      if (res.data && res.data.products) {
        const fetchedProducts = res.data.products;
        setAllProducts(fetchedProducts);
        setProducts(fetchedProducts);
        
        const uniqueCats = [...new Set(fetchedProducts.map(p => p.category))].filter(Boolean);
        setCategories(['All', ...uniqueCats]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (tab === 'All') {
      setProducts(allProducts);
    } else {
      setProducts(allProducts.filter(p => p.category === tab));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
          <ShoppingCart size={22} color="#fafafa" />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search seeds, fertilizers..." 
          placeholderTextColor="#64748b" 
          onChangeText={(txt) => {
            const lowerFilter = txt.toLowerCase();
            setProducts(allProducts.filter(p => 
              p.name.toLowerCase().includes(lowerFilter) && 
              (activeTab === 'All' || p.category === activeTab)
            ));
          }}
        />
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={20} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {categories.map((tab, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {products.map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={styles.card} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ProductDetail', { product: p })}
            >
              <View style={styles.cardImg}>
                {p.image_url ? (
                   <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                ) : (
                   <Store size={32} color="#64748b" />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.category}>{p.category}</Text>
                <Text style={styles.pName} numberOfLines={2}>{p.name}</Text>
                <View style={styles.row}>
                  <Text style={styles.pPrice}>₹{p.price}</Text>
                  <View style={styles.rating}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.rText}>4.5</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  cartBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end', position: 'relative' },
  badge: { 
    position: 'absolute', top: 2, right: -4, backgroundColor: '#ef4444', 
    minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: '#09090b'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, paddingLeft: 44, borderRadius: 12, color: '#fff', fontSize: 15 },
  searchIcon: { position: 'absolute', left: 32, zIndex: 1 },
  filterBtn: { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 12, marginLeft: 12 },
  
  content: { padding: 20 },
  tabsRow: { flexDirection: 'row', marginBottom: 24, paddingBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 12 },
  activeTab: { backgroundColor: '#f59e0b' },
  tabText: { color: '#94a3b8', fontWeight: '500' },
  activeTabText: { color: '#fff', fontWeight: '700' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: (width - 40 - 16) / 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, 
    marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' 
  },
  cardImg: { 
    height: 140, backgroundColor: 'rgba(255,255,255,0.05)', 
    justifyContent: 'center', alignItems: 'center', padding: 8 
  },
  cardBody: { padding: 12 },
  category: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  pName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 12, height: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pPrice: { color: '#10b981', fontSize: 18, fontWeight: '900' },
  rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  rText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' }
});
