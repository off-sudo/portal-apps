import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type RideType = 'mini' | 'sedan' | 'suv' | 'auto';

type CabDriver = {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  rating: number;
  etaMin: number;
  fare: number;
  type: RideType;
  icon: string;
};

type RideOption = {
  id: RideType;
  label: string;
  icon: string;
  desc: string;
  multiplier: number;
};

const RIDE_OPTIONS: RideOption[] = [
  { id: 'auto', label: 'Auto', icon: '🛺', desc: '1-3 seats', multiplier: 0.7 },
  { id: 'mini', label: 'Mini', icon: '🚗', desc: '4 seats', multiplier: 1.0 },
  { id: 'sedan', label: 'Sedan', icon: '🚕', desc: '4 seats · AC', multiplier: 1.3 },
  { id: 'suv', label: 'SUV', icon: '🚙', desc: '6 seats · AC', multiplier: 1.8 },
];

const MOCK_DRIVERS: CabDriver[] = [
  { id: 'd1', name: 'Rajan K.', vehicle: 'Swift Dzire', plate: 'TN09 AX 4421', rating: 4.8, etaMin: 3, fare: 189, type: 'sedan', icon: '🚕' },
  { id: 'd2', name: 'Priya S.', vehicle: 'Toyota Innova', plate: 'TN22 BK 7733', rating: 4.9, etaMin: 6, fare: 340, type: 'suv', icon: '🚙' },
  { id: 'd3', name: 'Murugan R.', vehicle: 'Maruti Baleno', plate: 'TN01 ZX 1190', rating: 4.6, etaMin: 9, fare: 210, type: 'mini', icon: '🚗' },
  { id: 'd4', name: 'Kavya M.', vehicle: 'Bajaj RE', plate: 'TN05 KK 3382', rating: 4.7, etaMin: 2, fare: 80, type: 'auto', icon: '🛺' },
];

const BASE_FARE = 189;

export default function RidesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pickup] = useState('Tambaram, Chennai');
  const [drop, setDrop] = useState('');
  const [selectedType, setSelectedType] = useState<RideType>('sedan');
  const [loading, setLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const filteredDrivers = MOCK_DRIVERS.filter((d) => d.type === selectedType);
  const rideOption = RIDE_OPTIONS.find((r) => r.id === selectedType)!;
  const fare = Math.round(BASE_FARE * rideOption.multiplier);
  const nearestDriver = filteredDrivers[0];

  useEffect(() => {
    const ready = drop.trim().length > 3;
    Animated.timing(sheetAnim, {
      toValue: ready ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [drop]);

  const bg = isDark ? '#0a0a0a' : '#f5f5f5';
  const card = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? '#555' : '#aaa';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: text }]}>Rides</Text>
        <View style={[styles.onlineBadge, { backgroundColor: '#1a73e8' + '18' }]}>
          <View style={[styles.liveDot, { backgroundColor: '#1a73e8' }]} />
          <Text style={[styles.onlineText, { color: '#1a73e8' }]}>{MOCK_DRIVERS.length} cabs live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Map Placeholder */}
        <View style={[styles.mapCard, { backgroundColor: isDark ? '#111' : '#e8f0fe', borderColor: border }]}>
          <View style={styles.mapOverlay}>
            {/* Simulated cab dots */}
            {[
              { top: '20%', left: '30%', icon: '🚕', color: '#FF5722' },
              { top: '55%', left: '60%', icon: '🚙', color: '#1a73e8' },
              { top: '70%', left: '20%', icon: '🛺', color: '#00C853' },
            ].map((dot, i) => (
              <View key={i} style={[styles.cabDot, { top: dot.top as any, left: dot.left as any, backgroundColor: dot.color }]}>
                <Text style={{ fontSize: 9 }}>{dot.icon}</Text>
              </View>
            ))}
            {/* You marker */}
            <View style={[styles.youPin, { top: '40%', left: '48%' }]}>
              <Text style={styles.youPinText}>YOU</Text>
            </View>
          </View>
          <Text style={[styles.mapHint, { color: muted }]}>Live map with cab markers on mobile</Text>
        </View>

        {/* Location Bar */}
        <View style={[styles.locCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.locRow}>
            <View style={styles.dotGreen} />
            <Text style={[styles.locFixed, { color: text }]}>{pickup}</Text>
          </View>
          <View style={[styles.locDivider, { backgroundColor: border }]} />
          <View style={styles.locRow}>
            <View style={styles.dotRed} />
            <TextInput
              style={[styles.locInput, { color: text }]}
              placeholder="Where to?"
              placeholderTextColor={muted}
              value={drop}
              onChangeText={setDrop}
              returnKeyType="search"
            />
            {drop.length > 0 && (
              <Pressable onPress={() => setDrop('')}>
                <Text style={{ color: muted, fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Ride Type Selector */}
        <Text style={[styles.sectionLabel, { color: muted }]}>RIDE TYPE</Text>
        <View style={styles.rideTypeRow}>
          {RIDE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.rideTypeCard,
                {
                  backgroundColor: selectedType === opt.id ? '#1a73e8' + '12' : card,
                  borderColor: selectedType === opt.id ? '#1a73e8' : border,
                },
              ]}
              onPress={() => setSelectedType(opt.id)}>
              <Text style={styles.rideTypeIcon}>{opt.icon}</Text>
              <Text style={[styles.rideTypeLabel, { color: text }]}>{opt.label}</Text>
              <Text style={[styles.rideTypeDesc, { color: muted }]}>{opt.desc}</Text>
              <Text style={[styles.rideTypeFare, { color: '#1a73e8' }]}>
                ₹{Math.round(BASE_FARE * opt.multiplier)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Nearby Drivers */}
        <Text style={[styles.sectionLabel, { color: muted }]}>NEAREST CABS</Text>
        {MOCK_DRIVERS.map((driver, idx) => (
          <Pressable
            key={driver.id}
            style={[
              styles.driverCard,
              {
                backgroundColor: card,
                borderColor: driver.type === selectedType && idx === 0 ? '#1a73e8' : border,
                borderWidth: driver.type === selectedType && idx === 0 ? 1.5 : 1,
              },
            ]}
            onPress={() => setSelectedType(driver.type)}>
            <View style={[styles.driverAvatar, { backgroundColor: driver.type === selectedType ? '#1a73e8' + '15' : isDark ? '#222' : '#f0f0f0' }]}>
              <Text style={{ fontSize: 20 }}>{driver.icon}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: text }]}>{driver.name}</Text>
              <Text style={[styles.driverMeta, { color: muted }]}>
                {driver.vehicle} · {driver.plate}
              </Text>
              <View style={styles.driverRatingRow}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={[styles.driverRating, { color: text }]}>{driver.rating}</Text>
              </View>
            </View>
            <View style={styles.driverRight}>
              <View style={[styles.etaBadge, { backgroundColor: '#1a73e8' + '15', borderColor: '#1a73e8' + '44' }]}>
                <Text style={[styles.etaText, { color: '#1a73e8' }]}>{driver.etaMin} min</Text>
              </View>
              <Text style={[styles.driverFare, { color: text }]}>₹{driver.fare}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: isDark ? '#111' : '#fff',
            borderTopColor: border,
            opacity: sheetAnim,
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          },
        ]}>
        <View style={styles.sheetHandle} />
        {nearestDriver ? (
          <View style={[styles.readyBanner, { borderColor: '#00C853' + '55', backgroundColor: '#00C853' + '10' }]}>
            <View style={[styles.liveDot, { backgroundColor: '#00C853' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.readyText}>Ride is ready!</Text>
              <Text style={[styles.readySub, { color: muted }]}>
                {nearestDriver.name} is {nearestDriver.etaMin} min away
              </Text>
            </View>
            <Text style={[styles.readyFare, { color: text }]}>₹{fare}</Text>
          </View>
        ) : (
          <View style={[styles.readyBanner, { borderColor: border, backgroundColor: card }]}>
            <Text style={[styles.readySub, { color: muted }]}>Select a ride type above</Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, { backgroundColor: '#1a73e8', opacity: pressed ? 0.88 : 1 }]}>
          <Text style={styles.confirmText}>
            Confirm {rideOption.label} · ₹{fare}
          </Text>
        </Pressable>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, fontWeight: '700' },

  scrollContent: { padding: 16, gap: 12 },

  mapCard: {
    borderWidth: 1,
    borderRadius: 16,
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  mapOverlay: { position: 'absolute', inset: 0 } as any,
  cabDot: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  youPin: {
    position: 'absolute',
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  youPinText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  mapHint: { fontSize: 11, zIndex: 1 },

  locCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00C853', flexShrink: 0 },
  dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5722', flexShrink: 0 },
  locFixed: { fontSize: 14, fontWeight: '600' },
  locInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  locDivider: { height: 1, marginLeft: 19 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: -4 },

  rideTypeRow: { flexDirection: 'row', gap: 8 },
  rideTypeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  rideTypeIcon: { fontSize: 22 },
  rideTypeLabel: { fontSize: 11, fontWeight: '800' },
  rideTypeDesc: { fontSize: 9, textAlign: 'center' },
  rideTypeFare: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  driverCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 14, fontWeight: '700' },
  driverMeta: { fontSize: 11, marginTop: 1 },
  driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  starIcon: { fontSize: 11, color: '#FFB300' },
  driverRating: { fontSize: 11, fontWeight: '700' },
  driverRight: { alignItems: 'flex-end', gap: 6 },
  etaBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  etaText: { fontSize: 11, fontWeight: '700' },
  driverFare: { fontSize: 14, fontWeight: '800' },

  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 4 },
  readyBanner: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyText: { fontSize: 13, color: '#00C853', fontWeight: '700' },
  readySub: { fontSize: 11, marginTop: 1 },
  readyFare: { fontSize: 18, fontWeight: '900' },
  confirmBtn: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});