export type BookingTrackingStatus = 'not_started' | 'live' | 'paused' | 'completed';

export type BookingLocationPoint = {
  id: string;
  booking_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed_kmh: number | null;
  source: string;
  created_at: string;
};

export type BookingSummary = {
  pickup_time: string;
  pickup_date: string | null;
  dropoff_location: string;
  id: string;
  user_id: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  booking_date: string | null;
  time_slot: string | null;
  status: string | null;
  created_at: string | null;
  vehicle_type: string | null;
  fare: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_label: string | null;
  tracking_status: BookingTrackingStatus | null;
  eta_minutes: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  drop_lat: number | null;
  drop_lng: number | null;
};

export type ActiveBookingTracking = BookingSummary & {
  current_location: BookingLocationPoint | null;
};
