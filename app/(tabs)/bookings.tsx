// // app/(tabs)/bookings.tsx
// import { useFocusEffect, useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Pressable,
//   RefreshControl,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';

// import { useAuth } from '@/contexts/AuthContext';
// import { useColorScheme } from '@/hooks/use-color-scheme';
// import {
//   DEMO_BOOKINGS,
//   fetchUserBookings,
//   formatBookingDate,
//   getServiceTag,
//   getStatusStyle,
//   getVehicleIcon,
// } from '@/lib/booking-tracking';
// import { supabase } from '@/lib/supabase';
// import type { BookingSummary } from '@/types/bookings';

// type TabKey = 'all' | 'active' | 'scheduled' | 'past';
// type ServiceFilter = 'all' | 'portal' | 'ride';

// function getBookingGroups(bookings: BookingSummary[]) {
//   const today = new Date().toISOString().slice(0, 10);
//   const active: BookingSummary[] = [];
//   const scheduled: BookingSummary[] = [];
//   const past: BookingSummary[] = [];

//   bookings.forEach((booking) => {
//     const status = (booking.status || '').toLowerCase();
//     const isUpcoming = !!booking.pickup_date && booking.pickup_date >= today;
//     const isLive = status === 'in_progress' || booking.tracking_status === 'live';

//     if (status === 'completed' || status === 'cancelled') {
//       past.push(booking);
//       return;
//     }
//     if (isLive) {
//       active.push(booking);
//       return;
//     }
//     if (isUpcoming) {
//       scheduled.push(booking);
//       return;
//     }
//     active.push(booking);
//   });

//   return { active, scheduled, past };
// }

// function getBookingErrorMessage(error: unknown) {
//   if (error instanceof Error && error.message) return error.message;
//   return 'Unable to load bookings right now.';
// }

// export default function BookingsScreen() {
//   const router = useRouter();
//   const { user } = useAuth();
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === 'dark';

//   const [bookings, setBookings] = useState<BookingSummary[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState<TabKey>('all');
//   const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
//   const [error, setError] = useState<string | null>(null);

//   const loadBookings = useCallback(async () => {
//     if (!user?.id) {
//       setBookings(DEMO_BOOKINGS);
//       setLoading(false);
//       return;
//     }
//     setError(null);
//     try {
//       const result = await fetchUserBookings(user.id);
//       setBookings(result);
//     } catch (err) {
//       console.error('Bookings fetch error:', err);
//       setError(getBookingErrorMessage(err));
//       setBookings([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [user?.id]);

//   useFocusEffect(
//     useCallback(() => {
//       setLoading(true);
//       loadBookings();
//     }, [loadBookings])
//   );

//   useEffect(() => {
//     if (!user?.id) return;
//     const channel = supabase
//       .channel(`customer-bookings-${user.id}`)
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => {
//         loadBookings();
//       })
//       .subscribe();
//     return () => { channel.unsubscribe(); };
//   }, [loadBookings, user?.id]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await loadBookings();
//   }, [loadBookings]);

//   // Apply service filter first
//   const filteredByService = useMemo(() => {
//     if (serviceFilter === 'all') return bookings;
//     return bookings.filter((b) => b.service_type === serviceFilter);
//   }, [bookings, serviceFilter]);

//   const groups = useMemo(() => getBookingGroups(filteredByService), [filteredByService]);

//   const tabData: Record<TabKey, BookingSummary[]> = {
//     all: filteredByService,
//     active: groups.active,
//     scheduled: groups.scheduled,
//     past: groups.past,
//   };

//   // Count by service type for filter badges
//   const portalCount = bookings.filter((b) => b.service_type === 'portal' || b.service_type == null).length;
//   const rideCount = bookings.filter((b) => b.service_type === 'ride').length;

//   const bg = isDark ? '#0a0a0a' : '#f5f5f5';
//   const card = isDark ? '#1a1a1a' : '#fff';
//   const border = isDark ? '#2a2a2a' : '#e5e5e5';
//   const text = isDark ? '#fff' : '#111';
//   const muted = isDark ? '#555' : '#aaa';

//   const tabs: { key: TabKey; label: string; count: number }[] = [
//     { key: 'all', label: 'All', count: tabData.all.length },
//     { key: 'active', label: 'Active', count: tabData.active.length },
//     { key: 'scheduled', label: 'Scheduled', count: tabData.scheduled.length },
//     { key: 'past', label: 'Past', count: tabData.past.length },
//   ];

//   const serviceFilters: { key: ServiceFilter; label: string; count: number; color: string }[] = [
//     { key: 'all', label: 'All bookings', count: bookings.length, color: muted },
//     { key: 'portal', label: '🚛 Portal', count: portalCount, color: '#FF5722' },
//     { key: 'ride', label: '🚕 Rides', count: rideCount, color: '#1a73e8' },
//   ];

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
//       {/* Header */}
//       <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
//         <View>
//           <Text style={[styles.headerTitle, { color: text }]}>Bookings</Text>
//           <Text style={[styles.headerSub, { color: muted }]}>All your rides and deliveries in one place.</Text>
//         </View>
//         <View style={[styles.totalBadge, { backgroundColor: card, borderColor: border }]}>
//           <Text style={[styles.totalCount, { color: text }]}>{bookings.length}</Text>
//           <Text style={[styles.totalLabel, { color: muted }]}>total</Text>
//         </View>
//       </View>

//       {/* Service type filter pills */}
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={[styles.filterRow, { backgroundColor: bg, borderBottomColor: border }]}
//         contentContainerStyle={styles.filterContent}>
//         {serviceFilters.map((f) => (
//           <Pressable
//             key={f.key}
//             style={[
//               styles.filterPill,
//               {
//                 backgroundColor: serviceFilter === f.key ? f.color + '18' : card,
//                 borderColor: serviceFilter === f.key ? f.color : border,
//               },
//             ]}
//             onPress={() => setServiceFilter(f.key)}>
//             <Text style={[styles.filterPillText, { color: serviceFilter === f.key ? f.color : muted }]}>
//               {f.label}
//             </Text>
//             {f.count > 0 && (
//               <View style={[styles.filterCount, { backgroundColor: serviceFilter === f.key ? f.color : muted }]}>
//                 <Text style={styles.filterCountText}>{f.count}</Text>
//               </View>
//             )}
//           </Pressable>
//         ))}
//       </ScrollView>

//       {/* Status tabs */}
//       <View style={[styles.tabRow, { backgroundColor: bg, borderBottomColor: border }]}>
//         {tabs.map((tab) => (
//           <Pressable
//             key={tab.key}
//             style={[styles.tab, activeTab === tab.key && [styles.tabActive, { borderBottomColor: '#FF5722' }]]}
//             onPress={() => setActiveTab(tab.key)}>
//             <Text style={[styles.tabText, { color: activeTab === tab.key ? '#FF5722' : muted }]}>
//               {tab.label}
//             </Text>
//             {tab.count > 0 && (
//               <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? '#FF5722' : muted }]}>
//                 <Text style={styles.tabBadgeText}>{tab.count}</Text>
//               </View>
//             )}
//           </Pressable>
//         ))}
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
//         showsVerticalScrollIndicator={false}>
//         {error && (
//           <View style={[styles.errorBox, { borderColor: '#FF572244', backgroundColor: '#FF572210' }]}>
//             <Text style={styles.errorTitle}>Booking sync error</Text>
//             <Text style={styles.errorText}>{error}</Text>
//           </View>
//         )}

//         {loading ? (
//           <View style={styles.centerBox}>
//             <ActivityIndicator size="large" color="#FF5722" />
//           </View>
//         ) : tabData[activeTab].length === 0 ? (
//           <View style={[styles.emptyBox, { borderColor: border }]}>
//             <Text style={styles.emptyIcon}>
//               {activeTab === 'active' ? '🚦' : activeTab === 'scheduled' ? '📅' : activeTab === 'past' ? '🕐' : '📋'}
//             </Text>
//             <Text style={[styles.emptyTitle, { color: text }]}>
//               {activeTab === 'active'
//                 ? 'No active trips'
//                 : activeTab === 'scheduled'
//                 ? 'Nothing scheduled'
//                 : activeTab === 'past'
//                 ? 'No past bookings'
//                 : 'No bookings yet'}
//             </Text>
//             <Text style={[styles.emptyText, { color: muted }]}>
//               {activeTab === 'active'
//                 ? 'In-progress bookings and live trucks will appear here.'
//                 : activeTab === 'scheduled'
//                 ? 'Upcoming confirmed bookings will show here.'
//                 : activeTab === 'past'
//                 ? 'Completed and cancelled bookings will show here.'
//                 : 'Book a ride or a delivery to get started.'}
//             </Text>
//           </View>
//         ) : (
//           tabData[activeTab].map((item) => (
//             <BookingCard
//               key={item.id}
//               item={item}
//               card={card}
//               border={border}
//               text={text}
//               muted={muted}
//               isDark={isDark}
//               onPress={() => router.push(`/bookings/${item.id}` as never)}
//             />
//           ))
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// type BookingCardProps = {
//   item: BookingSummary;
//   card: string;
//   border: string;
//   text: string;
//   muted: string;
//   isDark: boolean;
//   onPress: () => void;
// };

// function BookingCard({ item, card, border, text, muted, isDark, onPress }: BookingCardProps) {
//   const icon = getVehicleIcon(item.vehicle_type);
//   const statusStyle = getStatusStyle(item.status, item.tracking_status);
//   const serviceTag = getServiceTag(item.service_type);

//   const lastUpdate =
//     item.tracking_status === 'live'
//       ? item.eta_minutes != null
//         ? `${item.eta_minutes} min away`
//         : 'Live tracking started'
//       : item.pickup_time
//       ? item.pickup_time.slice(0, 5)
//       : 'Time TBD';

//   return (
//     <Pressable
//       style={({ pressed }) => [
//         styles.bookingCard,
//         { backgroundColor: card, borderColor: border, opacity: pressed ? 0.9 : 1 },
//       ]}
//       onPress={onPress}>
//       {/* Top row */}
//       <View style={styles.cardTopRow}>
//         <View style={[styles.vehicleIconBox, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
//           <Text style={styles.vehicleIcon}>{icon}</Text>
//         </View>
//         <View style={styles.cardMainInfo}>
//           <Text style={[styles.routeText, { color: text }]} numberOfLines={1}>
//             {item.pickup_location || 'Pickup TBD'} → {item.dropoff_location || 'Drop TBD'}
//           </Text>
//           <Text style={[styles.cardMeta, { color: muted }]}>
//             {formatBookingDate(item.pickup_date)} · {lastUpdate}
//           </Text>
//           {(item.driver_name || item.vehicle_label) && (
//             <Text style={[styles.cardSupportMeta, { color: muted }]}>
//               {[item.driver_name, item.vehicle_label].filter(Boolean).join(' · ')}
//             </Text>
//           )}
//         </View>
//         <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
//           <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
//         </View>
//       </View>

//       {/* Bottom row — service tag + fare + track */}
//       <View style={[styles.cardBottomRow, { borderTopColor: isDark ? '#222' : '#f0f0f0' }]}>
//         <View style={styles.cardBottomLeft}>
//           {/* Service type tag */}
//           <View style={[styles.serviceTag, { backgroundColor: serviceTag.bg, borderColor: serviceTag.color + '44' }]}>
//             <Text style={[styles.serviceTagText, { color: serviceTag.color }]}>{serviceTag.label}</Text>
//           </View>
//         </View>
//         <View style={styles.cardBottomRight}>
//           {item.fare != null && <Text style={[styles.fareText, { color: text }]}>₹{item.fare}</Text>}
//           <Text style={styles.trackLink}>Track ›</Text>
//         </View>
//       </View>
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   stickyHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 14,
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//   },
//   headerTitle: { fontSize: 24, fontWeight: '900' },
//   headerSub: { fontSize: 12, marginTop: 2 },
//   totalBadge: { borderWidth: 1, borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 48 },
//   totalCount: { fontSize: 18, fontWeight: '900' },
//   totalLabel: { fontSize: 10, fontWeight: '600' },

//   filterRow: { flexGrow: 0, borderBottomWidth: 1 },
//   filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
//   filterPill: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//     borderWidth: 1,
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 5,
//   },
//   filterPillText: { fontSize: 12, fontWeight: '700' },
//   filterCount: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
//   filterCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },

//   tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
//   tab: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     gap: 5,
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent',
//   },
//   tabActive: { borderBottomWidth: 2 },
//   tabText: { fontSize: 12, fontWeight: '700' },
//   tabBadge: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
//   tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

//   scrollContent: { padding: 14, gap: 10, paddingBottom: 40 },
//   centerBox: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
//   errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
//   errorTitle: { color: '#FF5722', fontSize: 13, fontWeight: '700' },
//   errorText: { color: '#FF5722', fontSize: 12, lineHeight: 18 },
//   emptyBox: {
//     borderWidth: 1,
//     borderRadius: 16,
//     borderStyle: 'dashed',
//     padding: 32,
//     alignItems: 'center',
//     gap: 8,
//     marginTop: 20,
//   },
//   emptyIcon: { fontSize: 36 },
//   emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
//   emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

//   bookingCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
//   cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
//   vehicleIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
//   vehicleIcon: { fontSize: 22 },
//   cardMainInfo: { flex: 1 },
//   routeText: { fontSize: 14, fontWeight: '700' },
//   cardMeta: { fontSize: 11, marginTop: 3 },
//   cardSupportMeta: { fontSize: 11, marginTop: 3 },
//   statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
//   statusText: { fontSize: 10, fontWeight: '800' },

//   cardBottomRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderTopWidth: 1,
//   },
//   cardBottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   serviceTag: {
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 7,
//     paddingVertical: 3,
//   },
//   serviceTagText: { fontSize: 10, fontWeight: '800' },
//   cardBottomRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
//   fareText: { fontSize: 16, fontWeight: '800' },
//   trackLink: { fontSize: 12, fontWeight: '700', color: '#FF5722' },
// });












































// app/(tabs)/bookings.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DEMO_BOOKINGS,
  fetchUserBookings,
  formatBookingDate,
  getServiceTag,
  getStatusStyle,
  getVehicleIcon,
} from '@/lib/booking-tracking';
import { supabase } from '@/lib/supabase';
import type { BookingSummary } from '@/types/bookings';

type TabKey = 'all' | 'active' | 'scheduled' | 'past';
type ServiceFilter = 'all' | 'portal' | 'ride';

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
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => {
        loadBookings();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [loadBookings, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
  }, [loadBookings]);

  const filteredByService = useMemo(() => {
    if (serviceFilter === 'all') return bookings;
    return bookings.filter((b) => b.service_type === serviceFilter);
  }, [bookings, serviceFilter]);

  const groups = useMemo(() => getBookingGroups(filteredByService), [filteredByService]);

  const tabData: Record<TabKey, BookingSummary[]> = {
    all: filteredByService,
    active: groups.active,
    scheduled: groups.scheduled,
    past: groups.past,
  };

  const portalCount = bookings.filter((b) => b.service_type === 'portal' || b.service_type == null).length;
  const rideCount = bookings.filter((b) => b.service_type === 'ride').length;

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const bg          = isDark ? '#0d1117' : '#f0f6ff';
  const card        = isDark ? '#161b27' : '#ffffff';
  const border      = isDark ? '#1e2d4a' : '#dbeafe';
  const text        = isDark ? '#e8f0fe' : '#0d2158';
  const muted       = isDark ? '#5b7ea6' : '#6b8ab8';
  const accentBlue  = '#2563eb';

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: tabData.all.length },
    { key: 'active',    label: 'Active',    count: tabData.active.length },
    { key: 'scheduled', label: 'Scheduled', count: tabData.scheduled.length },
    { key: 'past',      label: 'Past',      count: tabData.past.length },
  ];

  const serviceFilters: { key: ServiceFilter; label: string; count: number; color: string }[] = [
    { key: 'all',    label: 'All bookings', count: bookings.length, color: accentBlue },
    { key: 'portal', label: '🚛 Portal',    count: portalCount,     color: '#1d4ed8' },
    { key: 'ride',   label: '🚕 Rides',     count: rideCount,       color: '#0ea5e9' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Sync status bar tint with theme */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
        translucent={false}
      />

      {/* Sticky header — top padding accounts for Android status bar */}
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: bg,
            borderBottomColor: border,
            paddingTop: Platform.OS === 'android'
              ? (StatusBar.currentHeight ?? 24) + 8
              : 14,
          },
        ]}>
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>Bookings</Text>
          <Text style={[styles.headerSub, { color: muted }]}>All your rides and deliveries in one place.</Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.totalCount, { color: text }]}>{bookings.length}</Text>
          <Text style={[styles.totalLabel, { color: muted }]}>total</Text>
        </View>
      </View>

      {/* Service type filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { backgroundColor: bg, borderBottomColor: border }]}
        contentContainerStyle={styles.filterContent}>
        {serviceFilters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.filterPill,
              {
                backgroundColor: serviceFilter === f.key ? f.color + '18' : card,
                borderColor: serviceFilter === f.key ? f.color : border,
              },
            ]}
            onPress={() => setServiceFilter(f.key)}>
            <Text style={[styles.filterPillText, { color: serviceFilter === f.key ? f.color : muted }]}>
              {f.label}
            </Text>
            {f.count > 0 && (
              <View style={[styles.filterCount, { backgroundColor: serviceFilter === f.key ? f.color : muted }]}>
                <Text style={styles.filterCountText}>{f.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Status tabs */}
      <View style={[styles.tabRow, { backgroundColor: bg, borderBottomColor: border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && [styles.tabActive, { borderBottomColor: accentBlue }]]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabText, { color: activeTab === tab.key ? accentBlue : muted }]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? accentBlue : muted }]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Extra bottom padding so last card clears the nav bar / home indicator
            paddingBottom: Platform.OS === 'android' ? 32 : 48,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentBlue} />
        }
        showsVerticalScrollIndicator={false}>

        {error && (
          <View style={[styles.errorBox, { borderColor: `${accentBlue}44`, backgroundColor: `${accentBlue}10` }]}>
            <Text style={[styles.errorTitle, { color: accentBlue }]}>Booking sync error</Text>
            <Text style={[styles.errorText, { color: accentBlue }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={accentBlue} />
          </View>
        ) : tabData[activeTab].length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: border }]}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'active' ? '🚦' : activeTab === 'scheduled' ? '📅' : activeTab === 'past' ? '🕐' : '📋'}
            </Text>
            <Text style={[styles.emptyTitle, { color: text }]}>
              {activeTab === 'active'
                ? 'No active trips'
                : activeTab === 'scheduled'
                ? 'Nothing scheduled'
                : activeTab === 'past'
                ? 'No past bookings'
                : 'No bookings yet'}
            </Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              {activeTab === 'active'
                ? 'In-progress bookings and live trucks will appear here.'
                : activeTab === 'scheduled'
                ? 'Upcoming confirmed bookings will show here.'
                : activeTab === 'past'
                ? 'Completed and cancelled bookings will show here.'
                : 'Book a ride or a delivery to get started.'}
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
              accentBlue={accentBlue}
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
  accentBlue: string;
  onPress: () => void;
};

function BookingCard({ item, card, border, text, muted, isDark, accentBlue, onPress }: BookingCardProps) {
  const icon = getVehicleIcon(item.vehicle_type);
  const statusStyle = getStatusStyle(item.status, item.tracking_status);
  const serviceTag = getServiceTag(item.service_type);

  // Only show time — no ETA so text never overflows the card
  const lastUpdate = item.pickup_time
    ? item.pickup_time.slice(0, 5)
    : item.tracking_status === 'live'
    ? 'Live'
    : 'Time TBD';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bookingCard,
        { backgroundColor: card, borderColor: border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}>

      {/* Top row */}
      <View style={styles.cardTopRow}>
        <View style={[styles.vehicleIconBox, { backgroundColor: isDark ? '#1e2d4a' : '#eff6ff' }]}>
          <Text style={styles.vehicleIcon}>{icon}</Text>
        </View>

        <View style={styles.cardMainInfo}>
          {/* Route — wraps onto second line if too long */}
          <Text style={[styles.routeText, { color: text }]}>
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

      {/* Bottom row — service tag + fare + track */}
      <View style={[styles.cardBottomRow, { borderTopColor: isDark ? '#1e2d4a' : '#eff6ff' }]}>
        <View style={styles.cardBottomLeft}>
          <View style={[styles.serviceTag, { backgroundColor: serviceTag.bg, borderColor: serviceTag.color + '44' }]}>
            <Text style={[styles.serviceTagText, { color: serviceTag.color }]}>{serviceTag.label}</Text>
          </View>
        </View>
        <View style={styles.cardBottomRight}>
          {item.fare != null && <Text style={[styles.fareText, { color: text }]}>₹{item.fare}</Text>}
          <Text style={[styles.trackLink, { color: accentBlue }]}>Track ›</Text>
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
    paddingBottom: 10,   // top is applied dynamically
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSub: { fontSize: 12, marginTop: 2 },
  totalBadge: { borderWidth: 1, borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 48 },
  totalCount: { fontSize: 18, fontWeight: '900' },
  totalLabel: { fontSize: 10, fontWeight: '600' },

  filterRow: { flexGrow: 0, borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterPillText: { fontSize: 12, fontWeight: '700' },
  filterCount: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
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
  tabText: { fontSize: 12, fontWeight: '700' },
  tabBadge: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  scrollContent: { padding: 14, gap: 10 },
  centerBox: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  errorTitle: { fontSize: 13, fontWeight: '700' },
  errorText: { fontSize: 12, lineHeight: 18 },
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

  bookingCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  vehicleIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vehicleIcon: { fontSize: 22 },
  // flex:1 ensures long route text wraps instead of pushing outside the card
  cardMainInfo: { flex: 1 },
  routeText: { fontSize: 14, fontWeight: '700', flexWrap: 'wrap' },
  cardMeta: { fontSize: 11, marginTop: 3 },
  cardSupportMeta: { fontSize: 11, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  cardBottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  serviceTagText: { fontSize: 10, fontWeight: '800' },
  cardBottomRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fareText: { fontSize: 16, fontWeight: '800' },
  trackLink: { fontSize: 12, fontWeight: '700' },
});