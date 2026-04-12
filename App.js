import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { View, Text } from 'react-native';
import { CheckCircle2, ShieldAlert, Info } from 'lucide-react-native';

import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AdminScreen from './src/screens/admin/AdminScreen';

import DiseaseScreen from './src/screens/DiseaseScreen';
import CropRecommendationScreen from './src/screens/CropRecommendationScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import CreditScreen from './src/screens/CreditScreen';
import RiskScreen from './src/screens/RiskScreen';
import WorkersScreen from './src/screens/WorkersScreen';
import PlantingCalendarScreen from './src/screens/PlantingCalendarScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { AuthProvider } from './src/hooks/useAuth';

import './src/i18n'; // Intialize multilingual support

ExpoSplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const customTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#09090b' },
  fonts: {
    regular: { fontFamily: '', fontWeight: 'normal' },
    medium: { fontFamily: '', fontWeight: 'normal' },
    bold: { fontFamily: '', fontWeight: 'bold' },
    heavy: { fontFamily: '', fontWeight: 'bold' },
    ...DarkTheme.fonts,
  }
};

const toastConfig = {
  success: (props) => (
    <View style={{ width: '90%', backgroundColor: 'rgba(16, 185, 129, 0.95)', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 12 }}>
      <CheckCircle2 color="#ffffff" size={24} style={{ marginRight: 16 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: '#ffffff', fontSize: 15, marginBottom: 2 }}>{props.text1}</Text>
        {props.text2 ? <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' }}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={{ width: '90%', backgroundColor: 'rgba(239, 68, 68, 0.95)', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 12 }}>
      <ShieldAlert color="#ffffff" size={24} style={{ marginRight: 16 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: '#ffffff', fontSize: 15, marginBottom: 2 }}>{props.text1}</Text>
        {props.text2 ? <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' }}>{props.text2}</Text> : null}
      </View>
    </View>
  )
};

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setAppReady(true);
    }, 100);
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#09090b' }}>
      <AuthProvider>
        <NavigationContainer theme={customTheme}>
          <Stack.Navigator 
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#09090b' },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Credit" component={CreditScreen} />
            <Stack.Screen name="CropRecommendation" component={CropRecommendationScreen} />
            <Stack.Screen name="Disease" component={DiseaseScreen} />
            <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="PlantingCalendar" component={PlantingCalendarScreen} />
            <Stack.Screen name="Risk" component={RiskScreen} />
            <Stack.Screen name="Weather" component={WeatherScreen} />
            <Stack.Screen name="Workers" component={WorkersScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>

      {(!appReady || !splashAnimationDone) && (
        <AnimatedSplashScreen 
          onAnimationComplete={() => setSplashAnimationDone(true)} 
        />
      )}
      
      <Toast config={toastConfig} position="top" topOffset={55} />
    </SafeAreaProvider>
  );
}
