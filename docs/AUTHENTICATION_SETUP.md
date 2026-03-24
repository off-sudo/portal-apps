# Authentication Setup & Authorization Guide

This guide explains how authentication and authorization work in the Portal Services app.

## Overview

The app uses **Supabase Authentication** with:
- Email/password sign-up and sign-in
- Secure session management
- Row Level Security (RLS) for data protection
- Persistent authentication across app restarts

## Architecture

```
┌─────────────────┐
│   React App     │
│  (Expo/React)   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │AuthContext│ (State Management)
    └────┬─────┘
         │
    ┌────▼─────────────┐
    │Supabase JS Client│
    └────┬─────────────┘
         │
    ┌────▼──────────────┐
    │  Supabase Auth    │
    │  (Email/Password) │
    └────┬──────────────┘
         │
    ┌────▼──────────────┐
    │ PostgreSQL DB     │
    │ (Profiles, RLS)   │
    └───────────────────┘
```

## Authentication Flow

### Sign Up Flow with OTP Verification

1. **User enters registration form** (email, password, name, phone)
2. **Validation** by frontend (password length, email format, etc.)
3. **Create Auth User**: `supabase.auth.signUp()`
   - Supabase creates user in `auth.users` table
   - Generates a 6-digit OTP code
   - Sends OTP to user's email address
4. **User receives OTP email** and enters the code in the app
5. **Verify OTP**: `supabase.auth.verifyOtp(email, token)`
   - App sends email and 6-digit code to Supabase
   - Supabase validates the OTP
6. **Create Profile**: After OTP verification, app inserts to `profiles` table
   - Links profile to authenticated user
   - Stores additional info (name, phone)
7. **User is fully authenticated** and redirected to dashboard

### OTP Verification Details

**What happens during verification:**
- OTP codes are 6 digits
- Default OTP expiration: 15 minutes
- Users can request a new OTP if it expires (30-second cooldown between requests)
- After 3 failed attempts, OTP is invalidated and user must request a new one

**Error cases:**
- Invalid OTP: User sees error and can retry
- Expired OTP: Resend button becomes available
- Invalid email: Signup fails with validation error

### Sign In Flow

1. **User enters credentials** (email, password)
2. **Authenticate**: `supabase.auth.signInWithPassword()`
3. **Session Created**: 
   - JWT access token generated
   - Refresh token stored securely
   - Session object returned
4. **AuthContext Updated**:
   - `user` state updated
   - UI navigates to app
5. **Auto-Navigation**: App redirects to dashboard

### Session Persistence

On app restart:
1. Check for stored session: `supabase.auth.getSession()`
2. If valid: Restore user state (no login needed)
3. If expired: Clear session (user needs to login again)
4. Subscribe to auth changes: `supabase.auth.onAuthStateChange()`

### Sign Out Flow

1. User taps "Logout"
2. Clear session: `supabase.auth.signOut()`
3. Reset AuthContext state
4. Redirect to login screen

## Authorization with Row Level Security (RLS)

### What is RLS?

Row Level Security enforces database-level access control. Even if someone gets a database token, they can ONLY access their own rows.

### How It Works

When a user runs a query:

```sql
SELECT * FROM bookings;
```

The database automatically adds a filter:

```sql
SELECT * FROM bookings WHERE auth.uid() = user_id;
```

So users only see **their own bookings**, not others'.

### RLS Policies Setup

**For bookings table:**

| Policy | Effect | SQL |
|--------|--------|-----|
| SELECT | User sees own records | `auth.uid() = user_id` |
| INSERT | Can create own record | `auth.uid() = user_id` |
| UPDATE | Can update own records | `auth.uid() = user_id` |
| DELETE | Can delete own records | `auth.uid() = user_id` |

**For profiles table:**

| Policy | Effect | SQL |
|--------|--------|-----|
| SELECT | User sees own profile | `auth.uid() = id` |
| INSERT | User creates on signup | `auth.uid() = id` |
| UPDATE | User updates own profile | `auth.uid() = id` |

## Collecting Authorization Data

### User Data Available After Sign In

```typescript
const { user, session } = useAuth();

// user properties:
user.id              // UUID - unique user ID
user.email           // string - user's email
user.user_metadata   // object - custom data (names, etc.)
user.created_at      // string - sign-up date

// session properties:
session.access_token // JWT token
session.refresh_token// Used to get new access token
session.expires_at   // Token expiration timestamp
```

### Profile Data (From Database)

```typescript
// Fetch user's profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// profile contains:
// - full_name
// - phone
// - avatar_url
// - bio
// - created_at
```

### JWT Token Content

Access token is signed JWT containing:

```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "https://your-project.supabase.co/auth/v1"
}
```

## Implementing Auth in Components

### 1. Using useAuth Hook

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, loading, signOut, error } = useAuth();

  if (loading) return <ActivityIndicator />;
  
  if (!user) return <Text>Not logged in</Text>;

  return (
    <View>
      <Text>Welcome, {user.email}</Text>
      <Pressable onPress={signOut}>
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}
```

### 2. Fetching Protected Data

```typescript
const fetchUserBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  
  // RLS automatically filters to user's bookings
  return data;
};
```

### 3. Creating Records with Current User

```typescript
const createBooking = async (bookingData) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        user_id: user.id,  // RLS requires this to match auth.uid()
        ...bookingData
      }
    ]);
    
  return { data, error };
};
```

## Security Best Practices

### ✅ DO

- Always validate form inputs on frontend
- Use HTTPS only
- Enable email verification for sign-up
- Set strong password requirements
- Use refresh tokens properly
- Review RLS policies regularly
- Monitor auth logs

### ❌ DON'T

- Store auth tokens in plain text
- Expose API keys in code
- Disable RLS for convenience
- Store sensitive data in JWT
- Trust only frontend validation
- Use admin API key in frontend

## Debugging Common Issues

### "User Already Exists"
- **Cause**: Email account exists but not verified
- **Fix**: Check email for verification link

### "Invalid JWT Token"
- **Cause**: Token expired or corrupted
- **Fix**: Clear app cache, login again

### "RLS Violation / No Rows"
- **Cause**: Profile not created or RLS too restrictive
- **Fix**: Verify profile exists, review RLS policies

### "Refresh Token Failed"
- **Cause**: Session stale (>7 days)
- **Fix**: User must login again

## Environment Setup

### Development (.env.local)

```env
EXPO_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
```

### Production (.env.production)

```env
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
```

## Testing Authentication

### Manual Testing Checklist

- [ ] Sign up with new email → verify token works
- [ ] Sign up with existing email → see error
- [ ] Sign in with wrong password → see error
- [ ] Sign in with correct credentials → logged in
- [ ] Close app and reopen → still logged in
- [ ] Tap logout → redirect to login
- [ ] Access bookings without logging in → redirect to login
- [ ] Try to fetch other user's bookings → see only own

### Automated Testing Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { useAuth } from '@/contexts/AuthContext';

describe('Authentication', () => {
  it('should sign up new user', async () => {
    const { signUp } = useAuth();
    const result = await signUp('test@example.com', 'password123', {
      full_name: 'Test User'
    });
    expect(result.user).toBeDefined();
  });

  it('should prevent duplicate signup', async () => {
    const { signUp } = useAuth();
    await expect(
      signUp('existing@example.com', 'password123')
    ).rejects.toThrow();
  });
});
```

## API Reference

### supabase.auth Methods

```typescript
// Sign up new user
supabase.auth.signUp({
  email: string,
  password: string,
  options?: { data: any }
})

// Sign in existing user
supabase.auth.signInWithPassword({
  email: string,
  password: string
})

// Get current session
supabase.auth.getSession()

// Sign out user
supabase.auth.signOut()

// Refresh token
supabase.auth.refreshSession()

// Watch auth changes
supabase.auth.onAuthStateChange((event, session) => {})

// Get current user
supabase.auth.getUser()
```

### useAuth Hook Methods

```typescript
const {
  user,              // Current user object or null
  session,           // Current session or null
  loading,           // Boolean - loading state
  error,             // Error message or null
  signUp,            // Async function - register new user
  signIn,            // Async function - login
  signOut,           // Async function - logout
  clearError         // Function - clear error state
} = useAuth();
```

## Further Reading

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/overview)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT.io - Understand JWTs](https://jwt.io)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Last Updated**: March 2024
**Version**: 1.0.0
