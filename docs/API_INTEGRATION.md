# API Integration Guide

This guide explains how to interact with Supabase from your React/Expo app.

## Getting Started

### 1. Initialize Supabase Client

Already set up in `lib/supabase.ts`. Just import and use:

```typescript
import { supabase } from '@/lib/supabase';
```

### 2. Ensure User is Authenticated

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) return <ActivityIndicator />;
  if (!user) return <Text>Please login</Text>;
  
  // Component code...
}
```

## CRUD Operations

### CREATE - Insert Data

```typescript
// Single record
const { data, error } = await supabase
  .from('bookings')
  .insert([
    {
      user_id: user.id,
      vehicle_type: 'sedan',
      pickup_location: 'Delhi Airport',
      dropoff_location: 'Hotel',
      pickup_date: '2024-03-25',
      pickup_time: '10:00',
      notes: 'Please arrive 15 mins early'
    }
  ])
  .select();

if (error) {
  console.error('Insert error:', error);
} else {
  console.log('Created:', data);
}

// Multiple records
const { data, error } = await supabase
  .from('bookings')
  .insert([
    { user_id: user.id, vehicle_type: 'sedan', ... },
    { user_id: user.id, vehicle_type: 'suv', ... }
  ])
  .select();
```

### READ - Fetch Data

```typescript
// Get all user's bookings
const { data: bookings, error } = await supabase
  .from('bookings')
  .select('*')
  .order('created_at', { ascending: false });

// Get single booking
const { data: booking, error } = await supabase
  .from('bookings')
  .select('*')
  .eq('id', bookingId)
  .single();

// Get bookings with filters
const { data, error } = await supabase
  .from('bookings')
  .select('*')
  .eq('status', 'completed')
  .gte('pickup_date', '2024-01-01')
  .lte('pickup_date', '2024-12-31')
  .order('pickup_date', { ascending: true })
  .limit(10);

// Search for specific data
const { data, error } = await supabase
  .from('bookings')
  .select('*')
  .ilike('pickup_location', '%Airport%')  // Case-insensitive search
  .or('dropoff_location.ilike.%Hotel%');  // OR condition
```

### UPDATE - Modify Data

```typescript
// Update specific record
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId)
  .select();

// Update multiple records
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'cancelled' })
  .lt('pickup_date', '2024-01-01')  // Before specific date
  .select();

// Upsert (insert or update)
const { data, error } = await supabase
  .from('profiles')
  .upsert([
    {
      id: user.id,
      full_name: 'New Name',
      phone: '+91-XXXXXXXXXX'
    }
  ])
  .select();
```

### DELETE - Remove Data

```typescript
// Delete single record
const { error } = await supabase
  .from('bookings')
  .delete()
  .eq('id', bookingId);

// Delete multiple records
const { error } = await supabase
  .from('bookings')
  .delete()
  .lt('created_at', '2024-01-01');  // Delete old records

// Delete and return data
const { data, error } = await supabase
  .from('bookings')
  .delete()
  .eq('id', bookingId)
  .select();
```

## Advanced Queries

### Joins (Fetch Related Data)

```typescript
// Get bookings with user profile info
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id,
    vehicle_type,
    status,
    pickup_date,
    profiles(full_name, phone)
  `)
  .order('created_at', { ascending: false });

// Result structure:
// {
//   id: 'uuid',
//   vehicle_type: 'sedan',
//   profiles: { full_name: 'John', phone: '+91...' }
// }
```

### Aggregations

```typescript
// Count bookings by status
const { data } = await supabase
  .from('bookings')
  .select('status, count()', { count: 'exact' })
  .group_by('status');

// Get total amount from payments
const { data } = await supabase
  .rpc('get_booking_stats', { user_id: user.id });
```

### Pagination

```typescript
const PAGE_SIZE = 10;
const page = 0;

const from = page * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

const { data: bookings, count } = await supabase
  .from('bookings')
  .select('*', { count: 'exact' })
  .range(from, to);

const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
```

### Real-Time Subscriptions

```typescript
// Subscribe to booking changes
const subscription = supabase
  .channel('bookings')
  .on(
    'postgres_changes',
    {
      event: '*',  // 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      console.log('Change received!', payload);
      // Update UI with new data
    }
  )
  .subscribe();

// Cleanup subscription
subscription.unsubscribe();
```

## Complete Examples

### Example 1: Create & Display Bookings

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bookings
  useEffect(() => {
    fetchBookings();
  }, [user?.id]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('bookings')
        .select(`
          id,
          vehicle_type,
          pickup_location,
          dropoff_location,
          pickup_date,
          status
        `)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setBookings(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (bookingData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            ...bookingData
          }
        ])
        .select();

      if (insertError) throw insertError;
      
      // Refresh list
      await fetchBookings();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.bookingCard}>
          <Text>{item.vehicle_type}</Text>
          <Text>{item.pickup_location} → {item.dropoff_location}</Text>
          <Text>{item.status}</Text>
        </View>
      )}
    />
  );
}
```

### Example 2: Real-Time Updates

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function LiveBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchBookings();

    // Subscribe to changes
    const subscription = supabase
      .channel('bookings-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings([payload.new, ...bookings]);
          } else if (payload.eventType === 'UPDATE') {
            setBookings(
              bookings.map((b) => b.id === payload.new.id ? payload.new : b)
            );
          } else if (payload.eventType === 'DELETE') {
            setBookings(bookings.filter((b) => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    setBookings(data || []);
  };

  return (
    // UI using bookings state
  );
}
```

## Error Handling

```typescript
const handleBookingCreation = async (bookingData) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select();

    if (error) {
      // Handle different error types
      if (error.code === '42P01') {
        throw new Error('Table not found');
      } else if (error.code === '23503') {
        throw new Error('Invalid user ID');
      } else if (error.code === '23505') {
        throw new Error('Duplicate record');
      } else {
        throw new Error(error.message);
      }
    }

    return data;
  } catch (err) {
    console.error('Booking error:', err);
    // Show user-friendly error
    Alert.alert('Error', err.message);
  }
};
```

## Query Operators

### Comparison Operators

```typescript
// Equals
.eq('status', 'completed')

// Not equals
.neq('status', 'cancelled')

// Greater than
.gt('amount', 1000)

// Greater than or equal
.gte('pickup_date', '2024-01-01')

// Less than
.lt('amount', 5000)

// Less than or equal
.lte('pickup_date', '2024-12-31')
```

### Pattern Matching

```typescript
// Like (case-sensitive)
.like('vehicle_type', '%sedan%')

// Like %
.ilike('pickup_location', '%airport%')

// In array
.in('vehicle_type', ['sedan', 'suv'])

// Is null
.is('avatar_url', null)

// Full text search
.textSearch('notes', 'delhi airport')
```

## Troubleshooting

### "RLS violation"
- Ensure record belongs to current user
- Verify RLS policies are set correctly

### "Not found" (404)
- Check table name spelling
- Verify record exists
- Confirm RLS isn't hiding records

### Network errors
- Check internet connection
- Verify Supabase URL in .env
- Check firewall/proxy settings

### Slow queries
- Add indexes to frequently filtered columns
- Limit results with `.limit()`
- Use pagination for large datasets

---

For more details, see [Supabase JS Docs](https://supabase.com/docs/reference/javascript)
