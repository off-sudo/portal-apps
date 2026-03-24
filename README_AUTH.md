# Portal Services Mobile App

A modern logistics and vehicle booking application built with React Native/Expo and Supabase.

## 🚀 Features

- **User Authentication**
  - Email/password sign-up and sign-in
  - Secure session management
  - Persistent login across app restarts

- **Vehicle Booking**
  - Easy booking form
  - Real-time booking status
  - Booking history

- **User Profiles**
  - Manage profile information
  - Phone number verification
  - Avatar support

- **Dark/Light Mode**
  - Automatic theme switching
  - Persistent theme preference

- **Security**
  - Row Level Security (RLS) for data protection
  - JWT token authentication
  - Encrypted session storage

## 🛠️ Tech Stack

- **Frontend**
  - React 19.1
  - React Native 0.81
  - Expo 54
  - Expo Router (File-based routing)
  - TypeScript

- **Backend**
  - Supabase (PostgreSQL + Auth)
  - Row Level Security (RLS)
  - Real-time subscriptions

- **Styling**
  - React Native StyleSheet
  - Theme system with dark/light modes

- **State Management**
  - React Context API
  - AsyncStorage for persistence

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free: https://supabase.com)
- Expo CLI (installed with npm)

### For Mobile Testing
- **Android**: Android Studio or Android emulator
- **iOS**: Mac with Xcode (development only)
- **Physical Device**: Expo Go app from App Store/Play Store

## 🚀 Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Setup Environment

Copy `.env.local` and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from [Supabase Dashboard](https://app.supabase.com) → Settings > API

### 3. Create Database

Run the SQL setup from `docs/SUPABASE_SETUP.md` in Supabase SQL Editor.

### 4. Start Development Server

```bash
npm start
```

Choose your platform:
- `w` - Web (browser)
- `a` - Android emulator
- `i` - iOS simulator
- Scan QR code with Expo Go app for physical device

## 📁 Project Structure

```
portal-app-1/
├── app/                      # App screens and routing
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Sign up screen
│   ├── modal.tsx            # Modal example
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigator
│       ├── index.tsx        # Home/Welcome screen
│       ├── explore.tsx      # Explore screen
│       └── +not-found.tsx   # 404 page
├── contexts/
│   └── AuthContext.tsx      # Authentication logic
├── lib/
│   └── supabase.ts          # Supabase client configuration
├── hooks/
│   └── use-color-scheme.ts  # Theme hook
├── constants/
│   └── theme.ts             # Theme colors and fonts
├── components/              # Reusable components
├── docs/
│   ├── QUICK_START.md       # Quick start guide (START HERE!)
│   ├── SUPABASE_SETUP.md    # Backend setup
│   ├── AUTHENTICATION_SETUP.md  # Auth documentation
│   ├── API_INTEGRATION.md   # API usage guide
│   └── README.md            # This file
├── .env.local               # Environment variables (local only)
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

## 🔐 Authentication Flow

```
1. User opens app
   ↓
2. AuthContext checks for stored session
   ↓
3. If session valid → Show main app
   If no session → Show login/signup
   ↓
4. User signs up/in
   ↓
5. Supabase Auth validates credentials
   ↓
6. JWT token stored securely (AsyncStorage)
   ↓
7. AuthContext updates, UI renders
   ↓
8. App shows dashboard with user data
```

## 📚 Documentation

- **[QUICK_START.md](./docs/QUICK_START.md)** - 10-minute setup guide (START HERE!)
- **[SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)** - Complete backend configuration
- **[AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md)** - Auth & authorization guide
- **[API_INTEGRATION.md](./docs/API_INTEGRATION.md)** - API query examples

## 💻 Available Commands

```bash
# Development
npm start              # Start Expo dev server
npm run android       # Run on Android emulator
npm run ios          # Run on iOS simulator
npm run web          # Run in web browser

# Production
npm run build        # Build production app
npm run lint         # Run ESLint

# Maintenance
npm run reset-project # Reset to defaults
npm install          # Install dependencies
npm update          # Update dependencies
```

## 🗄️ Database Schema

### profiles
```
id (UUID) - Primary key
email (TEXT) - User email
full_name (TEXT) - User full name
phone (TEXT) - Phone number
avatar_url (TEXT) - Profile picture
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### bookings
```
id (UUID) - Primary key
user_id (UUID) - Foreign key to profiles
vehicle_type (TEXT) - Type of vehicle
pickup_location (TEXT) - Pickup location
dropoff_location (TEXT) - Drop-off location
pickup_date (DATE) - Booking date
pickup_time (TIME) - Booking time
notes (TEXT) - Additional notes
status (TEXT) - pending/confirmed/cancelled/completed
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Signed tokens for API requests
- **Secure Session Storage**: AsyncStorage with encryption
- **Email Verification**: Optional email verification for sign-ups
- **Auto Token Refresh**: Automatic JWT refresh before expiration

## 🎨 Customization

### Change Theme Colors

Edit `constants/theme.ts`:

```typescript
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',        // Change primary color
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  // ...
};
```

### Add New Screen

1. Create `app/new-screen.tsx`
2. Export default component
3. Add to navigation in `app/(tabs)/_layout.tsx`

### Customize Auth Flow

Edit `contexts/AuthContext.tsx` to modify:
- Sign-up validation rules
- Profile data structure
- Error messages

## 📱 Testing

### Manual Testing Checklist

- [ ] Sign up with new account
- [ ] Verify email works
- [ ] Sign in with credentials
- [ ] Create a booking
- [ ] View bookings
- [ ] Update profile
- [ ] Toggle dark/light mode
- [ ] Close app and reopen (session persisted?)
- [ ] Sign out
- [ ] Try accessing protected screens (redirected to login?)

### Browser DevTools

1. Open app in web: `npm start` → Press `w`
2. Press `F12` for Developer Tools
3. Go to **Console** tab to see logs
4. Go to **Application > Local Storage** to see stored data

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Environment variables not loading
- Check `.env.local` exists in project root
- Verify variable names match (case-sensitive)
- Restart dev server: Press `r` in terminal

### Sign-up/Login not working
- Check Supabase URL and key are correct
- Verify Email provider is enabled in Supabase
- Check browser console for detailed errors

### "No rows affected" when creating booking
- User must be signed in
- User profile must exist in database
- RLS might be too restrictive

### Cold start slow?
- This is normal on first app load
- Subsequent starts will be faster
- Consider using Expo EAS Build for production

## 🚀 Deployment

### Build APK (Android)

```bash
npx eas build --platform android --local
```

### Build IPA (iOS)

```bash
npx eas build --platform ios --local
```

Requires Xcode and Apple developer account.

### Deploy to Web

```bash
npm run build:web
# Deploy dist/ folder to hosting (Vercel, Netlify, etc)
```

## 📖 Learning Resources

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://expo.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [React Documentation](https://react.dev)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit with clear message: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📞 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: File issues in GitHub
- **Questions**: Check Supabase Discord community
- **Emergency**: Contact development team

## 🗺️ Roadmap

- [ ] Payment integration
- [ ] GPS tracking
- [ ] Push notifications
- [ ] Analytics dashboard
- [ ] Admin panel
- [ ] Multi-language support
- [ ] Offline mode

---

**Ready to get started?** Jump to [QUICK_START.md](./docs/QUICK_START.md)!

**Last Updated**: March 2024
**Version**: 1.0.0
