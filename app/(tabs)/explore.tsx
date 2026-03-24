import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import type { Region } from 'react-native-maps';

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

type Coordinate = {
  latitude: number;
  longitude: number;
};

type DummyVan = {
  id: string;
  coordinate: Coordinate;
  etaMin: number;
  label: string;
  heading: number;
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

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 80.2214,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const VAN_OFFSETS = [
  { lat: 0.012, lng: -0.008, etaMin: 3, heading: 25 },
  { lat: -0.015, lng: 0.013, etaMin: 5, heading: 62 },
  { lat: 0.018, lng: 0.017, etaMin: 7, heading: 110 },
  { lat: -0.01, lng: -0.02, etaMin: 9, heading: 210 },
];

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const NativeMapView = nativeMaps?.default as React.ComponentType<any> | undefined;
const NativeMarker = nativeMaps?.Marker as React.ComponentType<any> | undefined;
const NativePolyline = nativeMaps?.Polyline as React.ComponentType<any> | undefined;

function formatCoordinateLabel(coords: Coordinate | null) {
  if (!coords) return 'Locating your device…';
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
}

function formatAddress(parts: Location.LocationGeocodedAddress[] | null | undefined, fallback: Coordinate | null) {
  const first = parts?.[0];
  if (!first) return formatCoordinateLabel(fallback);

  return [
    first.name,
    first.district,
    first.city,
  ]
    .filter(Boolean)
    .join(', ');
}

function buildDropFallbackCoordinate(origin: Coordinate, dropText: string): Coordinate {
  const hash = Array.from(dropText).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 12) + 4) * 0.002;
  const lngOffset = (((hash >> 1) % 12) - 6) * 0.0025;

  return {
    latitude: origin.latitude + latOffset,
    longitude: origin.longitude + lngOffset,
  };
}

function buildRegion(points: Coordinate[]): Region {
  if (points.length === 0) return DEFAULT_REGION;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + 0.05, 0.05),
    longitudeDelta: Math.max(maxLng - minLng + 0.05, 0.05),
  };
}

function buildDummyVans(origin: Coordinate | null, vehicle: Vehicle): DummyVan[] {
  if (!origin) return [];

  return VAN_OFFSETS.map((offset, index) => ({
    id: `${vehicle.id}-${index}`,
    coordinate: {
      latitude: origin.latitude + offset.lat,
      longitude: origin.longitude + offset.lng,
    },
    etaMin: offset.etaMin,
    heading: offset.heading,
    label: `${vehicle.name} ${index + 1}`,
  }));
}

export default function PortalServiceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [pickupLabel, setPickupLabel] = useState('Locating your device…');
  const [drop, setDrop] = useState('');
  const [dropCoordinate, setDropCoordinate] = useState<Coordinate | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('mini');
  const [hubs, setHubs] = useState<Hub[]>(BASE_HUBS);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [dropResolving, setDropResolving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [bookingReady, setBookingReady] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const vehicle = VEHICLES.find((v) => v.id === selectedVehicle) ?? VEHICLES[0];
  const dummyVans = useMemo(() => buildDummyVans(currentLocation, vehicle), [currentLocation, vehicle]);
  const totalAvailable = dummyVans.length;

  const loadCurrentLocation = useCallback(async () => {
    setLocationLoading(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationError('Location permission denied. Using the typed drop only.');
        setPickupLabel('Location permission denied');
        setCurrentLocation(null);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setCurrentLocation(coords);

      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        setPickupLabel(formatAddress(address, coords));
      } catch {
        setPickupLabel(formatCoordinateLabel(coords));
      }

      setLocationError(null);
    } catch (error) {
      console.error('Current location load failed:', error);
      setLocationError('Unable to read device location right now.');
      setPickupLabel('Unable to fetch current location');
    } finally {
      setLocationLoading(false);
    }
  }, []);

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

    Promise.all([loadCurrentLocation(), loadData()]).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [loadCurrentLocation, loadData]);

  useEffect(() => {
    const ready = drop.trim().length > 3 && !!currentLocation;
    setBookingReady(ready);
    Animated.timing(sheetAnim, {
      toValue: ready ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [currentLocation, drop, sheetAnim]);

  useEffect(() => {
    if (!currentLocation || drop.trim().length < 3) {
      setDropCoordinate(null);
      setDropResolving(false);
      return;
    }

    let cancelled = false;
    setDropResolving(true);

    const timer = setTimeout(async () => {
      try {
        const results = await Location.geocodeAsync(drop.trim());

        if (cancelled) return;

        if (results.length > 0) {
          setDropCoordinate({
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          });
        } else {
          setDropCoordinate(buildDropFallbackCoordinate(currentLocation, drop.trim()));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Drop geocode failed, using fallback point:', error);
          setDropCoordinate(buildDropFallbackCoordinate(currentLocation, drop.trim()));
        }
      } finally {
        if (!cancelled) {
          setDropResolving(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentLocation, drop]);

  const bg = isDark ? '#0a0a0a' : '#f5f5f5';
  const card = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? '#555' : '#aaa';

  const mapPoints = useMemo(() => {
    return [
      currentLocation,
      dropCoordinate,
      ...dummyVans.map((van) => van.coordinate),
    ].filter(Boolean) as Coordinate[];
  }, [currentLocation, dropCoordinate, dummyVans]);

  const routePoints = useMemo(() => {
    return [currentLocation, dropCoordinate].filter(Boolean) as Coordinate[];
  }, [currentLocation, dropCoordinate]);

  const mapRegion = useMemo(() => buildRegion(mapPoints), [mapPoints]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: text }]}>Portal Service</Text>
        <View style={[styles.availBadge, { backgroundColor: '#FF572218' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.availText}>{totalAvailable} vans live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.mapCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={[styles.mapTitle, { color: text }]}>Nearby vans</Text>
              <Text style={[styles.mapSub, { color: muted }]}>
                {dropResolving
                  ? 'Resolving drop location…'
                  : currentLocation
                    ? 'Showing live dummy fleet around your device location'
                    : 'Enable location to see nearby vans'}
              </Text>
            </View>
            {(loading || locationLoading) && <ActivityIndicator size="small" color="#FF5722" />}
          </View>

          {NativeMapView && NativeMarker ? (
            <View style={styles.mapShell}>
              <NativeMapView
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}>
                {currentLocation && (
                  <NativeMarker coordinate={currentLocation} title="Current location" description={pickupLabel} pinColor="#00C853" />
                )}
                {dropCoordinate && (
                  <NativeMarker coordinate={dropCoordinate} title="Drop" description={drop.trim()} pinColor="#FF5722" />
                )}
                {dummyVans.map((van) => (
                  <NativeMarker
                    key={van.id}
                    coordinate={van.coordinate}
                    title={van.label}
                    description={`${van.etaMin} min away`}>
                    <View style={styles.vanMarker}>
                      <Text style={styles.vanMarkerText}>{vehicle.icon}</Text>
                    </View>
                  </NativeMarker>
                ))}
                {NativePolyline && routePoints.length === 2 && (
                  <NativePolyline coordinates={routePoints} strokeColor="#1a73e8" strokeWidth={3} lineDashPattern={[8, 6]} />
                )}
              </NativeMapView>
            </View>
          ) : (
            <View style={[styles.webFallback, { borderColor: border }]}>
              <Text style={[styles.webFallbackTitle, { color: text }]}>Native map preview</Text>
              <Text style={[styles.webFallbackText, { color: muted }]}>
                Open on Android or iOS to see the live dummy fleet rendered on the map.
              </Text>
            </View>
          )}

          {locationError && (
            <View style={[styles.mapNotice, { borderColor: '#FF572244', backgroundColor: '#FF572210' }]}>
              <Text style={styles.noticeTitle}>Location status</Text>
              <Text style={styles.noticeText}>{locationError}</Text>
            </View>
          )}
        </View>

        <View style={[styles.locCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.locRow}>
            <View style={styles.dotGreen} />
            <View style={styles.locTextWrap}>
              <Text style={[styles.locFixed, { color: text }]}>
                {pickupLabel}
              </Text>
              <Text style={[styles.locHint, { color: muted }]}>
                {currentLocation ? 'Taken from your mobile device' : 'Waiting for mobile location'}
              </Text>
            </View>
          </View>
          <View style={[styles.locDivider, { backgroundColor: border }]} />
          <View style={styles.locRow}>
            <View style={styles.dotRed} />
            <TextInput
              style={[styles.locInput, { color: text }]}
              placeholder="Type your drop location"
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

        <Text style={[styles.sectionLabel, { color: muted }]}>CHOOSE VEHICLE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
          {VEHICLES.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.vehicleCard,
                {
                  backgroundColor: selectedVehicle === v.id ? '#FF572212' : card,
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

        <Text style={[styles.sectionLabel, { color: muted }]}>DUMMY VAN FEED</Text>
        {dummyVans.map((van) => (
          <View key={van.id} style={[styles.vanCard, { backgroundColor: card, borderColor: border }]}>
            <View>
              <Text style={[styles.vanName, { color: text }]}>{van.label}</Text>
              <Text style={[styles.vanMeta, { color: muted }]}>
                {van.coordinate.latitude.toFixed(4)}, {van.coordinate.longitude.toFixed(4)}
              </Text>
            </View>
            <View style={[styles.vanEtaBadge, { backgroundColor: '#FF572215' }]}>
              <Text style={styles.vanEtaText}>{van.etaMin} min</Text>
            </View>
          </View>
        ))}

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
              <View style={[styles.hubBadge, { backgroundColor: '#FF572215' }]}>
                <Text style={styles.hubBadgeText}>{hub.available} trucks</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: bookingReady ? 120 : 20 }} />
      </ScrollView>

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
        <View style={[styles.readyBanner, { borderColor: '#00C85355', backgroundColor: '#00C85310' }]}>
          <View style={styles.liveDot} />
          <View>
            <Text style={styles.readyText}>Truck ready nearby!</Text>
            <Text style={[styles.readySub, { color: muted }]}>
              {dummyVans[0]?.etaMin ?? 3} min away · {vehicle.name} selected
            </Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.88 : 1 }]}>
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
  availText: { fontSize: 11, color: '#FF5722', fontWeight: '700' },

  scrollContent: { padding: 16, gap: 12 },

  mapCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapTitle: { fontSize: 15, fontWeight: '700' },
  mapSub: { fontSize: 12 },
  mapShell: {
    overflow: 'hidden',
    borderRadius: 14,
    height: 260,
  },
  map: { width: '100%', height: '100%' },
  vanMarker: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  vanMarkerText: { fontSize: 16 },
  webFallback: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 18,
    gap: 8,
    minHeight: 180,
    justifyContent: 'center',
  },
  webFallbackTitle: { fontSize: 16, fontWeight: '700' },
  webFallbackText: { fontSize: 12, lineHeight: 18 },
  mapNotice: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  noticeTitle: { color: '#FF5722', fontWeight: '700', fontSize: 12 },
  noticeText: { color: '#FF5722', fontSize: 12, lineHeight: 18 },

  locCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00C853', flexShrink: 0 },
  dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5722', flexShrink: 0 },
  locTextWrap: { flex: 1 },
  locFixed: { fontSize: 14, fontWeight: '600' },
  locHint: { fontSize: 11, marginTop: 2 },
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

  vanCard: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vanName: { fontSize: 14, fontWeight: '700' },
  vanMeta: { fontSize: 12, marginTop: 2 },
  vanEtaBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  vanEtaText: { color: '#FF5722', fontWeight: '700', fontSize: 12 },

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
