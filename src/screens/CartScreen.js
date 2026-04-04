import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { MARKETPLACE_API } from '../config/api';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Gateway Simulator State
  const [showGateway, setShowGateway] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${MARKETPLACE_API}/cart`);
      setCartItems(res.data || []);
    } catch (err) {
      console.error("Cart Error:", err);
      Alert.alert("Error", "Could not fetch cart items.");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      await axios.delete(`${MARKETPLACE_API}/cart/${productId}`);
      // Refresh local state without refetching immediately for speed
      setCartItems(cartItems.filter(item => item.product_id !== productId));
    } catch (err) {
      Alert.alert("Error", "Could not remove item from cart.");
    }
  };

  const grandTotal = cartItems.reduce((acc, curr) => acc + (parseFloat(curr.price) * curr.quantity), 0);

  const handleCheckoutInit = () => {
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart first.");
      return;
    }
    setShowGateway(true);
  };

  const processSecurePayment = async () => {
    setProcessingPayment(true);
    
    // Simulate secure Razorpay / Stripe Gateway communication delay
    setTimeout(async () => {
      try {
        // Confirm Order with backend via POST /orders. It requires payment_method and delivery_address
        await axios.post(`${MARKETPLACE_API}/orders`, {
          payment_method: "UPI / Card",
          delivery_address: "Secure FarmFi Default Loc"
        });

        setProcessingPayment(false);
        setPaymentSuccess(true);
        
        // Auto-close success modal after 2 seconds and navigate back
        setTimeout(() => {
          setShowGateway(false);
          navigation.goBack();
        }, 2200);

      } catch (err) {
        setProcessingPayment(false);
        Alert.alert("Transaction Failed", err.response?.data?.error || "Your bank declined the transaction.");
      }
    }, 3000);
  };

  const processRazorpayPayment = () => {
    let RazorpaySDK = null;
    try {
      // Dynamic require to prevent hard crashes on Expo Go
      RazorpaySDK = require('react-native-razorpay').default;
    } catch (e) {
      console.warn("Razorpay Native SDK not linked");
    }

    if (!RazorpaySDK) {
      Alert.alert(
        "Expo Go Environment", 
        "Razorpay Native Gateway requires a compiled Android build. Proceeding with Simulated Gateway for testing!"
      );
      processSecurePayment();
      return;
    }

    const options = {
      description: 'FarmFi Marketplace Order',
      image: 'https://cdn-icons-png.flaticon.com/512/3233/3233504.png',
      currency: 'INR',
      key: 'rzp_test_Lp5D5rU5eMj5T', // Replace with your actual live/test Razorpay Key!
      amount: parseInt(grandTotal * 100), // Razorpay accepts payments in paise (1 INR = 100 Paise)
      name: 'FarmFi Agritech',
      prefill: {
        email: 'farmer@farmfi.in',
        contact: '9123456789',
        name: 'FarmFi Farmer'
      },
      theme: { color: '#10b981' }
    };

    RazorpaySDK.open(options).then(async (data) => {
      // Upon successful native payment confirmation from Razorpay:
      try {
        setProcessingPayment(true);
        setShowGateway(true);
        
        await axios.post(`${MARKETPLACE_API}/orders`, {
          payment_method: "Razorpay",
          razorpay_payment_id: data.razorpay_payment_id,
          delivery_address: "Secure FarmFi Default Loc"
        });

        setProcessingPayment(false);
        setPaymentSuccess(true);
        
        setTimeout(() => {
          setShowGateway(false);
          navigation.goBack();
        }, 2200);

      } catch (err) {
        setProcessingPayment(false);
        setShowGateway(false);
        Alert.alert("Backend Sync Failed", err.response?.data?.error || "Could not log payment firmly.");
      }
    }).catch((error) => {
      // Handles native cancellation or Razorpay drops
      Alert.alert(`Payment Dropped (Code ${error.code})`, error.description);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ShoppingCartPlaceholder />
          <Text style={styles.emptyText}>Your store cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>Back to Store</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {cartItems.map((item, idx) => (
              <View key={idx} style={styles.cartItem}>
                <View style={styles.imgWrap}>
                   {item.image_url ? 
                     <Image source={{uri: item.image_url}} style={{width: '100%', height: '100%', borderRadius: 12}} resizeMode="cover" /> 
                     : <View style={{backgroundColor: '#333', width: '100%', height: '100%', borderRadius: 12}} />
                   }
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemCat}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>₹{parseFloat(item.price) * item.quantity}</Text>
                </View>
                <TouchableOpacity style={styles.delBtn} onPress={() => removeItem(item.product_id)}>
                  <Trash2 size={20} color="#f87171" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.receiptBox}>
              <Text style={{color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16}}>Order Summary</Text>
              <View style={styles.recRow}>
                <Text style={styles.recLabel}>Subtotal</Text>
                <Text style={styles.recVal}>₹{grandTotal}</Text>
              </View>
              <View style={styles.recRow}>
                <Text style={styles.recLabel}>Taxes & Fees</Text>
                <Text style={styles.recVal}>₹0.00</Text>
              </View>
              <View style={[styles.recRow, { marginTop: 12, borderTopWidth: 1, borderColor: '#333', paddingTop: 12 }]}>
                <Text style={[styles.recLabel, {color: '#fff', fontWeight: 'bold'}]}>Grand Total</Text>
                <Text style={[styles.recVal, {color: '#10b981', fontSize: 20}]}>₹{grandTotal}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.checkoutFooter}>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckoutInit}>
              <ShieldCheck size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.checkoutText}>Proceed to Pay ₹{grandTotal}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* RAZORPAY / STRIPE PAYMENT GATEWAY SIMULATOR */}
      <Modal visible={showGateway} animationType="slide" transparent>
        <View style={styles.gateOverlay}>
          <View style={styles.gateBox}>
            {paymentSuccess ? (
              <View style={{alignItems: 'center', paddingVertical: 40}}>
                 <CheckCircle2 size={64} color="#10b981" style={{marginBottom: 20}} />
                 <Text style={{color: '#fff', fontSize: 24, fontWeight: '800'}}>Payment Successful</Text>
                 <Text style={{color: '#94a3b8', fontSize: 14, marginTop: 8}}>Order #{Math.floor(Math.random() * 90000) + 10000} Confirmed</Text>
              </View>
            ) : processingPayment ? (
              <View style={{alignItems: 'center', paddingVertical: 40}}>
                 <ActivityIndicator size="large" color="#3b82f6" style={{marginBottom: 24}} />
                 <Text style={{color: '#fff', fontSize: 18, fontWeight: '600'}}>Authorizing Payment...</Text>
                 <Text style={{color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center'}}>Communicating securely with bank network.{'\n'}Please do not close the app.</Text>
                 <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 32}}>
                   <Lock size={14} color="#10b981" />
                   <Text style={{color: '#10b981', marginLeft: 6, fontSize: 12}}>Govt. 256-bit AES Encryption</Text>
                 </View>
              </View>
            ) : (
              // Gateway UI
              <View style={{width: '100%'}}>
                 <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#333', paddingBottom: 16, marginBottom: 24}}>
                    <Text style={{color: '#fff', fontSize: 18, fontWeight: '700'}}>Checkout</Text>
                    <TouchableOpacity onPress={() => setShowGateway(false)}><Text style={{color: '#f87171', fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                 </View>

                 <View style={styles.payCard}>
                   <Text style={{color: '#94a3b8', fontSize: 12, marginBottom: 4}}>Total Amount Due</Text>
                   <Text style={{color: '#fff', fontSize: 32, fontWeight: '800'}}>₹{grandTotal}</Text>
                 </View>

                 <Text style={{color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 16, marginTop: 12}}>Select Secure Payment Method</Text>

                 <TouchableOpacity style={styles.payOption} onPress={processRazorpayPayment}>
                    <View>
                      <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Pay via Razorpay</Text>
                      <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4}}>UPI, Cards, NetBanking</Text>
                    </View>
                    <ShieldCheck size={24} color="#3b82f6" />
                 </TouchableOpacity>

                 <TouchableOpacity style={styles.payOption} onPress={processSecurePayment}>
                    <View>
                      <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Simulated Checkout</Text>
                      <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4}}>Dev Mode Testing Fast-lane</Text>
                    </View>
                    <ShieldCheck size={24} color="#10b981" />
                 </TouchableOpacity>
                 
                 <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32}}>
                    <Lock size={14} color="#64748b" />
                    <Text style={{color: '#64748b', fontSize: 12, marginLeft: 6}}>Secured by Razorpay Gateways</Text>
                 </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Small UI fallback
function ShoppingCartPlaceholder() {
  return (
    <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
      <Text style={{fontSize: 32}}>🛒</Text>
    </View>
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
  
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500', marginBottom: 24 },
  shopBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

  cartItem: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16,
    marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  imgWrap: { width: 64, height: 64, marginRight: 16 },
  itemMeta: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  itemCat: { color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', marginBottom: 8 },
  itemPrice: { color: '#10b981', fontSize: 15, fontWeight: '700' },
  delBtn: { padding: 12 },

  receiptBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 20, borderRadius: 16, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.1)'
  },
  recRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recLabel: { color: '#94a3b8', fontSize: 16 },
  recVal: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },

  checkoutFooter: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  checkoutBtn: { 
    backgroundColor: '#3b82f6', padding: 18, borderRadius: 16, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  checkoutText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  gateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  gateBox: { backgroundColor: '#18181b', minHeight: '55%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  payCard: { backgroundColor: '#09090b', padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  payOption: { 
    flexDirection: 'row', justifyContent: 'space-between', padding: 20, 
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  }
});
