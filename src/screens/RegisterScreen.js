import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Eye, EyeOff, User, Mail, Phone, Briefcase } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { AUTH_API } from '../config/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'Farmer' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (name, value) => setForm({ ...form, [name]: value });

  const submitRegistration = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.password) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'All fields are absolutely required.' });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API}/register`, form);
      if (response.status === 201) {
        Toast.show({ type: 'success', text1: 'Registration Complete', text2: 'Welcome to FarmFi! Please login with your new credentials.' });
        navigation.replace('Login');
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollInside} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Image 
                source={require('../../assets/farmfi_logo.png')} 
                resizeMode="contain"
                style={{ width: 60, height: 60, borderRadius: 16, marginBottom: 8 }} 
              />
              <Text style={[styles.logo, { marginBottom: 0 }]}>Create Account</Text>
            </View>
            <Text style={styles.subtitle}>Join the premier AI Agriculture ecosystem.</Text>

            <View style={{ width: '100%' }}>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Legal Name</Text>
                <View style={styles.inputContainer}>
                  <User size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={form.full_name}
                    onChangeText={(val) => handle('full_name', val)}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Mail size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@domain.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(val) => handle('email', val)}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputContainer}>
                  <Phone size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.phone}
                    onChangeText={(val) => handle('phone', val)}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Account Identity Type</Text>
                <View style={styles.roleContainer}>
                   {['Farmer', 'Worker'].map(role => (
                     <TouchableOpacity
                        key={role} 
                        style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
                        onPress={() => handle('role', role)}>
                        <Text style={[styles.roleText, form.role === role && styles.roleTextActive]}>{role}</Text>
                     </TouchableOpacity>
                   ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, { paddingRight: 0 }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingLeft: 14 }]}
                    placeholder="Create a strong password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(val) => handle('password', val)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={submitRegistration}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register Now</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.authLink}>
              Already have an account? <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>Login</Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollInside: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 24, padding: 32, width: width * 0.9, maxWidth: 400, borderColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 },
  subtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', marginBottom: 24, textAlign: 'center' },
  formGroup: { marginBottom: 16, width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  inputIcon: { marginLeft: 16 },
  input: { flex: 1, padding: 14, color: '#fafafa', fontSize: 15 },
  eyeIcon: { padding: 14 },
  roleContainer: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  roleText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: '#fff', fontWeight: '800' },
  primaryBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  authLink: { marginTop: 24, color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 },
  linkText: { color: '#34d399', fontWeight: '700' },
  alert: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)', marginBottom: 20, width: '100%' },
  alertText: { color: '#f87171', fontSize: 14, textAlign: 'center' },
});
