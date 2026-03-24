# Portal App 1 Live Booking Realtime Plan

## Summary
`portal-app-1` is the correct app to target for this feature. The current structure is:
- `app/(tabs)/explore.tsx`: truck/logistics discovery screen with a map placeholder
- `app/(tabs)/rides.tsx`: cab flow with mock live-map UI
- `app/(tabs)/bookings.tsx`: planned bookings screen, currently commented out
- `app/(tabs)/profile.tsx`: currently shows booking history using Supabase
- `contexts/AuthContext.tsx` + `lib/supabase.ts`: existing mobile auth and Supabase client

Build v1 as a **customer live-tracking feature inside `portal-app-1`**, using **Supabase Realtime + `react-native-maps`**. Do not target MapLibre in this app for v1; keep that as a later phase.

## Implementation Changes
- **Database**
  - Extend `bookings` with customer-tracking fields:
    - `vehicle_type text null`
    - `fare numeric null`
    - `driver_name text null`
    - `driver_phone text null`
    - `vehicle_label text null`
    - `tracking_status text not null default 'not_started'`
    - `eta_minutes integer null`
  - Create `booking_locations` table for streaming coordinates:
    - `id uuid primary key default gen_random_uuid()`
    - `booking_id uuid not null references bookings(id) on delete cascade`
    - `lat numeric not null`
    - `lng numeric not null`
    - `heading numeric null`
    - `speed_kmh numeric null`
    - `source text not null default 'dummy'`
    - `created_at timestamptz not null default now()`
  - Create a latest-location query surface for the app, either:
    - `booking_live_locations` view, or
    - client query for latest row per booking
  - Add RLS so customers can read only:
    - their own active bookings
    - location rows for their own bookings
  - Add `bookings` and `booking_locations` to Supabase Realtime publication.

- **Mobile app flow**
  - Restore and ship `app/(tabs)/bookings.tsx` as the main customer bookings tab.
  - Add an “active booking” detail state for bookings in `pending | confirmed | in_progress`.
  - From the home screen banner and bookings list, route into the live booking screen/state.
  - Reuse the existing tab/auth structure; no separate support/admin flow in v1.

- **Realtime tracking UI**
  - Replace the map placeholder in the active-booking experience with `react-native-maps`.
  - Show:
    - current truck marker
    - pickup marker
    - drop marker
    - booking status
    - ETA
    - driver/vehicle card
    - last updated time
  - Subscribe via `supabase.channel(...).on('postgres_changes', ...)` to:
    - `booking_locations` `INSERT`
    - `bookings` `UPDATE`
  - On screen load:
    - fetch the active booking
    - fetch the latest coordinate
    - then layer realtime updates on top
  - On reconnect or app resume:
    - refetch latest booking/location before resubscribing

- **Dummy test feed**
  - Add `sqlfiles/5_bookings_realtime_lib_supa.sql` for end-to-end testing.
  - Include:
    - one active booking update to set `status`, `tracking_status`, ETA, and driver fields
    - sequential `booking_locations` inserts for the same booking
    - optional helper function for easier dummy point insertion
  - This validates the full Supabase Realtime path instead of only mocking movement in the client.

## Public Interfaces / Types
- Add mobile types for:
  - `BookingTrackingStatus = 'not_started' | 'live' | 'paused' | 'completed'`
  - `BookingLocationPoint`
  - `ActiveBookingTracking`
- Booking fetch shape must include:
  - driver info
  - vehicle info
  - ETA
  - latest lat/lng
- Keep auth as the current Supabase-auth user model in `portal-app-1`.

## Test Plan
- Customer logs in and sees their bookings in the restored bookings tab.
- An active booking with no location rows shows a valid waiting state.
- Inserting a new `booking_locations` row moves the marker on the active-booking screen without manual refresh.
- Updating booking status or ETA reflects live in the UI.
- Customer cannot receive realtime events for another user’s booking.
- Reload/app resume restores the latest booking state and last known coordinate correctly.
- Dummy SQL flow works end to end against the mobile app.

## Assumptions
- `portal-app-1` is the primary app for this work.
- v1 audience is **customer tracking**, not support operations.
- v1 map stack is **`react-native-maps`**, because it already exists in the app and fits Expo cleanly.
- MapLibre is deferred for a later phase rather than forced into this first mobile rollout.
