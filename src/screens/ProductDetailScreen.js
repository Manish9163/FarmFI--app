import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ShoppingCart, Star, Share2, Heart, Plus, Minus, Tag, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import { MARKETPLACE_API } from '../config/api';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ navigation, route }) {
  const { product } = route.params || {};
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{color: '#fff'}}>Error: No product details provided.</Text>
      </SafeAreaView>
    );
  }

  const addToCart = async () => {
    setAddingToCart(true);
    try {
      await axios.post(`${MARKETPLACE_API}/cart`, {
        product_id: product.id,
        quantity: quantity
      });
      // Show short feedback then navigate directly to cart to push the funnel!
      Alert.alert("Success", `${product.name} added to your Cart!`, [
        { text: "Continue Shopping", style: "cancel" },
        { text: "View Cart", onPress: () => navigation.navigate('Cart') }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Cart Error", err.response?.data?.error || "Could not add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar floating over image */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFavorite(!isFavorite)}>
            <Heart size={22} color={isFavorite ? "#f43f5e" : "#fff"} fill={isFavorite ? "#f43f5e" : "transparent"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <ShoppingCart size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Large Product Image */}
        <View style={styles.imageContainer}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.fallbackImg}>
              <Tag size={64} color="#64748b" />
            </View>
          )}
        </View>

        {/* Product Details Section */}
        <View style={styles.detailsContainer}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View style={{flex: 1, paddingRight: 16}}>
              <Text style={styles.categoryBadge}>{product.category}</Text>
              <Text style={styles.productName}>{product.name}</Text>
              
              <View style={styles.ratingRow}>
                <Star size={16} color="#f59e0b" fill="#f59e0b" style={{marginRight: 6}} />
                <Star size={16} color="#f59e0b" fill="#f59e0b" style={{marginRight: 6}} />
                <Star size={16} color="#f59e0b" fill="#f59e0b" style={{marginRight: 6}} />
                <Star size={16} color="#f59e0b" fill="#f59e0b" style={{marginRight: 6}} />
                <Star size={16} color="#94a3b8" />
                <Text style={styles.ratingText}>(124 reviews)</Text>
              </View>
            </View>
            <Text style={styles.priceText}>₹{product.price}</Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Product Description</Text>
          <Text style={styles.descriptionText}>
            {product.description || `High-quality ${product.category} specifically formulated for maximum yield and active protection. Sourced straight from certified vendors to ensure genuine FarmFi quality standards applied to your crops.`}
          </Text>

          {/* Delivery Info */}
          <View style={styles.infoCard}>
            <ShieldCheck size={24} color="#10b981" />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.infoTitle}>100% Genuine Product</Text>
              <Text style={styles.infoSub}>Quality assured by FarmFi Labs</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Heavy Checkout Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.qtyControl}>
          <TouchableOpacity style={styles.qBtnAction} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
            <Minus size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.qTextVal}>{quantity}</Text>
          <TouchableOpacity style={styles.qBtnAction} onPress={() => setQuantity(quantity + 1)}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addToCartBtn} disabled={addingToCart} onPress={addToCart}>
          {addingToCart ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.addToCartText}>Add to Cart • ₹{product.price * quantity}</Text>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { 
    position: 'absolute', top: 40, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16
  },
  headerRight: { flexDirection: 'row', gap: 12 },
  iconBtn: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  
  imageContainer: {
    width: '100%', height: width * 0.9, backgroundColor: '#18181b',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  productImage: { width: '100%', height: '100%' },
  fallbackImg: { justifyContent: 'center', alignItems: 'center' },

  detailsContainer: { padding: 24 },
  categoryBadge: { 
    color: '#f59e0b', fontSize: 13, fontWeight: '800', 
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 
  },
  productName: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 12 },
  priceText: { color: '#10b981', fontSize: 32, fontWeight: '900' },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#64748b', fontSize: 14, marginLeft: 8 },
  
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', my: 24, marginVertical: 24 },
  
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  descriptionText: { color: '#94a3b8', fontSize: 15, lineHeight: 24 },

  infoCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', 
    padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)'
  },
  infoTitle: { color: '#10b981', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  infoSub: { color: '#64748b', fontSize: 13 },

  bottomBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#18181b', padding: 20, paddingBottom: 36, 
    flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center'
  },
  qtyControl: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', 
    borderRadius: 16, padding: 4, marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  qBtnAction: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  qTextVal: { color: '#fff', fontSize: 18, fontWeight: '700', width: 40, textAlign: 'center' },
  
  addToCartBtn: {
    flex: 1, backgroundColor: '#3b82f6', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  addToCartText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
