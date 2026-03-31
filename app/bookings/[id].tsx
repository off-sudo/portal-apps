import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Region } from 'react-native-maps';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchBookingById,
  fetchLatestLocation,
  formatBookingDate,
  formatLastUpdatedAt,
  getStatusStyle,
  getVehicleIcon,
  isActiveBooking,
  normalizeBooking,
  normalizeLocation,
} from '@/lib/booking-tracking';
import { supabase } from '@/lib/supabase';
import type { BookingLocationPoint, BookingSummary } from '@/types/bookings';

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 80.2214,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const NativeMapView = nativeMaps?.default as React.ComponentType<any> | undefined;
const NativeMarker = nativeMaps?.Marker as React.ComponentType<any> | undefined;
const NativePolyline = nativeMaps?.Polyline as React.ComponentType<any> | undefined;

type Coordinate = {
  latitude: number;
  longitude: number;
};

function toCoordinate(lat: number | null, lng: number | null): Coordinate | null {
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
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

function getTrackingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to load this booking.';
}

export default function BookingTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [currentLocation, setCurrentLocation] = useState<BookingLocationPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? '#0a0a0a' : '#f5f5f5';
  const card = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? '#555' : '#888';

  const loadTracking = useCallback(async () => {
    if (!user?.id || !bookingId) {
      setBooking(null);
      setCurrentLocation(null);
      setLoading(false);
      return;
    }

    try {
      const [bookingData, locationData] = await Promise.all([
        fetchBookingById(user.id, bookingId),
        fetchLatestLocation(bookingId),
      ]);

      setBooking(bookingData);
      setCurrentLocation(locationData);
      setError(null);
    } catch (err) {
      console.error('Booking detail fetch error:', err);
      setError(getTrackingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [bookingId, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadTracking();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadTracking]);

  useEffect(() => {
    if (!user?.id || !bookingId) return;

    const channel = supabase
      .channel(`booking-live-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          setBooking(normalizeBooking(payload.new as Record<string, unknown>));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_locations',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setCurrentLocation(normalizeLocation(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bookingId, user?.id]);

  const pickupCoordinate = useMemo(
    () => (booking ? toCoordinate(booking.pickup_lat, booking.pickup_lng) : null),
    [booking]
  );
  const dropCoordinate = useMemo(
    () => (booking ? toCoordinate(booking.drop_lat, booking.drop_lng) : null),
    [booking]
  );
  const truckCoordinate = useMemo(
    () => (currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng } : null),
    [currentLocation]
  );

  const mapPoints = useMemo(
    () => [pickupCoordinate, truckCoordinate, dropCoordinate].filter(Boolean) as Coordinate[],
    [dropCoordinate, pickupCoordinate, truckCoordinate]
  );
  const mapRegion = useMemo(() => buildRegion(mapPoints), [mapPoints]);
  const routePoints = useMemo(() => {
    return [pickupCoordinate, truckCoordinate, dropCoordinate].filter(Boolean) as Coordinate[];
  }, [dropCoordinate, pickupCoordinate, truckCoordinate]);

  const statusStyle = getStatusStyle(booking?.status ?? null, booking?.tracking_status);
  const vehicleIcon = getVehicleIcon(booking?.vehicle_type);
  const isTrackable = booking ? isActiveBooking(booking) : false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { borderColor: border, backgroundColor: card }]} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: text }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: text }]}>Live booking</Text>
            <Text style={[styles.headerSub, { color: muted }]}>Realtime truck tracking for your active booking</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        ) : !booking ? (
          <View style={[styles.emptyBox, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.emptyTitle, { color: text }]}>Booking not found</Text>
            <Text style={[styles.emptyText, { color: muted }]}>This booking is unavailable or no longer belongs to your account.</Text>
          </View>
        ) : (
          <>
            {error && (
              <View style={[styles.errorBox, { borderColor: '#FF572244', backgroundColor: '#FF572210' }]}>
                <Text style={styles.errorTitle}>Tracking error</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.heroCard, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.heroTopRow}>
                <View style={[styles.vehicleCircle, { backgroundColor: isDark ? '#222' : '#f1f1f1' }]}>
                  <Text style={styles.vehicleEmoji}>{vehicleIcon}</Text>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={[styles.routeText, { color: text }]}>
                    {booking.pickup_location || 'Pickup TBD'} → {booking.dropoff_location || 'Drop TBD'}
                  </Text>
                  <Text style={[styles.routeMeta, { color: muted }]}>
                    {formatBookingDate(booking.pickup_date)} · {booking.pickup_time || 'Time TBD'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                </View>
              </View>

              <View style={[styles.infoGrid, { borderTopColor: border }]}>
                <InfoBlock label="ETA" value={booking.eta_minutes != null ? `${booking.eta_minutes} min` : 'TBD'} muted={muted} text={text} />
                <InfoBlock label="Vehicle" value={booking.vehicle_label || booking.vehicle_type || 'Assigned soon'} muted={muted} text={text} />
                <InfoBlock label="Driver" value={booking.driver_name || 'Assigned soon'} muted={muted} text={text} />
                <InfoBlock label="Updated" value={formatLastUpdatedAt(currentLocation?.created_at)} muted={muted} text={text} />
              </View>
            </View>

            <View style={[styles.mapCard, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.mapTitleRow}>
                <Text style={[styles.mapTitle, { color: text }]}>Truck location</Text>
                <Text style={[styles.mapSub, { color: muted }]}>
                  {currentLocation ? `Last ping ${formatLastUpdatedAt(currentLocation.created_at)}` : 'Waiting for first location'}
                </Text>
              </View>

              {NativeMapView && NativeMarker ? (
                <View style={styles.mapShell}>
                  <NativeMapView
                    style={styles.map}
                    initialRegion={mapRegion}
                    region={mapRegion}>
                    {pickupCoordinate && (
                      <NativeMarker coordinate={pickupCoordinate} title="Pickup" description={booking.pickup_location || 'Pickup location'} pinColor="#00C853" />
                    )}
                    {dropCoordinate && (
                      <NativeMarker coordinate={dropCoordinate} title="Drop" description={booking.dropoff_location || 'Drop location'} pinColor="#FF5722" />
                    )}
                    {truckCoordinate && (
                      <NativeMarker coordinate={truckCoordinate} title="Truck" description={booking.vehicle_label || booking.vehicle_type || 'Live vehicle'}>
                        <View style={styles.truckMarker}>
                          <Text style={styles.truckMarkerText}>{vehicleIcon}</Text>
                        </View>
                      </NativeMarker>
                    )}
                    {NativePolyline && routePoints.length >= 2 && (
                      <NativePolyline coordinates={routePoints} strokeColor="#1a73e8" strokeWidth={3} />
                    )}
                  </NativeMapView>
                </View>
              ) : (
                <View style={[styles.webFallback, { borderColor: border }]}>
                  <Text style={[styles.webFallbackTitle, { color: text }]}>Native map preview</Text>
                  <Text style={[styles.webFallbackText, { color: muted }]}>
                    Open this screen on iOS or Android to see the live map. The realtime booking state still loads on web.
                  </Text>
                </View>
              )}

              {!currentLocation && (
                <View style={[styles.waitingBanner, { borderColor: border, backgroundColor: isDark ? '#141414' : '#fafafa' }]}>
                  <Text style={[styles.waitingTitle, { color: text }]}>Waiting for live tracking</Text>
                  <Text style={[styles.waitingText, { color: muted }]}>
                    Your booking is active, but no truck coordinates have been received yet.
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.detailCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Booking details</Text>
              <DetailRow label="Fare" value={booking.fare != null ? `₹${booking.fare}` : 'Pending'} muted={muted} text={text} border={border} />
              <DetailRow label="Tracking status" value={booking.tracking_status || 'not_started'} muted={muted} text={text} border={border} />
              <DetailRow label="Driver phone" value={booking.driver_phone || 'Available after assignment'} muted={muted} text={text} border={border} />
              <DetailRow label="Map points" value={`${pickupCoordinate ? 'Pickup' : 'No pickup pin'} · ${truckCoordinate ? 'Truck live' : 'No truck ping'} · ${dropCoordinate ? 'Drop' : 'No drop pin'}`} muted={muted} text={text} border={border} />
            </View>

            {!isTrackable && (
              <View style={[styles.infoBanner, { backgroundColor: card, borderColor: border }]}>
                <Text style={[styles.infoBannerTitle, { color: text }]}>Live tracking ended</Text>
                <Text style={[styles.infoBannerText, { color: muted }]}>
                  This booking is no longer in an active state. The screen is showing the last known trip information.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoBlock({
  label,
  value,
  muted,
  text,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
}) {
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: text }]}>{value}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  muted,
  text,
  border,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
  border: string;
}) {
  return (
    <View style={[styles.detailRow, { borderTopColor: border }]}>
      <Text style={[styles.detailLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 28, fontWeight: '400', marginTop: -2 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSub: { fontSize: 12, marginTop: 2 },

  loadingBox: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { borderWidth: 1, borderRadius: 16, padding: 22, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: { fontSize: 13, lineHeight: 20 },
  errorBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  errorTitle: { color: '#FF5722', fontWeight: '700' },
  errorText: { color: '#FF5722', fontSize: 12, lineHeight: 18 },

  heroCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  vehicleCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleEmoji: { fontSize: 22 },
  heroCopy: { flex: 1 },
  routeText: { fontSize: 16, fontWeight: '800' },
  routeMeta: { fontSize: 12, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    rowGap: 12,
  },
  infoBlock: { width: '50%', gap: 4, paddingRight: 12 },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { fontSize: 13, fontWeight: '700' },

  mapCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
  mapTitleRow: { gap: 4 },
  mapTitle: { fontSize: 17, fontWeight: '800' },
  mapSub: { fontSize: 12 },
  mapShell: {
    overflow: 'hidden',
    borderRadius: 16,
    height: 280,
  },
  map: { width: '100%', height: '100%' },
  truckMarker: {
    minWidth: 38,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  truckMarkerText: { fontSize: 18 },
  webFallback: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    minHeight: 180,
    justifyContent: 'center',
  },
  webFallbackTitle: { fontSize: 16, fontWeight: '700' },
  webFallbackText: { fontSize: 13, lineHeight: 20 },
  waitingBanner: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  waitingTitle: { fontSize: 13, fontWeight: '700' },
  waitingText: { fontSize: 12, lineHeight: 18 },

  detailCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  infoBanner: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  infoBannerTitle: { fontSize: 14, fontWeight: '800' },
  infoBannerText: { fontSize: 12, lineHeight: 18 },
});