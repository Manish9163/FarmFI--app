import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
// import SmsRetriever from 'react-native-sms-retriever';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const { requestOtp, verifyOtp, loading } = useAuth();
  const [form, setForm] = useState({ identifier: '', otp: '' });
  const [step, setStep] = useState(1);
  const [resendTimer, setResendTimer] = useState(0);
  const [inputType, setInputType] = useState('default');
  
  const returnTo = route?.params?.returnTo;

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleIdentifierChange = (val) => {
    // Aggressively swap keyboard to phone layout if string consists entirely of numbers/plus
    if (/^[0-9+]+$/.test(val) || val === '') setInputType('phone-pad');
    else setInputType('email-address');
    setForm({ ...form, identifier: val });
  };

  // const startSmsListener = async () => {
  //   try {
  //     const registered = await SmsRetriever.startSmsRetriever();
  //     if (registered) {
  //       SmsRetriever.addSmsListener(event => {
  //         if (event && event.message) {
  //           const otpMatch = event.message.match(/\b\d{6}\b/);
  //           if (otpMatch) {
  //             setForm(prev => ({ ...prev, otp: otpMatch[0] }));
  //             SmsRetriever.removeSmsListener();
  //             submitOtp(otpMatch[0]); // auto submit
  //           }
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     console.log('SMS Retriever Error:', error);
  //   }
  // };

  const handle = (name, value) => setForm({ ...form, [name]: value });

  const submitLogin = async () => {
    const result = await requestOtp(form.identifier);
    if (result.success) {
      setStep(2);
      setResendTimer(30);
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: result.message });
      if (Platform.OS === 'android') {
        startSmsListener();
      }
    } else {
      Toast.show({ type: 'error', text1: 'Request Failed', text2: result.error || 'Failed to send OTP' });
    }
  };

  const submitOtp = async (autoOtp = null) => {
    const currentOtp = autoOtp || form.otp;
    if (!currentOtp || currentOtp.length < 6) return;
    
    const result = await verifyOtp(form.identifier.replace(/\s+/g, ''), currentOtp);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Login Successful' });
      if (returnTo) navigation.replace(returnTo);
      else navigation.replace('Dashboard');
    } else {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: result.error });
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    const result = await requestOtp(form.identifier);
    if (result.success) {
      setResendTimer(30);
      Toast.show({ type: 'success', text1: 'OTP Resent', text2: result.message });
    } else {
      Toast.show({ type: 'error', text1: 'Failed to Resend', text2: result.error });
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
          <Text style={styles.title}>{step === 1 ? 'Sign in to your account' : 'Verify OTP'}</Text>
          <Text style={styles.subtitle}>{step === 1 ? 'Enter your Email or Phone Number' : `Enter the 6-digit code sent to ${form.identifier}`}</Text>

          {step === 1 ? (
            <View style={{ width: '100%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email or Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com or 9876543210"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType={inputType}
                  maxLength={inputType === 'phone-pad' ? 10 : undefined}
                  autoCapitalize="none"
                  value={form.identifier}
                  onChangeText={handleIdentifierChange}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={submitLogin}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
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

              <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={() => submitOtp()}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16 }} onPress={handleResendOtp} disabled={loading || resendTimer > 0}>
                <Text style={[styles.resendText, resendTimer > 0 && { color: '#64748b' }]}>
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Didn’t receive OTP? Resend'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setStep(1)}>
                <Text style={styles.backText}>Change Email/Phone</Text>
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
