/**
 * components/NativeMapsShim.ts
 *
 * On iOS / Android this module is used.
 * It imports react-native-maps normally.
 */
import NativeMapViewDefault, { Marker, Polyline } from 'react-native-maps';

export const NativeMapView  = NativeMapViewDefault;
export const NativeMarker   = Marker;
export const NativePolyline = Polyline;