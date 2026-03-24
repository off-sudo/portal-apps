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
import { supabase } from '@/lib/supabase';

type Hub = {
  id: string;
  name: string;
  area: string;
  available: number;
};

type Vehicle = {
  id: string;
  icon: string;
  name: string;
  description: string;
  price: number;
  eta: string;
  tag?: string;
};

const VEHICLES: Vehicle[] = [
  { id: 'mini', icon: '🚛', name: 'Mini Truck', description: 'Up to 1 ton', price: 450, eta: '4 min', tag: 'POPULAR' },
  { id: 'pickup', icon: '🚚', name: 'Pickup', description: 'Up to 750 kg', price: 320, eta: '6 min' },
  { id: 'large', icon: '🏗', name: 'Large Truck', description: 'Up to 5 ton', price: 980, eta: '12 min' },
  { id: 'auto', icon: '🛺', name: 'Auto Goods', description: 'Small parcels', price: 180, eta: '3 min', tag: 'FAST' },
];

const BASE_HUBS: Hub[] = [
  { id: 'okhla', name: 'Okhla Hub', area: 'South Delhi', available: 9 },
  { id: 'azadpur', name: 'Azadpur Yard', area: 'North Delhi', available: 7 },
  { id: 'dwarka', name: 'Dwarka Fleet Point', area: 'West Delhi', available: 6 },
  { id: 'anand-vihar', name: 'Anand Vihar Depot', area: 'East Delhi', available: 8 },
];

export default function PortalServiceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pickup] = useState('Tambaram, Chennai');
  const [drop, setDrop] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('mini');
  const [hubs, setHubs] = useState<Hub[]>(BASE_HUBS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingReady, setBookingReady] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const vehicle = VEHICLES.find((v) => v.id === selectedVehicle) ?? VEHICLES[0];

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('pickup_location')
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .gte('created_at', new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString());

    const pickupRows = ((data as { pickup_location: string | null }[] | null) ?? []).map(
      (row) => row.pickup_location?.toLowerCase() || ''
    );
    const weighted = BASE_HUBS.map((hub) => {
      const matchCount = pickupRows.filter((p) => p.includes(hub.area.toLowerCase().split(' ')[0])).length;
      return { ...hub, available: Math.max(2, hub.available - Math.min(4, matchCount)) };
    });
    setHubs(weighted);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadData().finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [loadData]);

  // Show "ready" banner when drop is filled
  useEffect(() => {
    const ready = drop.trim().length > 3;
    setBookingReady(ready);
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

  const totalAvailable = hubs.reduce((s, h) => s + h.available, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

      {/* Sticky Header */}
      <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: text }]}>Portal Service</Text>
        <View style={[styles.availBadge, { backgroundColor: '#FF5722' + '18' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.availText}>{totalAvailable} trucks live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Map Placeholder */}
        <View style={[styles.mapCard, { backgroundColor: isDark ? '#111' : '#e8f0fe', borderColor: border }]}>
          <Text style={[styles.mapEmoji, { color: muted }]}>🗺</Text>
          <Text style={[styles.mapTitle, { color: text }]}>Live map (mobile)</Text>
          <Text style={[styles.mapSub, { color: muted }]}>Truck markers & route shown in the app</Text>
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
              placeholder="Enter drop location"
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

        {/* Vehicle Selector */}
        <Text style={[styles.sectionLabel, { color: muted }]}>CHOOSE VEHICLE</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
          {VEHICLES.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.vehicleCard,
                {
                  backgroundColor: selectedVehicle === v.id ? '#FF5722' + '12' : card,
                  borderColor: selectedVehicle === v.id ? '#FF5722' : border,
                },
              ]}
              onPress={() => setSelectedVehicle(v.id)}>
              {v.tag && (
                <View style={styles.vehicleTag}>
                  <Text style={styles.vehicleTagText}>{v.tag}</Text>
                </View>
              )}
              <Text style={styles.vehicleIcon}>{v.icon}</Text>
              <Text style={[styles.vehicleName, { color: text }]}>{v.name}</Text>
              <Text style={[styles.vehicleDesc, { color: muted }]}>{v.description}</Text>
              <Text style={[styles.vehiclePrice, { color: '#FF5722' }]}>₹{v.price}</Text>
              <Text style={[styles.vehicleEta, { color: muted }]}>{v.eta}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Hub List */}
        <Text style={[styles.sectionLabel, { color: muted }]}>NEARBY HUBS</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#FF5722" style={{ marginTop: 12 }} />
        ) : (
          hubs.map((hub) => (
            <View key={hub.id} style={[styles.hubCard, { backgroundColor: card, borderColor: border }]}>
              <View>
                <Text style={[styles.hubName, { color: text }]}>{hub.name}</Text>
                <Text style={[styles.hubArea, { color: muted }]}>{hub.area}</Text>
              </View>
              <View style={[styles.hubBadge, { backgroundColor: '#FF5722' + '15' }]}>
                <Text style={styles.hubBadgeText}>{hub.available} trucks</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: bookingReady ? 120 : 20 }} />
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
        <View style={[styles.readyBanner, { borderColor: '#00C853' + '55', backgroundColor: '#00C853' + '10' }]}>
          <View style={styles.liveDot} />
          <View>
            <Text style={styles.readyText}>Truck ready nearby!</Text>
            <Text style={[styles.readySub, { color: muted }]}>
              {hubs[0]?.available ?? 3} drivers nearby · {vehicle.eta} away
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.88 : 1 }]}>
          <Text style={styles.confirmText}>Book {vehicle.name} · ₹{vehicle.price}</Text>
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
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00C853' },
  availText: { fontSize: 11, color: '#00C853', fontWeight: '700' },

  scrollContent: { padding: 16, gap: 12 },

  mapCard: {
    borderWidth: 1,
    borderRadius: 16,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
  },
  mapEmoji: { fontSize: 32 },
  mapTitle: { fontSize: 15, fontWeight: '700' },
  mapSub: { fontSize: 12 },

  locCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00C853', flexShrink: 0 },
  dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5722', flexShrink: 0 },
  locFixed: { fontSize: 14, fontWeight: '600' },
  locInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  locDivider: { height: 1, marginLeft: 19 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: -4 },

  vehicleScroll: { flexGrow: 0 },
  vehicleCard: {
    width: 100,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  vehicleTag: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FF5722', borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  vehicleTagText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  vehicleIcon: { fontSize: 28, marginTop: 6 },
  vehicleName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  vehicleDesc: { fontSize: 9, textAlign: 'center' },
  vehiclePrice: { fontSize: 13, fontWeight: '800' },
  vehicleEta: { fontSize: 9 },

  hubCard: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hubName: { fontSize: 14, fontWeight: '700' },
  hubArea: { fontSize: 12, marginTop: 2 },
  hubBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  hubBadgeText: { color: '#FF5722', fontWeight: '700', fontSize: 12 },

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
  confirmBtn: { backgroundColor: '#FF5722', borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});