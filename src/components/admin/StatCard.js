import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const StatCard = ({ label, value, color, width }) => (
  <LinearGradient
    colors={[`${color}18`, `${color}08`]}
    style={[styles.card, width ? { width } : null]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <Text style={[styles.value, { color }]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  value: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
});

export default StatCard;
