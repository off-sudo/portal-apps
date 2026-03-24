import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DEMO_BOOKINGS,
  fetchUserBookings,
  formatBookingDate,
  getStatusStyle,
  getVehicleIcon,
} from '@/lib/booking-tracking';
import type { BookingSummary } from '@/types/bookings';

type TabKey = 'active' | 'scheduled' | 'past';

function getBookingGroups(bookings: BookingSummary[]) {
  const today = new Date().toISOString().slice(0, 10);
  const active: BookingSummary[] = [];
  const scheduled: BookingSummary[] = [];
  const past: BookingSummary[] = [];

  bookings.forEach((booking) => {
    const status = (booking.status || '').toLowerCase();
    const isUpcoming = !!booking.pickup_date && booking.pickup_date >= today;
    const isLive = status === 'in_progress' || booking.tracking_status === 'live';

    if (status === 'completed' || status === 'cancelled') {
      past.push(booking);
      return;
    }

    if (isLive) {
      active.push(booking);
      return;
    }

    if (isUpcoming) {
      scheduled.push(booking);
      return;
    }

    active.push(booking);
  });

  return { active, scheduled, past };
}

function getBookingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to load bookings right now.';
}

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings(DEMO_BOOKINGS);
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const result = await fetchUserBookings(user.id);
      setBookings(result);
    } catch (err) {
      console.error('Bookings fetch error:', err);
      setError(getBookingErrorMessage(err));
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBookings();
    }, [loadBookings])
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`customer-bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadBookings, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
  }, [loadBookings]);

  const groups = useMemo(() => getBookingGroups(bookings), [bookings]);

  const tabData: Record<TabKey, BookingSummary[]> = {
    active: groups.active,
    scheduled: groups.scheduled,
    past: groups.past,
  };

  const bg = isDark ? '#0a0a0a' : '#f5f5f5';
  const card = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text = isDark ? '#fff' : '#111';
  const muted = isDark ? '#555' : '#aaa';

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: tabData.active.length },
    { key: 'scheduled', label: 'Scheduled', count: tabData.scheduled.length },
    { key: 'past', label: 'Past', count: tabData.past.length },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>Bookings</Text>
          <Text style={[styles.headerSub, { color: muted }]}>Track live trucks and check booking status.</Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.totalCount, { color: text }]}>{bookings.length}</Text>
          <Text style={[styles.totalLabel, { color: muted }]}>total</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { backgroundColor: bg, borderBottomColor: border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && [styles.tabActive, { borderBottomColor: '#FF5722' }],
            ]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabText, { color: activeTab === tab.key ? '#FF5722' : muted }]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: activeTab === tab.key ? '#FF5722' : muted },
                ]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
        showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorBox, { borderColor: '#FF572244', backgroundColor: '#FF572210' }]}>
            <Text style={styles.errorTitle}>Booking sync error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        ) : tabData[activeTab].length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: border }]}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'active' ? '🚦' : activeTab === 'scheduled' ? '📅' : '🕐'}
            </Text>
            <Text style={[styles.emptyTitle, { color: text }]}>
              {activeTab === 'active'
                ? 'No active trips'
                : activeTab === 'scheduled'
                  ? 'Nothing scheduled'
                  : 'No past bookings'}
            </Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              {activeTab === 'active'
                ? 'Your in-progress bookings and live trucks will appear here.'
                : activeTab === 'scheduled'
                  ? 'Upcoming confirmed bookings will show here.'
                  : 'Completed and cancelled bookings will show here.'}
            </Text>
          </View>
        ) : (
          tabData[activeTab].map((item) => (
            <BookingCard
              key={item.id}
              item={item}
              card={card}
              border={border}
              text={text}
              muted={muted}
              isDark={isDark}
              onPress={() => router.push(`/bookings/${item.id}` as never)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type BookingCardProps = {
  item: BookingSummary;
  card: string;
  border: string;
  text: string;
  muted: string;
  isDark: boolean;
  onPress: () => void;
};

function BookingCard({ item, card, border, text, muted, isDark, onPress }: BookingCardProps) {
  const icon = getVehicleIcon(item.vehicle_type);
  const statusStyle = getStatusStyle(item.status, item.tracking_status);
  const lastUpdate =
    item.tracking_status === 'live'
      ? item.eta_minutes != null
        ? `${item.eta_minutes} min away`
        : 'Live tracking started'
      : item.pickup_time || 'Time TBD';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bookingCard,
        { backgroundColor: card, borderColor: border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={[styles.vehicleIconBox, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
          <Text style={styles.vehicleIcon}>{icon}</Text>
        </View>
        <View style={styles.cardMainInfo}>
          <Text style={[styles.routeText, { color: text }]} numberOfLines={1}>
            {item.pickup_location || 'Pickup TBD'} → {item.dropoff_location || 'Drop TBD'}
          </Text>
          <Text style={[styles.cardMeta, { color: muted }]}>
            {formatBookingDate(item.pickup_date)} · {lastUpdate}
          </Text>
          {(item.driver_name || item.vehicle_label) && (
            <Text style={[styles.cardSupportMeta, { color: muted }]}>
              {[item.driver_name, item.vehicle_label].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={[styles.cardBottomRow, { borderTopColor: isDark ? '#222' : '#f0f0f0' }]}>
        <Text style={[styles.vehicleTypeText, { color: muted }]}>{icon} {item.vehicle_type || 'Vehicle'}</Text>
        <View style={styles.cardBottomRight}>
          {item.fare != null && <Text style={[styles.fareText, { color: text }]}>₹{item.fare}</Text>}
          <Text style={styles.trackLink}>Track ›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSub: { fontSize: 12, marginTop: 2 },
  totalBadge: { borderWidth: 1, borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 48 },
  totalCount: { fontSize: 18, fontWeight: '900' },
  totalLabel: { fontSize: 10, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabBadge: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  scrollContent: { padding: 14, gap: 10, paddingBottom: 40 },
  centerBox: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  errorTitle: { color: '#FF5722', fontSize: 13, fontWeight: '700' },
  errorText: { color: '#FF5722', fontSize: 12, lineHeight: 18 },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  bookingCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehicleIcon: { fontSize: 22 },
  cardMainInfo: { flex: 1 },
  routeText: { fontSize: 14, fontWeight: '700' },
  cardMeta: { fontSize: 11, marginTop: 3 },
  cardSupportMeta: { fontSize: 11, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  vehicleTypeText: { fontSize: 12 },
  cardBottomRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fareText: { fontSize: 16, fontWeight: '800' },
  trackLink: { fontSize: 12, fontWeight: '700', color: '#FF5722' },
});
