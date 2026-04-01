// // app/(tabs)/rides.tsx
// import * as Location from 'expo-location';
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Animated,
//   Platform,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from 'react-native';
// import type { Region } from 'react-native-maps';

// import { useAuth } from '@/contexts/AuthContext';
// import { useColorScheme } from '@/hooks/use-color-scheme';
// import { supabase } from '@/lib/supabase';

// // ─── Types ────────────────────────────────────────────────────────────────────
// type RideType = 'mini' | 'sedan' | 'suv' | 'auto';

// type CabDriver = {
//   id: string;
//   name: string;
//   vehicle: string;
//   plate: string;
//   rating: number;
//   etaMin: number;
//   fare: number;
//   type: RideType;
//   icon: string;
//   phone: string;
// };

// type RideOption = {
//   id: RideType;
//   label: string;
//   icon: string;
//   desc: string;
//   baseFare: number;
//   tag?: string;
// };

// type Coordinate = {
//   latitude: number;
//   longitude: number;
// };

// // ─── Constants ────────────────────────────────────────────────────────────────
// const RIDE_OPTIONS: RideOption[] = [
//   { id: 'auto', label: 'Auto', icon: '🛺', desc: '1-3 seats', baseFare: 80, tag: 'FASTEST' },
//   { id: 'mini', label: 'Mini', icon: '🚗', desc: '4 seats', baseFare: 150 },
//   { id: 'sedan', label: 'Sedan', icon: '🚕', desc: '4 seats · AC', baseFare: 189, tag: 'POPULAR' },
//   { id: 'suv', label: 'SUV', icon: '🚙', desc: '6 seats · AC', baseFare: 340 },
// ];

// const MOCK_DRIVERS: CabDriver[] = [
//   { id: 'd1', name: 'Rajan K.', vehicle: 'Swift Dzire', plate: 'TN09 AX 4421', rating: 4.8, etaMin: 3, fare: 189, type: 'sedan', icon: '🚕', phone: '+91 90000 11111' },
//   { id: 'd2', name: 'Priya S.', vehicle: 'Toyota Innova', plate: 'TN22 BK 7733', rating: 4.9, etaMin: 6, fare: 340, type: 'suv', icon: '🚙', phone: '+91 90000 22222' },
//   { id: 'd3', name: 'Murugan R.', vehicle: 'Maruti Baleno', plate: 'TN01 ZX 1190', rating: 4.6, etaMin: 9, fare: 150, type: 'mini', icon: '🚗', phone: '+91 90000 33333' },
//   { id: 'd4', name: 'Kavya M.', vehicle: 'Bajaj RE', plate: 'TN05 KK 3382', rating: 4.7, etaMin: 2, fare: 80, type: 'auto', icon: '🛺', phone: '+91 90000 44444' },
// ];

// // Dummy offsets so cab markers appear around user's real location
// const CAB_OFFSETS: Record<RideType, { lat: number; lng: number }[]> = {
//   auto:  [{ lat: 0.005, lng: 0.003 }, { lat: -0.004, lng: 0.006 }],
//   mini:  [{ lat: 0.008, lng: -0.005 }, { lat: -0.006, lng: -0.007 }],
//   sedan: [{ lat: 0.010, lng: 0.008 }, { lat: -0.009, lng: 0.004 }],
//   suv:   [{ lat: 0.007, lng: -0.010 }, { lat: 0.003, lng: 0.012 }],
// };

// const DEFAULT_REGION: Region = {
//   latitude: 13.0827,
//   longitude: 80.2707,
//   latitudeDelta: 0.08,
//   longitudeDelta: 0.08,
// };

// // ─── Native maps (web-safe) ───────────────────────────────────────────────────
// // eslint-disable-next-line @typescript-eslint/no-require-imports
// const nativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
// const NativeMapView = nativeMaps?.default as React.ComponentType<any> | undefined;
// const NativeMarker = nativeMaps?.Marker as React.ComponentType<any> | undefined;
// const NativePolyline = nativeMaps?.Polyline as React.ComponentType<any> | undefined;

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// function buildDropFallback(origin: Coordinate, dropText: string): Coordinate {
//   const hash = Array.from(dropText).reduce((acc, c) => acc + c.charCodeAt(0), 0);
//   return {
//     latitude: origin.latitude + ((hash % 10) + 3) * 0.002,
//     longitude: origin.longitude + (((hash >> 1) % 10) - 5) * 0.0025,
//   };
// }

// function buildRegion(points: Coordinate[]): Region {
//   if (points.length === 0) return DEFAULT_REGION;
//   const lats = points.map((p) => p.latitude);
//   const lngs = points.map((p) => p.longitude);
//   const minLat = Math.min(...lats), maxLat = Math.max(...lats);
//   const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
//   return {
//     latitude: (minLat + maxLat) / 2,
//     longitude: (minLng + maxLng) / 2,
//     latitudeDelta: Math.max(maxLat - minLat + 0.04, 0.04),
//     longitudeDelta: Math.max(maxLng - minLng + 0.04, 0.04),
//   };
// }

// function formatAddress(parts: Location.LocationGeocodedAddress[] | null, fallback: Coordinate | null): string {
//   const first = parts?.[0];
//   if (!first) {
//     if (!fallback) return 'Locating…';
//     return `${fallback.latitude.toFixed(4)}, ${fallback.longitude.toFixed(4)}`;
//   }
//   return [first.name, first.district, first.city].filter(Boolean).join(', ');
// }

// // ─── Screen ───────────────────────────────────────────────────────────────────
// export default function RidesScreen() {
//   const colorScheme = useColorScheme();
//   const isDark = colorScheme === 'dark';
//   const { user } = useAuth();

//   // Location state
//   const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
//   const [pickupLabel, setPickupLabel] = useState('Locating your device…');
//   const [locationLoading, setLocationLoading] = useState(true);
//   const [locationError, setLocationError] = useState<string | null>(null);

//   // Drop state
//   const [drop, setDrop] = useState('');
//   const [dropCoordinate, setDropCoordinate] = useState<Coordinate | null>(null);
//   const [dropResolving, setDropResolving] = useState(false);

//   // Booking state
//   const [selectedType, setSelectedType] = useState<RideType>('sedan');
//   const [booking, setBooking] = useState(false);
//   const [bookingSuccess, setBookingSuccess] = useState<{ driverName: string; fare: number } | null>(null);

//   const sheetAnim = useRef(new Animated.Value(0)).current;

//   const rideOption = RIDE_OPTIONS.find((r) => r.id === selectedType)!;
//   const nearestDriver = MOCK_DRIVERS.find((d) => d.type === selectedType);

//   // ── Location ────────────────────────────────────────────────────────────────
//   const loadLocation = useCallback(async () => {
//     setLocationLoading(true);
//     try {
//       const perm = await Location.requestForegroundPermissionsAsync();
//       if (perm.status !== 'granted') {
//         setLocationError('Location permission denied. Enable it in Settings to see nearby cabs.');
//         setPickupLabel('Permission denied');
//         return;
//       }
//       const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//       const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
//       setCurrentLocation(coords);
//       try {
//         const geo = await Location.reverseGeocodeAsync(coords);
//         setPickupLabel(formatAddress(geo, coords));
//       } catch {
//         setPickupLabel(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
//       }
//       setLocationError(null);
//     } catch (err) {
//       console.error('Location error:', err);
//       setLocationError('Unable to fetch device location.');
//       setPickupLabel('Location unavailable');
//     } finally {
//       setLocationLoading(false);
//     }
//   }, []);

//   useEffect(() => { loadLocation(); }, [loadLocation]);

//   // ── Bottom sheet animation ──────────────────────────────────────────────────
//   useEffect(() => {
//     const ready = drop.trim().length > 3 && !!currentLocation;
//     Animated.timing(sheetAnim, {
//       toValue: ready ? 1 : 0,
//       duration: 280,
//       useNativeDriver: true,
//     }).start();
//   }, [drop, currentLocation, sheetAnim]);

//   // ── Drop geocoding ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!currentLocation || drop.trim().length < 3) {
//       setDropCoordinate(null);
//       return;
//     }
//     let cancelled = false;
//     setDropResolving(true);
//     const timer = setTimeout(async () => {
//       try {
//         const results = await Location.geocodeAsync(drop.trim());
//         if (cancelled) return;
//         if (results.length > 0) {
//           setDropCoordinate({ latitude: results[0].latitude, longitude: results[0].longitude });
//         } else {
//           setDropCoordinate(buildDropFallback(currentLocation, drop.trim()));
//         }
//       } catch {
//         if (!cancelled) setDropCoordinate(buildDropFallback(currentLocation, drop.trim()));
//       } finally {
//         if (!cancelled) setDropResolving(false);
//       }
//     }, 500);
//     return () => { cancelled = true; clearTimeout(timer); };
//   }, [currentLocation, drop]);

//   // ── Cab dots around real location ───────────────────────────────────────────
//   const cabMarkers = useMemo(() => {
//     if (!currentLocation) return [];
//     return MOCK_DRIVERS.map((driver) => {
//       const offsets = CAB_OFFSETS[driver.type];
//       const offset = offsets[MOCK_DRIVERS.indexOf(driver) % offsets.length];
//       return {
//         ...driver,
//         coordinate: {
//           latitude: currentLocation.latitude + offset.lat,
//           longitude: currentLocation.longitude + offset.lng,
//         },
//       };
//     });
//   }, [currentLocation]);

//   const mapPoints = useMemo(() => {
//     const pts: Coordinate[] = [];
//     if (currentLocation) pts.push(currentLocation);
//     if (dropCoordinate) pts.push(dropCoordinate);
//     cabMarkers.forEach((c) => pts.push(c.coordinate));
//     return pts;
//   }, [currentLocation, dropCoordinate, cabMarkers]);

//   const routePoints = useMemo(
//     () => [currentLocation, dropCoordinate].filter(Boolean) as Coordinate[],
//     [currentLocation, dropCoordinate]
//   );

//   const mapRegion = useMemo(() => buildRegion(mapPoints.length ? mapPoints : [currentLocation ?? DEFAULT_REGION as unknown as Coordinate]), [mapPoints, currentLocation]);

//   // ── BOOKING HANDLER ─────────────────────────────────────────────────────────
//   const handleConfirmRide = useCallback(async () => {
//     if (!user?.id) {
//       Alert.alert('Not signed in', 'Please sign in to book a ride.');
//       return;
//     }
//     if (!currentLocation) {
//       Alert.alert('Location required', 'Enable location access to book a ride.');
//       return;
//     }
//     if (!drop.trim()) {
//       Alert.alert('Destination required', 'Please enter where you want to go.');
//       return;
//     }

//     setBooking(true);

//     const driver = nearestDriver ?? MOCK_DRIVERS[0];
//     const resolvedDrop = dropCoordinate ?? buildDropFallback(currentLocation, drop.trim());
//     const now = new Date();
//     const pickupDate = now.toISOString().slice(0, 10);
//     const pickupMin = (now.getMinutes() + 10) % 60;
//     const pickupTime = `${String(now.getHours()).padStart(2, '0')}:${String(pickupMin).padStart(2, '0')}:00`;

//     const newBooking = {
//       user_id: user.id,
//       vehicle_type: `${rideOption.label} (${driver.vehicle})`,
//       pickup_location: pickupLabel,
//       dropoff_location: drop.trim(),
//       pickup_date: pickupDate,
//       pickup_time: pickupTime,
//       status: 'confirmed',
//       fare: rideOption.baseFare,
//       driver_name: driver.name,
//       driver_phone: driver.phone,
//       vehicle_label: driver.plate,
//       tracking_status: 'not_started',
//       eta_minutes: driver.etaMin,
//       pickup_lat: currentLocation.latitude,
//       pickup_lng: currentLocation.longitude,
//       drop_lat: resolvedDrop.latitude,
//       drop_lng: resolvedDrop.longitude,
//       service_type: 'ride', // ← tags this as a Ride booking
//     };

//     try {
//       const { error } = await supabase.from('bookings').insert(newBooking);
//       if (error) {
//         console.error('Ride booking error:', error);
//         Alert.alert('Booking failed', error.message || 'Something went wrong. Please try again.');
//         return;
//       }
//       setBookingSuccess({ driverName: driver.name, fare: rideOption.baseFare });
//       setDrop('');
//       setDropCoordinate(null);
//       setTimeout(() => setBookingSuccess(null), 4000);
//     } catch (err) {
//       console.error('Unexpected error:', err);
//       Alert.alert('Booking failed', 'An unexpected error occurred.');
//     } finally {
//       setBooking(false);
//     }
//   }, [user?.id, currentLocation, drop, dropCoordinate, rideOption, nearestDriver, pickupLabel]);

//   // ─── Theme ──────────────────────────────────────────────────────────────────
//   const bg = isDark ? '#0a0a0a' : '#f5f5f5';
//   const card = isDark ? '#1a1a1a' : '#fff';
//   const border = isDark ? '#2a2a2a' : '#e5e5e5';
//   const text = isDark ? '#fff' : '#111';
//   const muted = isDark ? '#555' : '#aaa';

//   return (
//     <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
//       {/* ── Header ── */}
//       <View style={[styles.stickyHeader, { backgroundColor: bg, borderBottomColor: border }]}>
//         <Text style={[styles.headerTitle, { color: text }]}>Rides</Text>
//         <View style={[styles.onlineBadge, { backgroundColor: '#1a73e818' }]}>
//           <View style={[styles.liveDot, { backgroundColor: '#1a73e8' }]} />
//           <Text style={[styles.onlineText, { color: '#1a73e8' }]}>{MOCK_DRIVERS.length} cabs live</Text>
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
//         {/* ── Success banner ── */}
//         {bookingSuccess && (
//           <View style={styles.successBanner}>
//             <Text style={styles.successIcon}>✅</Text>
//             <View>
//               <Text style={styles.successTitle}>Ride confirmed!</Text>
//               <Text style={styles.successSub}>
//                 {bookingSuccess.driverName} · ₹{bookingSuccess.fare} · Check your Bookings tab.
//               </Text>
//             </View>
//           </View>
//         )}

//         {/* ── Map ── */}
//         <View style={[styles.mapCard, { backgroundColor: card, borderColor: border }]}>
//           <View style={styles.mapHeader}>
//             <View>
//               <Text style={[styles.mapTitle, { color: text }]}>Nearby cabs</Text>
//               <Text style={[styles.mapSub, { color: muted }]}>
//                 {locationLoading
//                   ? 'Getting your location…'
//                   : dropResolving
//                   ? 'Resolving destination…'
//                   : currentLocation
//                   ? 'Live cabs around your location'
//                   : 'Enable location to see cabs'}
//               </Text>
//             </View>
//             {locationLoading && <ActivityIndicator size="small" color="#1a73e8" />}
//           </View>

//           {NativeMapView && NativeMarker ? (
//             <View style={styles.mapShell}>
//               <NativeMapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
//                 {/* User pin */}
//                 {currentLocation && (
//                   <NativeMarker coordinate={currentLocation} title="You are here" description={pickupLabel} pinColor="#00C853" />
//                 )}
//                 {/* Drop pin */}
//                 {dropCoordinate && (
//                   <NativeMarker coordinate={dropCoordinate} title="Destination" description={drop.trim()} pinColor="#FF5722" />
//                 )}
//                 {/* Cab markers — highlight selected type */}
//                 {cabMarkers.map((cab) => (
//                   <NativeMarker
//                     key={cab.id}
//                     coordinate={cab.coordinate}
//                     title={cab.name}
//                     description={`${cab.vehicle} · ${cab.etaMin} min`}>
//                     <View style={[
//                       styles.cabMarker,
//                       { backgroundColor: cab.type === selectedType ? '#1a73e8' : isDark ? '#333' : '#fff',
//                         borderColor: cab.type === selectedType ? '#1a73e8' : border },
//                     ]}>
//                       <Text style={{ fontSize: cab.type === selectedType ? 16 : 13 }}>{cab.icon}</Text>
//                     </View>
//                   </NativeMarker>
//                 ))}
//                 {/* Route line */}
//                 {NativePolyline && routePoints.length === 2 && (
//                   <NativePolyline coordinates={routePoints} strokeColor="#1a73e8" strokeWidth={3} lineDashPattern={[8, 6]} />
//                 )}
//               </NativeMapView>
//             </View>
//           ) : (
//             // Web fallback — simulated cab dots
//             <View style={[styles.mapFallback, { backgroundColor: isDark ? '#111' : '#e8f0fe', borderColor: border }]}>
//               <View style={styles.mapOverlay}>
//                 {[
//                   { top: '20%', left: '30%', icon: '🚕', color: '#1a73e8' },
//                   { top: '55%', left: '60%', icon: '🚙', color: '#FF5722' },
//                   { top: '70%', left: '22%', icon: '🛺', color: '#00C853' },
//                   { top: '35%', left: '65%', icon: '🚗', color: '#9c27b0' },
//                 ].map((dot, i) => (
//                   <View key={i} style={[styles.webCabDot, { top: dot.top as any, left: dot.left as any, backgroundColor: dot.color }]}>
//                     <Text style={{ fontSize: 9 }}>{dot.icon}</Text>
//                   </View>
//                 ))}
//                 <View style={[styles.youPin, { top: '42%', left: '46%' }]}>
//                   <Text style={styles.youPinText}>YOU</Text>
//                 </View>
//               </View>
//               <Text style={[styles.mapHint, { color: muted }]}>Live map with real location on mobile</Text>
//             </View>
//           )}

//           {locationError && (
//             <View style={[styles.mapNotice, { borderColor: '#FF572244', backgroundColor: '#FF572210' }]}>
//               <Text style={styles.noticeTitle}>Location status</Text>
//               <Text style={styles.noticeText}>{locationError}</Text>
//             </View>
//           )}
//         </View>

//         {/* ── Location inputs ── */}
//         <View style={[styles.locCard, { backgroundColor: card, borderColor: border }]}>
//           <View style={styles.locRow}>
//             <View style={styles.dotGreen} />
//             <View style={{ flex: 1 }}>
//               <Text style={[styles.locFixed, { color: text }]} numberOfLines={1}>{pickupLabel}</Text>
//               <Text style={[styles.locHint, { color: muted }]}>
//                 {currentLocation ? 'Your current location' : 'Waiting for GPS…'}
//               </Text>
//             </View>
//           </View>
//           <View style={[styles.locDivider, { backgroundColor: border }]} />
//           <View style={styles.locRow}>
//             <View style={styles.dotRed} />
//             <TextInput
//               style={[styles.locInput, { color: text }]}
//               placeholder="Where to?"
//               placeholderTextColor={muted}
//               value={drop}
//               onChangeText={setDrop}
//               returnKeyType="search"
//             />
//             {drop.length > 0 && (
//               <Pressable onPress={() => setDrop('')}>
//                 <Text style={{ color: muted, fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
//               </Pressable>
//             )}
//           </View>
//         </View>

//         {/* ── Ride type selector ── */}
//         <Text style={[styles.sectionLabel, { color: muted }]}>RIDE TYPE</Text>
//         <View style={styles.rideTypeRow}>
//           {RIDE_OPTIONS.map((opt) => (
//             <Pressable
//               key={opt.id}
//               style={[
//                 styles.rideTypeCard,
//                 {
//                   backgroundColor: selectedType === opt.id ? '#1a73e812' : card,
//                   borderColor: selectedType === opt.id ? '#1a73e8' : border,
//                 },
//               ]}
//               onPress={() => setSelectedType(opt.id)}>
//               {opt.tag && (
//                 <View style={styles.rideTag}>
//                   <Text style={styles.rideTagText}>{opt.tag}</Text>
//                 </View>
//               )}
//               <Text style={styles.rideTypeIcon}>{opt.icon}</Text>
//               <Text style={[styles.rideTypeLabel, { color: text }]}>{opt.label}</Text>
//               <Text style={[styles.rideTypeDesc, { color: muted }]}>{opt.desc}</Text>
//               <Text style={[styles.rideTypeFare, { color: '#1a73e8' }]}>₹{opt.baseFare}</Text>
//             </Pressable>
//           ))}
//         </View>

//         {/* ── Nearby drivers ── */}
//         <Text style={[styles.sectionLabel, { color: muted }]}>NEARBY CABS</Text>
//         {MOCK_DRIVERS.map((driver, idx) => (
//           <Pressable
//             key={driver.id}
//             style={[
//               styles.driverCard,
//               {
//                 backgroundColor: card,
//                 borderColor: driver.type === selectedType && idx === MOCK_DRIVERS.findIndex(d => d.type === selectedType) ? '#1a73e8' : border,
//                 borderWidth: driver.type === selectedType && idx === MOCK_DRIVERS.findIndex(d => d.type === selectedType) ? 1.5 : 1,
//               },
//             ]}
//             onPress={() => setSelectedType(driver.type)}>
//             <View style={[styles.driverAvatar, {
//               backgroundColor: driver.type === selectedType ? '#1a73e815' : isDark ? '#222' : '#f0f0f0',
//             }]}>
//               <Text style={{ fontSize: 20 }}>{driver.icon}</Text>
//             </View>
//             <View style={styles.driverInfo}>
//               <Text style={[styles.driverName, { color: text }]}>{driver.name}</Text>
//               <Text style={[styles.driverMeta, { color: muted }]}>{driver.vehicle} · {driver.plate}</Text>
//               <View style={styles.driverRatingRow}>
//                 <Text style={styles.starIcon}>★</Text>
//                 <Text style={[styles.driverRating, { color: text }]}>{driver.rating}</Text>
//               </View>
//             </View>
//             <View style={styles.driverRight}>
//               <View style={[styles.etaBadge, { backgroundColor: '#1a73e815', borderColor: '#1a73e844' }]}>
//                 <Text style={[styles.etaText, { color: '#1a73e8' }]}>{driver.etaMin} min</Text>
//               </View>
//               <Text style={[styles.driverFare, { color: text }]}>₹{driver.fare}</Text>
//             </View>
//           </Pressable>
//         ))}

//         <View style={{ height: 120 }} />
//       </ScrollView>

//       {/* ── Bottom sheet ── */}
//       <Animated.View
//         style={[
//           styles.bottomSheet,
//           {
//             backgroundColor: isDark ? '#111' : '#fff',
//             borderTopColor: border,
//             opacity: sheetAnim,
//             transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
//           },
//         ]}>
//         <View style={styles.sheetHandle} />
//         {nearestDriver ? (
//           <View style={[styles.readyBanner, { borderColor: '#00C85355', backgroundColor: '#00C85310' }]}>
//             <View style={[styles.liveDot, { backgroundColor: '#00C853' }]} />
//             <View style={{ flex: 1 }}>
//               <Text style={styles.readyText}>Ride is ready!</Text>
//               <Text style={[styles.readySub, { color: muted }]}>
//                 {nearestDriver.name} · {nearestDriver.vehicle} · {nearestDriver.etaMin} min away
//               </Text>
//             </View>
//             <Text style={[styles.readyFare, { color: text }]}>₹{rideOption.baseFare}</Text>
//           </View>
//         ) : null}
//         {/* ── ACTUAL BOOKING BUTTON ── */}
//         <Pressable
//           style={({ pressed }) => [
//             styles.confirmBtn,
//             { backgroundColor: '#1a73e8', opacity: pressed || booking ? 0.75 : 1 },
//           ]}
//           onPress={handleConfirmRide}
//           disabled={booking}>
//           {booking ? (
//             <ActivityIndicator color="#fff" size="small" />
//           ) : (
//             <Text style={styles.confirmText}>
//               Book {rideOption.label} · ₹{rideOption.baseFare}
//             </Text>
//           )}
//         </Pressable>
//       </Animated.View>
//     </SafeAreaView>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   stickyHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//   },
//   headerTitle: { fontSize: 22, fontWeight: '900' },
//   onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
//   liveDot: { width: 7, height: 7, borderRadius: 4 },
//   onlineText: { fontSize: 11, fontWeight: '700' },

//   scrollContent: { padding: 16, gap: 12 },

//   successBanner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     backgroundColor: '#00C85318',
//     borderWidth: 1,
//     borderColor: '#00C85355',
//     borderRadius: 14,
//     padding: 14,
//   },
//   successIcon: { fontSize: 24 },
//   successTitle: { fontSize: 14, fontWeight: '800', color: '#00C853' },
//   successSub: { fontSize: 12, color: '#00C853', marginTop: 2, opacity: 0.8 },

//   mapCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
//   mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   mapTitle: { fontSize: 15, fontWeight: '700' },
//   mapSub: { fontSize: 12 },
//   mapShell: { overflow: 'hidden', borderRadius: 14, height: 240 },
//   map: { width: '100%', height: '100%' },
//   cabMarker: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//   },
//   mapFallback: {
//     borderWidth: 1,
//     borderRadius: 14,
//     height: 200,
//     overflow: 'hidden',
//     position: 'relative',
//     alignItems: 'center',
//     justifyContent: 'flex-end',
//     paddingBottom: 10,
//   },
//   mapOverlay: { position: 'absolute', inset: 0 } as any,
//   webCabDot: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
//   youPin: { position: 'absolute', backgroundColor: '#FF5722', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
//   youPinText: { color: '#fff', fontSize: 8, fontWeight: '900' },
//   mapHint: { fontSize: 11, zIndex: 1 },
//   mapNotice: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
//   noticeTitle: { color: '#FF5722', fontWeight: '700', fontSize: 12 },
//   noticeText: { color: '#FF5722', fontSize: 12, lineHeight: 18 },

//   locCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
//   locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
//   dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00C853', flexShrink: 0 },
//   dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF5722', flexShrink: 0 },
//   locFixed: { fontSize: 14, fontWeight: '600' },
//   locHint: { fontSize: 11, marginTop: 2 },
//   locInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
//   locDivider: { height: 1, marginLeft: 19 },

//   sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: -4 },

//   rideTypeRow: { flexDirection: 'row', gap: 8 },
//   rideTypeCard: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2, position: 'relative' },
//   rideTag: { position: 'absolute', top: 5, right: 5, backgroundColor: '#1a73e8', borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
//   rideTagText: { color: '#fff', fontSize: 7, fontWeight: '800' },
//   rideTypeIcon: { fontSize: 22, marginTop: 6 },
//   rideTypeLabel: { fontSize: 11, fontWeight: '800' },
//   rideTypeDesc: { fontSize: 9, textAlign: 'center' },
//   rideTypeFare: { fontSize: 12, fontWeight: '800', marginTop: 2 },

//   driverCard: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
//   driverAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
//   driverInfo: { flex: 1 },
//   driverName: { fontSize: 14, fontWeight: '700' },
//   driverMeta: { fontSize: 11, marginTop: 1 },
//   driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
//   starIcon: { fontSize: 11, color: '#FFB300' },
//   driverRating: { fontSize: 11, fontWeight: '700' },
//   driverRight: { alignItems: 'flex-end', gap: 6 },
//   etaBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
//   etaText: { fontSize: 11, fontWeight: '700' },
//   driverFare: { fontSize: 14, fontWeight: '800' },

//   bottomSheet: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     borderTopWidth: 1,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 16,
//     paddingBottom: 28,
//     gap: 10,
//   },
//   sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 4 },
//   readyBanner: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
//   readyText: { fontSize: 13, color: '#00C853', fontWeight: '700' },
//   readySub: { fontSize: 11, marginTop: 1 },
//   readyFare: { fontSize: 18, fontWeight: '900' },
//   confirmBtn: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
//   confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
// });






























// app/(tabs)/rides.tsx
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Region } from 'react-native-maps';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
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
  phone: string;
};

type RideOption = {
  id: RideType;
  label: string;
  icon: string;
  desc: string;
  baseFare: number;
  tag?: string;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const RIDE_OPTIONS: RideOption[] = [
  { id: 'auto',  label: 'Auto',  icon: '🛺', desc: '1-3 seats',     baseFare: 80,  tag: 'FASTEST' },
  { id: 'mini',  label: 'Mini',  icon: '🚗', desc: '4 seats',        baseFare: 150 },
  { id: 'sedan', label: 'Sedan', icon: '🚕', desc: '4 seats · AC',   baseFare: 189, tag: 'POPULAR' },
  { id: 'suv',   label: 'SUV',   icon: '🚙', desc: '6 seats · AC',   baseFare: 340 },
];

const MOCK_DRIVERS: CabDriver[] = [
  { id: 'd1', name: 'Rajan K.',   vehicle: 'Swift Dzire',   plate: 'TN09 AX 4421', rating: 4.8, etaMin: 3, fare: 189, type: 'sedan', icon: '🚕', phone: '+91 90000 11111' },
  { id: 'd2', name: 'Priya S.',   vehicle: 'Toyota Innova', plate: 'TN22 BK 7733', rating: 4.9, etaMin: 6, fare: 340, type: 'suv',   icon: '🚙', phone: '+91 90000 22222' },
  { id: 'd3', name: 'Murugan R.', vehicle: 'Maruti Baleno', plate: 'TN01 ZX 1190', rating: 4.6, etaMin: 9, fare: 150, type: 'mini',  icon: '🚗', phone: '+91 90000 33333' },
  { id: 'd4', name: 'Kavya M.',   vehicle: 'Bajaj RE',      plate: 'TN05 KK 3382', rating: 4.7, etaMin: 2, fare: 80,  type: 'auto',  icon: '🛺', phone: '+91 90000 44444' },
];

const CAB_OFFSETS: Record<RideType, { lat: number; lng: number }[]> = {
  auto:  [{ lat: 0.005, lng: 0.003 },  { lat: -0.004, lng: 0.006 }],
  mini:  [{ lat: 0.008, lng: -0.005 }, { lat: -0.006, lng: -0.007 }],
  sedan: [{ lat: 0.010, lng: 0.008 },  { lat: -0.009, lng: 0.004 }],
  suv:   [{ lat: 0.007, lng: -0.010 }, { lat: 0.003, lng: 0.012 }],
};

const DEFAULT_REGION: Region = {
  latitude: 13.0827,
  longitude: 80.2707,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// ─── Native maps (web-safe) ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativeMaps = Platform.OS === 'web' ? null : require('react-native-maps');
const NativeMapView  = nativeMaps?.default   as React.ComponentType<any> | undefined;
const NativeMarker   = nativeMaps?.Marker    as React.ComponentType<any> | undefined;
const NativePolyline = nativeMaps?.Polyline  as React.ComponentType<any> | undefined;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDropFallback(origin: Coordinate, dropText: string): Coordinate {
  const hash = Array.from(dropText).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    latitude:  origin.latitude  + ((hash % 10) + 3) * 0.002,
    longitude: origin.longitude + (((hash >> 1) % 10) - 5) * 0.0025,
  };
}

function buildRegion(points: Coordinate[]): Region {
  if (points.length === 0) return DEFAULT_REGION;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude:      (minLat + maxLat) / 2,
    longitude:     (minLng + maxLng) / 2,
    latitudeDelta:  Math.max(maxLat - minLat + 0.04, 0.04),
    longitudeDelta: Math.max(maxLng - minLng + 0.04, 0.04),
  };
}

function formatAddress(parts: Location.LocationGeocodedAddress[] | null, fallback: Coordinate | null): string {
  const first = parts?.[0];
  if (!first) {
    if (!fallback) return 'Locating…';
    return `${fallback.latitude.toFixed(4)}, ${fallback.longitude.toFixed(4)}`;
  }
  return [first.name, first.district, first.city].filter(Boolean).join(', ');
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RidesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [currentLocation, setCurrentLocation]   = useState<Coordinate | null>(null);
  const [pickupLabel, setPickupLabel]             = useState('Locating your device…');
  const [locationLoading, setLocationLoading]     = useState(true);
  const [locationError, setLocationError]         = useState<string | null>(null);
  const [drop, setDrop]                           = useState('');
  const [dropCoordinate, setDropCoordinate]       = useState<Coordinate | null>(null);
  const [dropResolving, setDropResolving]         = useState(false);
  const [selectedType, setSelectedType]           = useState<RideType>('sedan');
  const [booking, setBooking]                     = useState(false);
  const [bookingSuccess, setBookingSuccess]       = useState<{ driverName: string; fare: number } | null>(null);

  const sheetAnim = useRef(new Animated.Value(0)).current;

  const rideOption    = RIDE_OPTIONS.find((r) => r.id === selectedType)!;
  const nearestDriver = MOCK_DRIVERS.find((d) => d.type === selectedType);

  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const bg         = isDark ? '#0d1117' : '#f0f6ff';
  const card       = isDark ? '#161b27' : '#ffffff';
  const border     = isDark ? '#1e2d4a' : '#dbeafe';
  const text       = isDark ? '#e8f0fe' : '#0d2158';
  const muted      = isDark ? '#5b7ea6' : '#6b8ab8';
  const accentBlue = '#2563eb';

  // ── Location ────────────────────────────────────────────────────────────────
  const loadLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings to see nearby cabs.');
        setPickupLabel('Permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCurrentLocation(coords);
      try {
        const geo = await Location.reverseGeocodeAsync(coords);
        setPickupLabel(formatAddress(geo, coords));
      } catch {
        setPickupLabel(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      }
      setLocationError(null);
    } catch (err) {
      console.error('Location error:', err);
      setLocationError('Unable to fetch device location.');
      setPickupLabel('Location unavailable');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => { loadLocation(); }, [loadLocation]);

  // ── Bottom sheet animation ──────────────────────────────────────────────────
  useEffect(() => {
    const ready = drop.trim().length > 3 && !!currentLocation;
    Animated.timing(sheetAnim, {
      toValue: ready ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [drop, currentLocation, sheetAnim]);

  // ── Drop geocoding ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentLocation || drop.trim().length < 3) {
      setDropCoordinate(null);
      return;
    }
    let cancelled = false;
    setDropResolving(true);
    const timer = setTimeout(async () => {
      try {
        const results = await Location.geocodeAsync(drop.trim());
        if (cancelled) return;
        if (results.length > 0) {
          setDropCoordinate({ latitude: results[0].latitude, longitude: results[0].longitude });
        } else {
          setDropCoordinate(buildDropFallback(currentLocation, drop.trim()));
        }
      } catch {
        if (!cancelled) setDropCoordinate(buildDropFallback(currentLocation, drop.trim()));
      } finally {
        if (!cancelled) setDropResolving(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentLocation, drop]);

  // ── Cab markers around real location ───────────────────────────────────────
  const cabMarkers = useMemo(() => {
    if (!currentLocation) return [];
    return MOCK_DRIVERS.map((driver) => {
      const offsets = CAB_OFFSETS[driver.type];
      const offset  = offsets[MOCK_DRIVERS.indexOf(driver) % offsets.length];
      return {
        ...driver,
        coordinate: {
          latitude:  currentLocation.latitude  + offset.lat,
          longitude: currentLocation.longitude + offset.lng,
        },
      };
    });
  }, [currentLocation]);

  const mapPoints = useMemo(() => {
    const pts: Coordinate[] = [];
    if (currentLocation) pts.push(currentLocation);
    if (dropCoordinate)  pts.push(dropCoordinate);
    cabMarkers.forEach((c) => pts.push(c.coordinate));
    return pts;
  }, [currentLocation, dropCoordinate, cabMarkers]);

  const routePoints = useMemo(
    () => [currentLocation, dropCoordinate].filter(Boolean) as Coordinate[],
    [currentLocation, dropCoordinate]
  );

  const mapRegion = useMemo(
    () => buildRegion(mapPoints.length ? mapPoints : [currentLocation ?? DEFAULT_REGION as unknown as Coordinate]),
    [mapPoints, currentLocation]
  );

  // ── Booking handler ─────────────────────────────────────────────────────────
  const handleConfirmRide = useCallback(async () => {
    if (!user?.id) { Alert.alert('Not signed in', 'Please sign in to book a ride.'); return; }
    if (!currentLocation) { Alert.alert('Location required', 'Enable location access to book a ride.'); return; }
    if (!drop.trim()) { Alert.alert('Destination required', 'Please enter where you want to go.'); return; }

    setBooking(true);

    const driver        = nearestDriver ?? MOCK_DRIVERS[0];
    const resolvedDrop  = dropCoordinate ?? buildDropFallback(currentLocation, drop.trim());
    const now           = new Date();
    const pickupDate    = now.toISOString().slice(0, 10);
    const pickupMin     = (now.getMinutes() + 10) % 60;
    const pickupTime    = `${String(now.getHours()).padStart(2, '0')}:${String(pickupMin).padStart(2, '0')}:00`;

    const newBooking = {
      user_id:          user.id,
      vehicle_type:     `${rideOption.label} (${driver.vehicle})`,
      pickup_location:  pickupLabel,
      dropoff_location: drop.trim(),
      pickup_date:      pickupDate,
      pickup_time:      pickupTime,
      status:           'confirmed',
      fare:             rideOption.baseFare,
      driver_name:      driver.name,
      driver_phone:     driver.phone,
      vehicle_label:    driver.plate,
      tracking_status:  'not_started',
      eta_minutes:      driver.etaMin,
      pickup_lat:       currentLocation.latitude,
      pickup_lng:       currentLocation.longitude,
      drop_lat:         resolvedDrop.latitude,
      drop_lng:         resolvedDrop.longitude,
      service_type:     'ride',
    };

    try {
      const { error } = await supabase.from('bookings').insert(newBooking);
      if (error) {
        Alert.alert('Booking failed', error.message || 'Something went wrong. Please try again.');
        return;
      }
      setBookingSuccess({ driverName: driver.name, fare: rideOption.baseFare });
      setDrop('');
      setDropCoordinate(null);
      setTimeout(() => setBookingSuccess(null), 4000);
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Booking failed', 'An unexpected error occurred.');
    } finally {
      setBooking(false);
    }
  }, [user?.id, currentLocation, drop, dropCoordinate, rideOption, nearestDriver, pickupLabel]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Sync status bar tint with theme */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
        translucent={false}
      />

      {/* Sticky header — top padding clears Android status bar */}
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: bg,
            borderBottomColor: border,
            paddingTop: Platform.OS === 'android'
              ? (StatusBar.currentHeight ?? 24) + 8
              : 12,
          },
        ]}>
        <Text style={[styles.headerTitle, { color: text }]}>Rides</Text>
        <View style={[styles.onlineBadge, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
          <View style={[styles.liveDot, { backgroundColor: '#22c55e' }]} />
          <Text style={[styles.onlineText, { color: accentBlue }]}>{MOCK_DRIVERS.length} cabs live</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // bottom room for the booking sheet + nav bar
            paddingBottom: Platform.OS === 'android' ? 148 : 164,
          },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        {bookingSuccess && (
          <View style={[styles.successBanner, { borderColor: '#22c55e55', backgroundColor: '#22c55e10' }]}>
            <Text style={styles.successIcon}>✅</Text>
            <View>
              <Text style={[styles.successTitle, { color: '#22c55e' }]}>Ride confirmed!</Text>
              <Text style={[styles.successSub, { color: '#22c55e' }]}>
                {bookingSuccess.driverName} · ₹{bookingSuccess.fare} · Check your Bookings tab.
              </Text>
            </View>
          </View>
        )}

        {/* Map card */}
        <View style={[styles.mapCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={[styles.mapTitle, { color: text }]}>Nearby cabs</Text>
              <Text style={[styles.mapSub, { color: muted }]}>
                {locationLoading
                  ? 'Getting your location…'
                  : dropResolving
                  ? 'Resolving destination…'
                  : currentLocation
                  ? 'Live cabs around your location'
                  : 'Enable location to see cabs'}
              </Text>
            </View>
            {locationLoading && <ActivityIndicator size="small" color={accentBlue} />}
          </View>

          {NativeMapView && NativeMarker ? (
            <View style={styles.mapShell}>
              <NativeMapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
                {currentLocation && (
                  <NativeMarker coordinate={currentLocation} title="You are here" description={pickupLabel} pinColor="#22c55e" />
                )}
                {dropCoordinate && (
                  <NativeMarker coordinate={dropCoordinate} title="Destination" description={drop.trim()} pinColor={accentBlue} />
                )}
                {cabMarkers.map((cab) => (
                  <NativeMarker
                    key={cab.id}
                    coordinate={cab.coordinate}
                    title={cab.name}
                    description={`${cab.vehicle} · ${cab.etaMin} min`}>
                    <View style={[
                      styles.cabMarker,
                      {
                        backgroundColor: cab.type === selectedType ? accentBlue : card,
                        borderColor:     cab.type === selectedType ? accentBlue : border,
                      },
                    ]}>
                      <Text style={{ fontSize: cab.type === selectedType ? 16 : 13 }}>{cab.icon}</Text>
                    </View>
                  </NativeMarker>
                ))}
                {NativePolyline && routePoints.length === 2 && (
                  <NativePolyline coordinates={routePoints} strokeColor={accentBlue} strokeWidth={3} lineDashPattern={[8, 6]} />
                )}
              </NativeMapView>
            </View>
          ) : (
            // Web fallback
            <View style={[styles.mapFallback, { backgroundColor: isDark ? '#1e2d4a' : '#dbeafe', borderColor: border }]}>
              <View style={styles.mapOverlay}>
                {[
                  { top: '20%', left: '30%', icon: '🚕', color: accentBlue },
                  { top: '55%', left: '60%', icon: '🚙', color: '#1d4ed8' },
                  { top: '70%', left: '22%', icon: '🛺', color: '#0ea5e9' },
                  { top: '35%', left: '65%', icon: '🚗', color: '#3b82f6' },
                ].map((dot, i) => (
                  <View key={i} style={[styles.webCabDot, { top: dot.top as any, left: dot.left as any, backgroundColor: dot.color }]}>
                    <Text style={{ fontSize: 9 }}>{dot.icon}</Text>
                  </View>
                ))}
                <View style={[styles.youPin, { top: '42%', left: '46%', backgroundColor: accentBlue }]}>
                  <Text style={styles.youPinText}>YOU</Text>
                </View>
              </View>
              <Text style={[styles.mapHint, { color: muted }]}>Live map with real location on mobile</Text>
            </View>
          )}

          {locationError && (
            <View style={[styles.mapNotice, { borderColor: `${accentBlue}44`, backgroundColor: `${accentBlue}10` }]}>
              <Text style={[styles.noticeTitle, { color: accentBlue }]}>Location status</Text>
              <Text style={[styles.noticeText, { color: accentBlue }]}>{locationError}</Text>
            </View>
          )}
        </View>

        {/* Location inputs */}
        <View style={[styles.locCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.locRow}>
            <View style={styles.dotGreen} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locFixed, { color: text }]} numberOfLines={1}>{pickupLabel}</Text>
              <Text style={[styles.locHint, { color: muted }]}>
                {currentLocation ? 'Your current location' : 'Waiting for GPS…'}
              </Text>
            </View>
          </View>
          <View style={[styles.locDivider, { backgroundColor: border }]} />
          <View style={styles.locRow}>
            <View style={styles.dotBlue} />
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

        {/* Ride type selector */}
        <Text style={[styles.sectionLabel, { color: muted }]}>RIDE TYPE</Text>
        <View style={styles.rideTypeRow}>
          {RIDE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.rideTypeCard,
                {
                  backgroundColor: selectedType === opt.id ? `${accentBlue}12` : card,
                  borderColor:     selectedType === opt.id ? accentBlue : border,
                },
              ]}
              onPress={() => setSelectedType(opt.id)}>
              {opt.tag && (
                <View style={[styles.rideTag, { backgroundColor: accentBlue }]}>
                  <Text style={styles.rideTagText}>{opt.tag}</Text>
                </View>
              )}
              <Text style={styles.rideTypeIcon}>{opt.icon}</Text>
              <Text style={[styles.rideTypeLabel, { color: text }]}>{opt.label}</Text>
              <Text style={[styles.rideTypeDesc,  { color: muted }]}>{opt.desc}</Text>
              <Text style={[styles.rideTypeFare,  { color: accentBlue }]}>₹{opt.baseFare}</Text>
            </Pressable>
          ))}
        </View>

        {/* Nearby drivers */}
        <Text style={[styles.sectionLabel, { color: muted }]}>NEARBY CABS</Text>
        {MOCK_DRIVERS.map((driver, idx) => {
          const isSelected = driver.type === selectedType && idx === MOCK_DRIVERS.findIndex((d) => d.type === selectedType);
          return (
            <Pressable
              key={driver.id}
              style={[
                styles.driverCard,
                {
                  backgroundColor: card,
                  borderColor:  isSelected ? accentBlue : border,
                  borderWidth:  isSelected ? 1.5 : 1,
                },
              ]}
              onPress={() => setSelectedType(driver.type)}>
              <View style={[styles.driverAvatar, {
                backgroundColor: isSelected
                  ? `${accentBlue}15`
                  : isDark ? '#1e2d4a' : '#eff6ff',
              }]}>
                <Text style={{ fontSize: 20 }}>{driver.icon}</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { color: text }]}>{driver.name}</Text>
                <Text style={[styles.driverMeta, { color: muted }]}>{driver.vehicle} · {driver.plate}</Text>
                <View style={styles.driverRatingRow}>
                  <Text style={styles.starIcon}>★</Text>
                  <Text style={[styles.driverRating, { color: text }]}>{driver.rating}</Text>
                </View>
              </View>
              <View style={styles.driverRight}>
                <View style={[styles.etaBadge, { backgroundColor: `${accentBlue}15`, borderColor: `${accentBlue}44` }]}>
                  <Text style={[styles.etaText, { color: accentBlue }]}>{driver.etaMin} min</Text>
                </View>
                <Text style={[styles.driverFare, { color: text }]}>₹{driver.fare}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: isDark ? '#161b27' : '#ffffff',
            borderTopColor: border,
            // Extra bottom padding for home indicator / Android nav bar
            paddingBottom: Platform.OS === 'android' ? 24 : 36,
            opacity: sheetAnim,
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          },
        ]}>
        <View style={[styles.sheetHandle, { backgroundColor: border }]} />
        {nearestDriver && (
          <View style={[styles.readyBanner, { borderColor: '#22c55e55', backgroundColor: '#22c55e10' }]}>
            <View style={[styles.liveDot, { backgroundColor: '#22c55e' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.readyText, { color: '#22c55e' }]}>Ride is ready!</Text>
              <Text style={[styles.readySub, { color: muted }]}>
                {nearestDriver.name} · {nearestDriver.vehicle} · {nearestDriver.etaMin} min away
              </Text>
            </View>
            <Text style={[styles.readyFare, { color: text }]}>₹{rideOption.baseFare}</Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: accentBlue, opacity: pressed || booking ? 0.75 : 1 },
          ]}
          onPress={handleConfirmRide}
          disabled={booking}>
          {booking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmText}>Book {rideOption.label} · ₹{rideOption.baseFare}</Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,   // top is applied dynamically
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, fontWeight: '700' },

  // top padding set dynamically; horizontal fixed
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },

  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  successIcon: { fontSize: 24 },
  successTitle: { fontSize: 14, fontWeight: '800' },
  successSub: { fontSize: 12, marginTop: 2, opacity: 0.85 },

  mapCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapTitle: { fontSize: 15, fontWeight: '700' },
  mapSub: { fontSize: 12 },
  mapShell: { overflow: 'hidden', borderRadius: 14, height: 240 },
  map: { width: '100%', height: '100%' },
  cabMarker: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  mapFallback: { borderWidth: 1, borderRadius: 14, height: 200, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  mapOverlay: { position: 'absolute', inset: 0 } as any,
  webCabDot: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  youPin: { position: 'absolute', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  youPinText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  mapHint: { fontSize: 11, zIndex: 1 },
  mapNotice: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  noticeTitle: { fontWeight: '700', fontSize: 12 },
  noticeText: { fontSize: 12, lineHeight: 18 },

  locCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e', flexShrink: 0 },
  dotBlue:  { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2563eb', flexShrink: 0 },
  locFixed: { fontSize: 14, fontWeight: '600' },
  locHint: { fontSize: 11, marginTop: 2 },
  locInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  locDivider: { height: 1, marginLeft: 19 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: -4 },

  rideTypeRow: { flexDirection: 'row', gap: 8 },
  rideTypeCard: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2, position: 'relative' },
  rideTag: { position: 'absolute', top: 5, right: 5, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  rideTagText: { color: '#fff', fontSize: 7, fontWeight: '800' },
  rideTypeIcon: { fontSize: 22, marginTop: 6 },
  rideTypeLabel: { fontSize: 11, fontWeight: '800' },
  rideTypeDesc: { fontSize: 9, textAlign: 'center' },
  rideTypeFare: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  driverCard: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 14, fontWeight: '700' },
  driverMeta: { fontSize: 11, marginTop: 1 },
  driverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  starIcon: { fontSize: 11, color: '#f59e0b' },
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
    gap: 10,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  readyBanner: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyText: { fontSize: 13, fontWeight: '700' },
  readySub: { fontSize: 11, marginTop: 1 },
  readyFare: { fontSize: 18, fontWeight: '900' },
  confirmBtn: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});