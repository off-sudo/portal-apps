import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchActiveBooking, formatBookingDate } from '@/lib/booking-tracking';
import type { BookingSummary } from '@/types/bookings';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  const [dropText, setDropText] = useState('');
  const [activeBooking, setActiveBooking] = useState<BookingSummary | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const isDark = colorScheme === 'dark';

  const fullName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const loadActiveBooking = useCallback(async () => {
    if (!user?.id) {
      setActiveBooking(null);
      setLoadingBooking(false);
      return;
    }

    try {
      const booking = await fetchActiveBooking(user.id);
      setActiveBooking(booking);
    } catch (error) {
      console.error('Home active booking fetch failed:', error);
      setActiveBooking(null);
    } finally {
      setLoadingBooking(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoadingBooking(true);
      loadActiveBooking();
    }, [loadActiveBooking])
  );

  const handleActiveBookingPress = () => {
    if (activeBooking?.id) {
      router.push(`/bookings/${activeBooking.id}` as never);
      return;
    }

    router.push('/(tabs)/bookings' as never);
  };

  const bannerTitle = activeBooking ? 'Active booking' : 'Track bookings';
  const bannerSubtitle = activeBooking
    ? `${activeBooking.pickup_location || 'Pickup'} → ${activeBooking.dropoff_location || 'Drop'} · ${
        activeBooking.eta_minutes != null
          ? `${activeBooking.eta_minutes} min away`
          : `${formatBookingDate(activeBooking.pickup_date)} · ${activeBooking.pickup_time || 'Time TBD'}`
      }`
    : 'Open Bookings to see live status and ETA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: isDark ? '#fff' : '#111' }]}>
              Hi, {fullName} 👋
            </Text>
            <Text style={[styles.subtext, { color: isDark ? '#666' : '#888' }]}>
              Where are you moving today?
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: '#FF5722' }]}>
            <Text style={styles.avatarText}>{fullName[0]?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Location Search Bar */}
        <View style={[styles.searchCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#2a2a2a' : '#e5e5e5' }]}>
          <View style={styles.locRow}>
            <View style={styles.dotGreen} />
            <Text style={[styles.locFixed, { color: isDark ? '#bbb' : '#333' }]}>
              {user?.user_metadata?.city || 'Your location'}
            </Text>
          </View>
          <View style={[styles.locDivider, { backgroundColor: isDark ? '#2a2a2a' : '#eee' }]} />
          <View style={styles.locRow}>
            <View style={styles.dotRed} />
            <TextInput
              style={[styles.locInput, { color: isDark ? '#fff' : '#111' }]}
              placeholder="Where to?"
              placeholderTextColor={isDark ? '#444' : '#bbb'}
              value={dropText}
              onChangeText={setDropText}
            />
          </View>
        </View>

        {/* Service Cards */}
        <Text style={[styles.sectionLabel, { color: isDark ? '#555' : '#aaa' }]}>SERVICES</Text>

        <View style={styles.serviceGrid}>
          <ServiceCard
            icon="🚛"
            title="Portal Service"
            subtitle="Trucks & logistics"
            accent="#FF5722"
            isDark={isDark}
            onPress={() => router.push('/(tabs)/explore')}
          />
          <ServiceCard
            icon="🚕"
            title="Rides"
            subtitle="Cabs near you"
            accent="#1a73e8"
            isDark={isDark}
            onPress={() => router.push('/(tabs)/rides' as never)}
          />
        </View>

        <View style={styles.serviceGrid}>
          <ServiceCard
            icon="🏍"
            title="Bike Taxi"
            subtitle="Quick rides"
            accent="#00C853"
            isDark={isDark}
            onPress={() => router.push('/(tabs)/explore')}
          />
          <ServiceCard
            icon="📦"
            title="Parcel"
            subtitle="Send packages"
            accent="#9C27B0"
            isDark={isDark}
            onPress={() => router.push('/(tabs)/bookings' as never)}
          />
        </View>

        {/* Active Booking Banner */}
        <Pressable
          style={[styles.activeBanner, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: '#FF5722' }]}
          onPress={handleActiveBookingPress}>
          <View style={styles.activeBannerLeft}>
            <View style={styles.liveDot} />
            <View>
              <Text style={[styles.bannerTitle, { color: isDark ? '#fff' : '#111' }]}>{bannerTitle}</Text>
              {loadingBooking ? (
                <View style={styles.bannerLoadingRow}>
                  <ActivityIndicator size="small" color="#FF5722" />
                  <Text style={[styles.bannerSub, { color: isDark ? '#666' : '#888' }]}>Checking latest status…</Text>
                </View>
              ) : (
                <Text style={[styles.bannerSub, { color: isDark ? '#666' : '#888' }]}>{bannerSubtitle}</Text>
              )}
            </View>
          </View>
          <Text style={styles.bannerArrow}>›</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

type ServiceCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  isDark: boolean;
  onPress: () => void;
};

function ServiceCard({ icon, title, subtitle, accent, isDark, onPress }: ServiceCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.serviceCard,
        {
          backgroundColor: isDark ? '#1a1a1a' : '#fff',
          borderColor: isDark ? '#2a2a2a' : '#e5e5e5',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}>
      <View style={[styles.serviceIconBg, { backgroundColor: accent + '18' }]}>
        <Text style={styles.serviceIcon}>{icon}</Text>
      </View>
      <Text style={[styles.serviceTitle, { color: isDark ? '#fff' : '#111' }]}>{title}</Text>
      <Text style={[styles.serviceSub, { color: isDark ? '#555' : '#aaa' }]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  subtext: { fontSize: 13 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  searchCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 0,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00C853' },
  dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5722' },
  locFixed: { fontSize: 14, fontWeight: '600' },
  locInput: { fontSize: 14, flex: 1, fontWeight: '500', padding: 0 },
  locDivider: { height: 1, marginLeft: 19 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  serviceGrid: { flexDirection: 'row', gap: 12 },
  serviceCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  serviceIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  serviceIcon: { fontSize: 22 },
  serviceTitle: { fontSize: 14, fontWeight: '800' },
  serviceSub: { fontSize: 11 },

  activeBanner: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C853' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerSub: { fontSize: 12, marginTop: 2 },
  bannerLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  bannerArrow: { fontSize: 22, color: '#FF5722', fontWeight: '300' },
});
