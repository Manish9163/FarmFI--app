import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const { login, verifyOtp, resendOtp, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  
  const returnTo = route?.params?.returnTo;

  const handle = (name, value) => setForm({ ...form, [name]: value });

  const submitLogin = async () => {
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.requiresOtp) {
        setStep(2);
      } else {
        if (returnTo) navigation.replace(returnTo);
        else navigation.replace('Dashboard');
      }
    } else {
      Toast.show({ type: 'error', text1: 'Authentication Blocked', text2: result.error || 'Login failed' });
    }
  };

  const submitOtp = async () => {
    const result = await verifyOtp(form.email, form.otp);
    if (result.success) {
      if (returnTo) navigation.replace(returnTo);
      else navigation.replace('Dashboard');
    } else {
      Toast.show({ type: 'error', text1: 'Invalid Verification', text2: result.error });
    }
  };

  const handleResendOtp = async () => {
    const result = await resendOtp(form.email);
    if (!result.success) {
      Toast.show({ type: 'error', text1: 'Transmission Failed', text2: result.error || 'Failed to resend OTP' });
    } else {
      Toast.show({ type: 'success', text1: 'OTP Regenerated', text2: 'A new security code has been dispatched.' });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#09090b', '#18181b']} style={styles.container}>
        <View style={styles.card}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image 
              source={require('../../assets/farmfi_logo.png')} 
              resizeMode="contain"
              style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 8 }} 
            />
            <Text style={[styles.logo, { marginBottom: 0 }]}>FarmFi</Text>
          </View>
          <Text style={styles.title}>{step === 1 ? 'Sign in to your account' : 'Verify Email OTP'}</Text>
          <Text style={styles.subtitle}>{step === 1 ? 'Predictive Agriculture & Smart Marketplace' : `Enter code sent to ${form.email}`}</Text>

          {step === 1 ? (
            <View style={{ width: '100%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(val) => handle('email', val)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(val) => handle('password', val)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={submitLogin}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter OTP Code</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', letterSpacing: 10, fontSize: 20 }]}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.otp}
                  onChangeText={(val) => handle('otp', val)}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={submitOtp}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16 }} onPress={handleResendOtp} disabled={loading}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setStep(1)}>
                <Text style={styles.backText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <Text style={styles.authLink}>
              Don't have an account? <Text style={styles.linkText} onPress={() => navigation.navigate('Register')}>Register</Text>
            </Text>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 32,
    width: width * 0.9,
    maxWidth: 400,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#fafafa',
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  eyeIcon: {
    padding: 14,
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    boxShadow: '0px 4px 10px rgba(16, 185, 129, 0.3)',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resendText: {
    color: '#16a34a',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 14,
  },
  backText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 13,
  },
  authLink: {
    marginTop: 24,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
  },
  linkText: {
    color: '#34d399',
    fontWeight: '700',
  },
  alert: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    marginBottom: 20,
    width: '100%',
  },
  alertText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
});
