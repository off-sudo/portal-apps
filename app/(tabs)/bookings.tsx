// import React, { useCallback, useMemo, useState } from 'react';
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
// import { useFocusEffect } from 'expo-router';

// import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/lib/supabase';
// import { Colors } from '@/constants/theme';
// import { useColorScheme } from '@/hooks/use-color-scheme';

// type BookingItem = {
//   id: string;
//   pickup_location: string | null;
//   drop_location: string | null;
//   booking_date: string | null;
//   time_slot: string | null;
//   status: string | null;
//   created_at: string | null;
//   vehicle_type?: string | null;
//   fare?: number | null;
// };

// type TabKey = 'active' | 'scheduled' | 'past';

// const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

// function getVehicleIcon(vehicleType?: string | null): string {
//   const v = (vehicleType || '').toLowerCase();
//   if (v.includes('truck') || v.includes('mini')) return '🚛';
//   if (v.includes('pickup')) return '🚚';
//   if (v.includes('large')) return '🏗';
//   if (v.includes('suv') || v.includes('innova')) return '🚙';
//   if (v.includes('auto')) return '🛺';
//   if (v.includes('bike') || v.includes('moto')) return '🏍';
//   return '🚕';
// }

// function getStatusColor(status: string | null): { bg: string; text: string; label: string } {
//   const s = (status || '').toLowerCase();
//   if (s === 'in_progress' || s === 'live') return { bg: '#00C853' + '18', text: '#00C853', label: 'LIVE' };
//   if (s === 'confirmed') return { bg: '#1a73e8' + '15', text: '#1a73e8', label: 'CONFIRMED' };
//   if (s === 'pending') return { bg: '#FFB300' + '18', text: '#FFB300', label: 'PENDING' };
//   if (s === 'completed') return { bg: '#ffffff10', text: '#555', label: 'DONE' };
//   if (s === 'cancelled') return { bg: '#FF5722' + '15', text: '#FF5722', label: 'CANCELLED' };
//   return { bg: '#ffffff10', text: '#555', label: status?.toUpperCase() || 'UNKNOWN' };
// }

// function formatDate(dateStr: string | null): string {
//   if (!dateStr) return 'N/A';
//   const d = new Date(dateStr);
//   const today = new Date();
//   const yesterday = new Date(today);
//   yesterday.setDate(today.getDate() - 1);

//   if (d.toDateString() === today.toDateString()) return 'Today';
//   if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
//   return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
// }

// // Demo data for when no real bookings exist
// const DEMO_BOOKINGS: BookingItem[] = [
//   { id: '1', pickup_location: 'Tambaram', drop_location: 'Velachery', booking_date: new Date().toISOString().slice(0, 10), time_slot: '10:30 AM', status: 'in_progress', created_at: new Date().toISOString(), vehicle_type: 'Mini Truck', fare: 450 },
//   { id: '2', pickup_location: 'Pallavaram', drop_location: 'Ambattur', booking_date: new Date().toISOString().slice(0, 10), time_slot: '2:00 PM', status: 'confirmed', created_at: new Date().toISOString(), vehicle_type: 'SUV Cab', fare: 340 },
//   { id: '3', pickup_location: 'Chromepet', drop_location: 'T. Nagar', booking_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), time_slot: '5:45 PM', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), vehicle_type: 'Sedan', fare: 189 },
//   { id: '4', pickup_location: 'Selaiyur', drop_location: 'Guindy', booking_date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), time_slot: '9:00 AM', status: 'cancelled', created_at: new Date(Date.now() - 172800000).toISOString(), vehicle_type: 'Auto', fare: 80 },
// ];

// export default function BookingsScreen() {
//   const { user } = useAuth();
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === 'dark';

//   const [bookings, setBookings] = useState<BookingItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState<TabKey>('active');
//   const [error, setError] = useState<string | null>(null);

//   const loadBookings = useCallback(async () => {
//     if (!user?.id) {
//       setBookings(DEMO_BOOKINGS);
//       setLoading(false);
//       return;
//     }
//     setError(null);
//     const { data, error: fetchError } = await supabase
//       .from('bookings')
//       .select('id, pickup_location, drop_location, booking_date, time_slot, status, created_at, vehicle_type, fare')
//       .eq('user_id', user.id)
//       .order('booking_date', { ascending: false, nullsFirst: false })
//       .order('created_at', { ascending: false });

//     if (fetchError) { setError(fetchError.message); return; }
//     const result = (data as BookingItem[]) ?? [];
//     setBookings(result.length > 0 ? result : DEMO_BOOKINGS);
//   }, [user?.id]);

//   useFocusEffect(
//     useCallback(() => {
//       let mounted = true;
//       const init = async () => {
//         setLoading(true);
//         await loadBookings();
//         if (mounted) setLoading(false);
//       };
//       init();
//       return () => { mounted = false; };
//     }, [loadBookings])
//   );

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await loadBookings();
//     setRefreshing(false);
//   }, [loadBookings]);

//   const { activeBookings, scheduledBookings, pastBookings } = useMemo(() => {
//     const today = new Date().toISOString().slice(0, 10);
//     const active: BookingItem[] = [];
//     const scheduled: BookingItem[] = [];
//     const past: BookingItem[] = [];

//     bookings.forEach((b) => {
//       const status = (b.status || '').toLowerCase();
//       const isUpcoming = !!b.booking_date && b.booking_date >= today;
//       const isActive = status === 'in_progress' || status === 'live' ||
//         (status === 'confirmed' && !isUpcoming ? false : status === 'confirmed');

//       if (status === 'completed' || status === 'cancelled' || (!isUpcoming && !ACTIVE_STATUSES.includes(status))) {
//         past.push(b);
//       } else if (isActive || status === 'in_progress') {
//         active.push(b);
//       } else {
//         scheduled.push(b);
//       }
//     });

//     return { activeBookings: active, scheduledBookings: scheduled, pastBookings: past };
//   }, [bookings]);

//   const tabData: Record<TabKey, BookingItem[]> = {
//     active: activeBookings,
//     scheduled: scheduledBookings,
//     past: pastBookings,
//   };

//   const bg = isDark ? '#0a0a0a' : '#f5f5f5';
//   const card = isDark ? '#1a1a1a' : '#fff';
//   const border = isDark ? '#2a2a2a' : '#e5e5e5';
//   const text = isDark ? '#fff' : '#111';
//   const muted = isDark ? '#555' : '#aaa';

//   const TABS: { key: TabKey; label: string; count: number }[] = [
//     { key: 'active', label: 'Active', count: activeBookings.length },
//     { key: 'scheduled', label: 'Scheduled', count: scheduledBookings.length },
//     { key: 'past', label: 'Past', count: pastBookings.length },
//   ];

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

//       {/* Sticky Header */}
//       <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
//         <View>
//           <Text style={[styles.headerTitle, { color: text }]}>Bookings</Text>
//           <Text style={[styles.headerSub, { color: muted }]}>Track your rides & deliveries</Text>
//         </View>
//         <View style={[styles.totalBadge, { backgroundColor: card, borderColor: border }]}>
//           <Text style={[styles.totalCount, { color: text }]}>{bookings.length}</Text>
//           <Text style={[styles.totalLabel, { color: muted }]}>total</Text>
//         </View>
//       </View>

//       {/* Tabs */}
//       <View style={[styles.tabRow, { backgroundColor: bg, borderBottomColor: border }]}>
//         {TABS.map((tab) => (
//           <Pressable
//             key={tab.key}
//             style={[
//               styles.tab,
//               activeTab === tab.key && [styles.tabActive, { borderBottomColor: '#FF5722' }],
//             ]}
//             onPress={() => setActiveTab(tab.key)}>
//             <Text style={[
//               styles.tabText,
//               { color: activeTab === tab.key ? '#FF5722' : muted },
//             ]}>
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
//           <View style={[styles.errorBox, { borderColor: '#FF5722' + '44', backgroundColor: '#FF5722' + '10' }]}>
//             <Text style={{ color: '#FF5722', fontSize: 13, fontWeight: '600' }}>{error}</Text>
//           </View>
//         )}

//         {loading ? (
//           <View style={styles.centerBox}>
//             <ActivityIndicator size="large" color="#FF5722" />
//           </View>
//         ) : tabData[activeTab].length === 0 ? (
//           <View style={[styles.emptyBox, { borderColor: border }]}>
//             <Text style={styles.emptyIcon}>
//               {activeTab === 'active' ? '🚦' : activeTab === 'scheduled' ? '📅' : '🕐'}
//             </Text>
//             <Text style={[styles.emptyTitle, { color: text }]}>
//               {activeTab === 'active' ? 'No active trips' : activeTab === 'scheduled' ? 'Nothing scheduled' : 'No past bookings'}
//             </Text>
//             <Text style={[styles.emptyText, { color: muted }]}>
//               {activeTab === 'active'
//                 ? 'Book a ride or truck from the home screen.'
//                 : activeTab === 'scheduled'
//                 ? 'Your upcoming bookings will appear here.'
//                 : 'Completed trips will show up here.'}
//             </Text>
//           </View>
//         ) : (
//           tabData[activeTab].map((item) => (
//             <BookingCard key={item.id} item={item} isDark={isDark} text={text} muted={muted} card={card} border={border} />
//           ))
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// type BookingCardProps = {
//   item: BookingItem;
//   isDark: boolean;
//   text: string;
//   muted: string;
//   card: string;
//   border: string;
// };

// function BookingCard({ item, isDark, text, muted, card, border }: BookingCardProps) {
//   const statusStyle = getStatusColor(item.status);
//   const icon = getVehicleIcon(item.vehicle_type);
//   const [expanded, setExpanded] = useState(false);

//   return (
//     <Pressable
//       style={[styles.bookingCard, { backgroundColor: card, borderColor: border }]}
//       onPress={() => setExpanded((e) => !e)}>

//       {/* Top Row */}
//       <View style={styles.cardTopRow}>
//         <View style={[styles.vehicleIconBox, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
//           <Text style={styles.vehicleIcon}>{icon}</Text>
//         </View>
//         <View style={styles.cardMainInfo}>
//           <Text style={[styles.routeText, { color: text }]} numberOfLines={1}>
//             {item.pickup_location || 'Pickup TBD'} → {item.drop_location || 'Drop TBD'}
//           </Text>
//           <Text style={[styles.cardMeta, { color: muted }]}>
//             {formatDate(item.booking_date)} · {item.time_slot || 'N/A'}
//           </Text>
//         </View>
//         <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
//           <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
//         </View>
//       </View>

//       {/* Bottom Row */}
//       <View style={[styles.cardBottomRow, { borderTopColor: isDark ? '#222' : '#f0f0f0' }]}>
//         <View style={styles.cardBottomLeft}>
//           <Text style={[styles.vehicleTypeText, { color: muted }]}>{icon} {item.vehicle_type || 'Vehicle'}</Text>
//         </View>
//         {item.fare && (
//           <Text style={[styles.fareText, { color: text }]}>₹{item.fare}</Text>
//         )}
//       </View>

//       {/* Expanded Detail */}
//       {expanded && (
//         <View style={[styles.expandedRow, { borderTopColor: isDark ? '#222' : '#f0f0f0' }]}>
//           <DetailPill label="Date" value={item.booking_date || 'N/A'} muted={muted} text={text} />
//           <DetailPill label="Slot" value={item.time_slot || 'N/A'} muted={muted} text={text} />
//           <DetailPill label="Status" value={item.status || 'unknown'} muted={muted} text={text} />
//         </View>
//       )}
//     </Pressable>
//   );
// }

// function DetailPill({ label, value, muted, text }: { label: string; value: string; muted: string; text: string }) {
//   return (
//     <View style={styles.detailPill}>
//       <Text style={[styles.detailLabel, { color: muted }]}>{label}</Text>
//       <Text style={[styles.detailValue, { color: text }]}>{value}</Text>
//     </View>
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

//   tabRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//   },
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
//   tabText: { fontSize: 13, fontWeight: '700' },
//   tabBadge: { borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
//   tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

//   scrollContent: { padding: 14, gap: 10, paddingBottom: 40 },

//   centerBox: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
//   errorBox: { borderWidth: 1, borderRadius: 12, padding: 12 },
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

//   bookingCard: {
//     borderWidth: 1,
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   cardTopRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     padding: 12,
//   },
//   vehicleIconBox: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     flexShrink: 0,
//   },
//   vehicleIcon: { fontSize: 22 },
//   cardMainInfo: { flex: 1 },
//   routeText: { fontSize: 14, fontWeight: '700' },
//   cardMeta: { fontSize: 11, marginTop: 3 },
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
//   cardBottomLeft: { flex: 1 },
//   vehicleTypeText: { fontSize: 12 },
//   fareText: { fontSize: 16, fontWeight: '800' },

//   expandedRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     gap: 10,
//     borderTopWidth: 1,
//   },
//   detailPill: { flex: 1, gap: 2 },
//   detailLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
//   detailValue: { fontSize: 12, fontWeight: '600' },
// });