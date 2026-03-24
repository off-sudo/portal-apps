import { supabase } from '@/lib/supabase';
import type {
  ActiveBookingTracking,
  BookingLocationPoint,
  BookingSummary,
  BookingTrackingStatus,
} from '@/types/bookings';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress'] as const;
const TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled'] as const;

const BOOKING_SELECT = `
  id,
  user_id,
  pickup_location,
  dropoff_location,
  pickup_date,
  pickup_time,
  status,
  created_at,
  vehicle_type,
  fare,
  driver_name,
  driver_phone,
  vehicle_label,
  tracking_status,
  eta_minutes,
  pickup_lat,
  pickup_lng,
  drop_lat,
  drop_lng
`;

const BOOKING_LOCATION_SELECT = `
  id,
  booking_id,
  lat,
  lng,
  heading,
  speed_kmh,
  source,
  created_at
`;

type RawRow = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asTrackingStatus(value: unknown): BookingTrackingStatus | null {
  if (value === 'not_started' || value === 'live' || value === 'paused' || value === 'completed') {
    return value;
  }

  return null;
}

export function normalizeBooking(row: RawRow): BookingSummary {
  return {
    id: asString(row.id) ?? '',
    user_id: asString(row.user_id),
    pickup_location: asString(row.pickup_location),
    dropoff_location: asString(row.dropoff_location),
    pickup_date: asString(row.pickup_date),
    pickup_time: asString(row.pickup_time),
    status: asString(row.status),
    created_at: asString(row.created_at),
    vehicle_type: asString(row.vehicle_type),
    fare: asNumber(row.fare),
    driver_name: asString(row.driver_name),
    driver_phone: asString(row.driver_phone),
    vehicle_label: asString(row.vehicle_label),
    tracking_status: asTrackingStatus(row.tracking_status),
    eta_minutes: asNumber(row.eta_minutes),
    pickup_lat: asNumber(row.pickup_lat),
    pickup_lng: asNumber(row.pickup_lng),
    drop_lat: asNumber(row.drop_lat),
    drop_lng: asNumber(row.drop_lng),
  };
}

export function normalizeLocation(row: RawRow): BookingLocationPoint {
  return {
    id: asString(row.id) ?? '',
    booking_id: asString(row.booking_id) ?? '',
    lat: asNumber(row.lat) ?? 0,
    lng: asNumber(row.lng) ?? 0,
    heading: asNumber(row.heading),
    speed_kmh: asNumber(row.speed_kmh),
    source: asString(row.source) ?? 'dummy',
    created_at: asString(row.created_at) ?? new Date().toISOString(),
  };
}

export function getVehicleIcon(vehicleType?: string | null): string {
  const value = (vehicleType || '').toLowerCase();

  if (value.includes('truck') || value.includes('mini')) return '🚛';
  if (value.includes('pickup')) return '🚚';
  if (value.includes('large')) return '🏗';
  if (value.includes('suv') || value.includes('innova')) return '🚙';
  if (value.includes('auto')) return '🛺';
  if (value.includes('bike') || value.includes('moto')) return '🏍';
  return '🚕';
}

export function getStatusStyle(
  status: string | null,
  trackingStatus?: BookingTrackingStatus | null
): { bg: string; color: string; label: string } {
  const normalizedStatus = (status || '').toLowerCase();

  if (normalizedStatus === 'in_progress' || trackingStatus === 'live') {
    return { bg: '#00C85318', color: '#00C853', label: 'LIVE' };
  }

  if (normalizedStatus === 'confirmed') {
    return { bg: '#1a73e815', color: '#1a73e8', label: 'CONFIRMED' };
  }

  if (normalizedStatus === 'pending') {
    return { bg: '#FFB30018', color: '#FFB300', label: 'PENDING' };
  }

  if (normalizedStatus === 'completed') {
    return { bg: '#ffffff10', color: '#666', label: 'DONE' };
  }

  if (normalizedStatus === 'cancelled') {
    return { bg: '#FF572215', color: '#FF5722', label: 'CANCELLED' };
  }

  if (trackingStatus === 'paused') {
    return { bg: '#ffffff10', color: '#666', label: 'PAUSED' };
  }

  return {
    bg: '#ffffff10',
    color: '#666',
    label: normalizedStatus ? normalizedStatus.replace('_', ' ').toUpperCase() : 'UNKNOWN',
  };
}

export function formatBookingDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatLastUpdatedAt(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Waiting for first location';

  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isActiveBooking(booking: BookingSummary): boolean {
  const status = (booking.status || '').toLowerCase();
  return ACTIVE_BOOKING_STATUSES.includes(status as (typeof ACTIVE_BOOKING_STATUSES)[number]);
}

export function isTerminalBooking(booking: BookingSummary): boolean {
  const status = (booking.status || '').toLowerCase();
  return TERMINAL_BOOKING_STATUSES.includes(status as (typeof TERMINAL_BOOKING_STATUSES)[number]);
}

export const DEMO_BOOKINGS: BookingSummary[] = [
  {
    id: 'demo-live-booking',
    user_id: 'demo-user',
    pickup_location: 'Tambaram',
    dropoff_location: 'Velachery',
    pickup_date: new Date().toISOString().slice(0, 10),
    pickup_time: '10:30:00',
    status: 'in_progress',
    created_at: new Date().toISOString(),
    vehicle_type: 'Mini Truck',
    fare: 450,
    driver_name: 'Murugan R.',
    driver_phone: '+91 90000 11111',
    vehicle_label: 'TN09 AX 4421',
    tracking_status: 'live',
    eta_minutes: 3,
    pickup_lat: 12.9249,
    pickup_lng: 80.1000,
    drop_lat: 12.9762,
    drop_lng: 80.2214,
  },
  {
    id: 'demo-confirmed-booking',
    user_id: 'demo-user',
    pickup_location: 'Pallavaram',
    dropoff_location: 'Ambattur',
    pickup_date: new Date().toISOString().slice(0, 10),
    pickup_time: '14:00:00',
    status: 'confirmed',
    created_at: new Date().toISOString(),
    vehicle_type: 'Pickup',
    fare: 340,
    driver_name: 'Priya S.',
    driver_phone: '+91 90000 22222',
    vehicle_label: 'TN22 BK 7733',
    tracking_status: 'not_started',
    eta_minutes: 12,
    pickup_lat: 12.9675,
    pickup_lng: 80.1491,
    drop_lat: 13.1143,
    drop_lng: 80.1548,
  },
  {
    id: 'demo-completed-booking',
    user_id: 'demo-user',
    pickup_location: 'Chromepet',
    dropoff_location: 'T. Nagar',
    pickup_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    pickup_time: '17:45:00',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    vehicle_type: 'Sedan',
    fare: 189,
    driver_name: 'Rajan K.',
    driver_phone: '+91 90000 33333',
    vehicle_label: 'TN01 ZX 1190',
    tracking_status: 'completed',
    eta_minutes: 0,
    pickup_lat: 12.9516,
    pickup_lng: 80.1462,
    drop_lat: 13.0418,
    drop_lng: 80.2337,
  },
];

export async function fetchUserBookings(userId: string): Promise<BookingSummary[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('user_id', userId)
    .order('pickup_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data as RawRow[] | null) ?? []).map(normalizeBooking);
}

export async function fetchActiveBooking(userId: string): Promise<BookingSummary | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('user_id', userId)
    .in('status', [...ACTIVE_BOOKING_STATUSES])
    .order('pickup_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeBooking(data as RawRow) : null;
}

export async function fetchBookingById(userId: string, bookingId: string): Promise<BookingSummary | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('user_id', userId)
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeBooking(data as RawRow) : null;
}

export async function fetchLatestLocation(bookingId: string): Promise<BookingLocationPoint | null> {
  const { data, error } = await supabase
    .from('booking_locations')
    .select(BOOKING_LOCATION_SELECT)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? normalizeLocation(data as RawRow) : null;
}

export async function fetchActiveBookingTracking(userId: string): Promise<ActiveBookingTracking | null> {
  const booking = await fetchActiveBooking(userId);

  if (!booking) return null;

  const currentLocation = await fetchLatestLocation(booking.id);

  return {
    ...booking,
    current_location: currentLocation,
  };
}
