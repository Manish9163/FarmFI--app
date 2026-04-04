import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CloudRain, Sun, Wind, Droplets, MapPin, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

import * as Location from 'expo-location';

import { WEATHER_API } from '../config/api';

import { evaluateClimateAlerts } from '../utils/SmartAlerts';

export default function WeatherScreen({ navigation }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Fetching GPS...');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async (customLocation = null) => {
    try {
      setLoading(true);
      let url = `${WEATHER_API}?`;

      if (customLocation) {
        setLocationStatus(`Searching for ${customLocation}...`);
        url += `location=${encodeURIComponent(customLocation)}`;
      } else {
        setLocationStatus('Requesting GPS Permissions...');
        // 1. Prompt Native GPS Permission!
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          setLocationStatus('Triangulating Satellites...');
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          url += `lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`;
        } else {
          setLocationStatus('Permission denied. Using fallback...');
          url += `location=Delhi`; // Fallback gracefully
        }
      }

      setLocationStatus('Connecting to Weather API...');
      const res = await axios.get(url);
      if (res.data && !res.data.error) {
        setWeather(res.data);
        
        // As soon as weather lands securely, trigger the AI Climate Evaluation Engine!
        await evaluateClimateAlerts(res.data.forecast);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>
        <Text style={styles.title}>Weather Forecast</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={{ color: '#fff', textAlign: 'center' }}>{locationStatus}</Text>
        ) : weather ? (
          <LinearGradient colors={['#06b6d4', '#3b82f6']} style={styles.currentWeather} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.topRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.city}>{weather.full_location || weather.location || 'Unknown'}</Text>
                <Text style={styles.date}>{weather.localtime || 'Today'}</Text>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                  onPress={() => setIsSearching(!isSearching)}
                >
                  <MapPin size={14} color="#fcd34d" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fcd34d', fontSize: 13, fontWeight: '700' }}>Change Location</Text>
                </TouchableOpacity>
              </View>
              <CloudRain size={48} color="#fff" />
            </View>

            {isSearching && (
              <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter city name..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => fetchWeather(searchQuery)}
                  returnKeyType="search"
                  autoFocus
                />
              </View>
            )}
            <Text style={styles.temp}>{weather.temperature}°</Text>
            <Text style={styles.condition}>{weather.description || 'Clear'}</Text>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Wind size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metricText}>{weather.wind_speed} km/h</Text>
              </View>
              <View style={styles.metric}>
                <Droplets size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metricText}>{weather.humidity}%</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <Text style={{ color: '#ef4444', textAlign: 'center' }}>Could not fetch live weather data.</Text>
        )}

        <Text style={styles.sectionTitle}>
          {weather?.forecast ? `${weather.forecast.length}-Day Forecast` : 'Forecast'}
        </Text>
        {weather?.forecast ? weather.forecast.map((day, i) => {
          // Calculate short day name if date exists
          const dateObj = new Date(day.date);
          const dayName = isNaN(dateObj) ? `Day ${i+1}` : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <View key={i} style={styles.dayRow}>
              <Text style={styles.dayText}>{dayName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sun size={20} color={day.chance_of_rain > 50 ? '#94a3b8' : '#f59e0b'} style={{ marginRight: 16 }} />
                <Text style={styles.highTemp}>{Math.round(day.max_temp)}°</Text>
                <Text style={styles.lowTemp}>{Math.round(day.min_temp)}°</Text>
              </View>
            </View>
          );
        }) : null}
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
  content: { padding: 24 },
  currentWeather: { padding: 24, borderRadius: 24, marginBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  city: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  date: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  temp: { fontSize: 64, fontWeight: '800', color: '#fff', letterSpacing: -2 },
  condition: { fontSize: 18, color: '#fff', fontWeight: '500', marginBottom: 32 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 12 },
  metrics: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  metric: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  metricText: { color: '#fff', marginLeft: 8, fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dayText: { color: '#e2e8f0', fontSize: 16, fontWeight: '500', width: 60 },
  highTemp: { color: '#fff', fontSize: 16, fontWeight: '700', width: 40, textAlign: 'right' },
  lowTemp: { color: '#64748b', fontSize: 16, width: 40, textAlign: 'right' }
});
