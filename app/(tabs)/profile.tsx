import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileData = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type BookingItem = {
  id: string;
  pickup_location: string | null;
  drop_location: string | null;
  booking_date: string | null;
  time_slot: string | null;
  status: string | null;
  created_at: string | null;
  vehicle_type?: string | null;
  fare?: number | null;
};

type TabKey = 'active' | 'past';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

const DEMO_BOOKINGS: BookingItem[] = [
  { id: '1', pickup_location: 'Tambaram', drop_location: 'Velachery', booking_date: new Date().toISOString().slice(0, 10), time_slot: '10:30 AM', status: 'in_progress', created_at: new Date().toISOString(), vehicle_type: 'Mini Truck', fare: 450 },
  { id: '2', pickup_location: 'Pallavaram', drop_location: 'Ambattur', booking_date: new Date().toISOString().slice(0, 10), time_slot: '2:00 PM', status: 'confirmed', created_at: new Date().toISOString(), vehicle_type: 'SUV Cab', fare: 340 },
  { id: '3', pickup_location: 'Chromepet', drop_location: 'T. Nagar', booking_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), time_slot: '5:45 PM', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), vehicle_type: 'Sedan', fare: 189 },
  { id: '4', pickup_location: 'Selaiyur', drop_location: 'Guindy', booking_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), time_slot: '9:00 AM', status: 'cancelled', created_at: new Date(Date.now() - 172800000).toISOString(), vehicle_type: 'Auto', fare: 80 },
];

function getVehicleIcon(vehicleType?: string | null): string {
  const v = (vehicleType || '').toLowerCase();
  if (v.includes('truck') || v.includes('mini')) return '🚛';
  if (v.includes('pickup')) return '🚚';
  if (v.includes('large')) return '🏗';
  if (v.includes('suv') || v.includes('innova')) return '🚙';
  if (v.includes('auto')) return '🛺';
  if (v.includes('bike') || v.includes('moto')) return '🏍';
  return '🚕';
}

function getStatusStyle(status: string | null): { bg: string; color: string; label: string } {
  const s = (status || '').toLowerCase();
  if (s === 'in_progress') return { bg: '#00C853' + '18', color: '#00C853', label: 'LIVE' };
  if (s === 'confirmed')   return { bg: '#1a73e8' + '15', color: '#1a73e8', label: 'CONFIRMED' };
  if (s === 'pending')     return { bg: '#FFB300' + '18', color: '#FFB300', label: 'PENDING' };
  if (s === 'completed')   return { bg: '#ffffff10',       color: '#555',    label: 'DONE' };
  if (s === 'cancelled')   return { bg: '#FF5722' + '15', color: '#FF5722', label: 'CANCELLED' };
  return { bg: '#ffffff10', color: '#555', label: (status || 'unknown').toUpperCase() };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProfileScreen() {
  const { user, signOut, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingTab, setBookingTab] = useState<TabKey>('active');

  const bg     = isDark ? '#0a0a0a' : '#f5f5f5';
  const card   = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text   = isDark ? '#fff'    : '#111';
  const muted  = isDark ? '#555'    : '#aaa';

  // ── Load profile ──────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!user?.id) { setProfile(null); setProfileLoading(false); return; }
    const fallback: ProfileData = {
      full_name: user.user_metadata?.full_name ?? null,
      phone:     user.user_metadata?.phone     ?? null,
      email:     user.email                    ?? null,
    };
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user.id)
      .maybeSingle();
    setProfile({
      full_name: data?.full_name ?? fallback.full_name,
      phone:     data?.phone     ?? fallback.phone,
      email:     data?.email     ?? fallback.email,
    });
    setProfileLoading(false);
  }, [user]);

  // ── Load bookings ─────────────────────────────────────────────
  const loadBookings = useCallback(async () => {
    if (!user?.id) { setBookings(DEMO_BOOKINGS); setBookingsLoading(false); return; }
    const { data } = await supabase
      .from('bookings')
      .select('id, pickup_location, drop_location, booking_date, time_slot, status, created_at, vehicle_type, fare')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    const result = (data as BookingItem[]) ?? [];
    setBookings(result.length > 0 ? result : DEMO_BOOKINGS);
    setBookingsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      Promise.all([loadProfile(), loadBookings()]).finally(() => {
        if (mounted) { setProfileLoading(false); setBookingsLoading(false); }
      });
      return () => { mounted = false; };
    }, [loadProfile, loadBookings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadBookings()]);
    setRefreshing(false);
  }, [loadProfile, loadBookings]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try { await signOut(); }
          catch (err) {
            Alert.alert('Logout Error', err instanceof Error ? err.message : 'Failed to logout');
          }
        },
      },
    ]);
  };

  // ── Split bookings ─────────────────────────────────────────────
  const { activeBookings, pastBookings } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active: BookingItem[] = [];
    const past: BookingItem[]   = [];
    bookings.forEach((b) => {
      const s = (b.status || '').toLowerCase();
      const upcoming = !!b.booking_date && b.booking_date >= today;
      if (s === 'completed' || s === 'cancelled' || (!upcoming && !ACTIVE_STATUSES.includes(s))) {
        past.push(b);
      } else {
        active.push(b);
      }
    });
    return { activeBookings: active, pastBookings: past };
  }, [bookings]);

  const displayedBookings = bookingTab === 'active' ? activeBookings : pastBookings;

  const initials = (profile?.full_name || user?.user_metadata?.full_name || 'U')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
        showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name ── */}
        <View style={styles.profileHero}>
          <View style={[styles.avatar, { backgroundColor: '#FF5722' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {profileLoading ? (
            <ActivityIndicator size="small" color="#FF5722" style={{ marginTop: 8 }} />
          ) : (
            <>
              <Text style={[styles.heroName, { color: text }]}>
                {profile?.full_name || 'Your Name'}
              </Text>
              <Text style={[styles.heroEmail, { color: muted }]}>
                {profile?.email || user?.email || ''}
              </Text>
            </>
          )}
        </View>

        {/* ── Info Card ── */}
        {!profileLoading && (
          <View style={[styles.infoCard, { backgroundColor: card, borderColor: border }]}>
            <InfoRow label="Name"  value={profile?.full_name || 'Not set'}                   muted={muted} text={text} border={border} last={false} />
            <InfoRow label="Email" value={profile?.email || user?.email || 'Not available'}  muted={muted} text={text} border={border} last={false} />
            <InfoRow label="Phone" value={profile?.phone || 'Not set'}                        muted={muted} text={text} border={border} last />
          </View>
        )}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatCard label="Total trips" value={bookings.length} bg={card} border={border} text={text} muted={muted} />
          <StatCard label="Active"      value={activeBookings.length} bg={card} border={border} text={text} muted={muted} accent="#00C853" />
          <StatCard
            label="Spent"
            value={'₹' + bookings.reduce((s, b) => s + (b.fare ?? 0), 0)}
            bg={card} border={border} text={text} muted={muted}
          />
        </View>

        {/* ── Bookings Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: text }]}>My Bookings</Text>
        </View>

        {/* Booking Tabs */}
        <View style={[styles.bookingTabRow, { backgroundColor: card, borderColor: border }]}>
          {(['active', 'past'] as TabKey[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.bookingTab,
                bookingTab === tab && [styles.bookingTabActive, { borderBottomColor: '#FF5722' }],
              ]}
              onPress={() => setBookingTab(tab)}>
              <Text style={[styles.bookingTabText, { color: bookingTab === tab ? '#FF5722' : muted }]}>
                {tab === 'active' ? 'Active' : 'Past'}
              </Text>
              <View style={[
                styles.tabCountBadge,
                { backgroundColor: bookingTab === tab ? '#FF5722' : muted },
              ]}>
                <Text style={styles.tabCountText}>
                  {tab === 'active' ? activeBookings.length : pastBookings.length}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Booking List */}
        {bookingsLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        ) : displayedBookings.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: border }]}>
            <Text style={styles.emptyIcon}>{bookingTab === 'active' ? '🚦' : '🕐'}</Text>
            <Text style={[styles.emptyTitle, { color: text }]}>
              {bookingTab === 'active' ? 'No active trips' : 'No past bookings'}
            </Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              {bookingTab === 'active'
                ? 'Book a ride or truck from the home screen.'
                : 'Your completed trips will show here.'}
            </Text>
          </View>
        ) : (
          displayedBookings.map((item) => (
            <BookingCard
              key={item.id}
              item={item}
              card={card}
              border={border}
              text={text}
              muted={muted}
              isDark={isDark}
            />
          ))
        )}

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { opacity: pressed || authLoading ? 0.8 : 1 },
          ]}
          onPress={handleLogout}
          disabled={authLoading}>
          <Text style={styles.logoutText}>
            {authLoading ? 'Logging out…' : 'Logout'}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  label, value, muted, text, border, last,
}: { label: string; value: string; muted: string; text: string; border: string; last: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: border }]}>
      <Text style={[styles.infoLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: text }]}>{value}</Text>
    </View>
  );
}

function StatCard({
  label, value, bg, border, text, muted, accent,
}: { label: string; value: string | number; bg: string; border: string; text: string; muted: string; accent?: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.statValue, { color: accent ?? text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

function BookingCard({
  item, card, border, text, muted, isDark,
}: { item: BookingItem; card: string; border: string; text: string; muted: string; isDark: boolean }) {
  const st = getStatusStyle(item.status);
  const icon = getVehicleIcon(item.vehicle_type);

  return (
    <View style={[styles.bookingCard, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.vehicleBox, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={styles.cardMid}>
          <Text style={[styles.routeText, { color: text }]} numberOfLines={1}>
            {item.pickup_location || 'Pickup'} → {item.drop_location || 'Drop'}
          </Text>
          <Text style={[styles.cardMeta, { color: muted }]}>
            {formatDate(item.booking_date)} · {item.time_slot || 'N/A'} · {item.vehicle_type || 'Vehicle'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      {item.fare != null && (
        <View style={[styles.cardFareRow, { borderTopColor: isDark ? '#222' : '#f0f0f0' }]}>
          <Text style={[styles.cardFareLabel, { color: muted }]}>Fare</Text>
          <Text style={[styles.cardFareValue, { color: text }]}>₹{item.fare}</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 14 },

  profileHero: { alignItems: 'center', paddingVertical: 8, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroName: { fontSize: 22, fontWeight: '900' },
  heroEmail: { fontSize: 13 },

  infoCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  infoRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 3 },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoValue: { fontSize: 15, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },

  bookingTabRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  bookingTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  bookingTabActive: { borderBottomWidth: 2 },
  bookingTabText: { fontSize: 13, fontWeight: '700' },
  tabCountBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  loaderBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 28, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  bookingCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  vehicleBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardMid: { flex: 1 },
  routeText: { fontSize: 14, fontWeight: '700' },
  cardMeta: { fontSize: 11, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardFareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  cardFareLabel: { fontSize: 11, fontWeight: '600' },
  cardFareValue: { fontSize: 16, fontWeight: '900' },

  logoutButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c43f2f',
    marginTop: 6,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});