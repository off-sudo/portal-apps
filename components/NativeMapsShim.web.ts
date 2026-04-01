/**
 * components/NativeMapsShim.web.ts
 *
 * On web this module is resolved INSTEAD of NativeMapsShim.ts
 * Metro/Expo sees the .web.ts extension and never even looks at
 * react-native-maps, so the native-only import error disappears.
 */

export const NativeMapView  = null;
export const NativeMarker   = null;
export const NativePolyline = null;