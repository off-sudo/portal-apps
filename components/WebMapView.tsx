/**
 * WebMapView.tsx
 * Drop-in replacement for react-native-maps on web / localhost.
 * Uses react-leaflet + leaflet under the hood.
 *
 * Install once:
 *   npm install react-leaflet leaflet
 *   npm install --save-dev @types/leaflet
 *
 * Also add to your HTML <head> (or import in _layout.tsx / index.html):
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
 */

import L from 'leaflet';
import React from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { StyleProp, View, ViewStyle } from 'react-native';

// ─── Fix default Leaflet marker icons broken by webpack/metro ────────────────
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Helper: build a coloured circle-div icon ────────────────────────────────
function makeCircleIcon(emoji: string, bgColor: string) {
  return L.divIcon({
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${bgColor};border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: '',
  });
}

const greenPin = makeCircleIcon('📍', '#00C853');
const redPin   = makeCircleIcon('📍', '#FF5722');

// ─── Types (mirrors react-native-maps API used in your screens) ───────────────
export type Coordinate = { latitude: number; longitude: number };

export interface WebMapMarkerProps {
  coordinate: Coordinate;
  title?: string;
  description?: string;
  /** hex colour for a plain coloured circle marker */
  pinColor?: string;
  /** pass a single emoji string to render a custom emoji marker */
  children?: React.ReactNode;
}

export interface WebMapViewProps {
  style?: StyleProp<ViewStyle>;
  /** initial + controlled region */
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  children?: React.ReactNode;
}

export interface WebPolylineProps {
  coordinates: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

// ─── Marker ──────────────────────────────────────────────────────────────────
export function WebMarker({ coordinate, title, description, pinColor, children }: WebMapMarkerProps) {
  // If a child is a View containing a Text emoji, extract it
  let icon: L.Icon | L.DivIcon | undefined;

  if (children) {
    // Try to pull emoji out of children (your van marker passes <View><Text>{vehicle.icon}</Text></View>)
    const emojiText = extractEmojiFromChildren(children);
    icon = makeCircleIcon(emojiText ?? '🚛', '#FF5722');
  } else if (pinColor) {
    icon = makeCircleIcon(pinColor === '#00C853' ? '📍' : '📍', pinColor);
  }

  const pos: L.LatLngExpression = [coordinate.latitude, coordinate.longitude];

  return (
    <Marker position={pos} icon={icon}>
      {(title || description) && (
        <Tooltip direction="top" offset={[0, -18]} opacity={1} permanent={false}>
          {title && <strong>{title}</strong>}
          {description && <div style={{ fontSize: 12 }}>{description}</div>}
        </Tooltip>
      )}
    </Marker>
  );
}

/** Naive helper: walk React children to find a text node that looks like an emoji */
function extractEmojiFromChildren(node: React.ReactNode): string | null {
  if (typeof node === 'string') return node;
  if (!React.isValidElement(node)) return null;
  const kids = (node.props as any).children;
  if (!kids) return null;
  if (typeof kids === 'string') return kids;
  if (Array.isArray(kids)) {
    for (const k of kids) {
      const found = extractEmojiFromChildren(k);
      if (found) return found;
    }
  }
  return extractEmojiFromChildren(kids);
}

// ─── Polyline ────────────────────────────────────────────────────────────────
export function WebPolyline({ coordinates, strokeColor = '#1a73e8', strokeWidth = 3, lineDashPattern }: WebPolylineProps) {
  const positions: L.LatLngExpression[] = coordinates.map((c) => [c.latitude, c.longitude]);
  const dashArray = lineDashPattern ? lineDashPattern.join(' ') : undefined;

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: strokeColor, weight: strokeWidth, dashArray }}
    />
  );
}

// ─── MapView (the main component) ────────────────────────────────────────────
/**
 * Drop-in for `import MapView from 'react-native-maps'`
 *
 * Usage (identical to your existing code):
 *
 *   <WebMapView style={styles.map} region={mapRegion}>
 *     <WebMarker coordinate={currentLocation} pinColor="#00C853" title="You" />
 *     <WebMarker coordinate={dropCoordinate} pinColor="#FF5722" title="Drop" />
 *     {dummyVans.map(van => (
 *       <WebMarker key={van.id} coordinate={van.coordinate}>
 *         <View style={styles.vanMarker}><Text>{vehicle.icon}</Text></View>
 *       </WebMarker>
 *     ))}
 *     <WebPolyline coordinates={routePoints} strokeColor="#1a73e8" strokeWidth={3} lineDashPattern={[8,6]} />
 *   </WebMapView>
 */
export default function WebMapView({ style, region, initialRegion, children }: WebMapViewProps) {
  const r = region ?? initialRegion;

  // Convert RN-style region (latDelta/lngDelta) to Leaflet bounds
  const center: L.LatLngExpression = r
    ? [r.latitude, r.longitude]
    : [12.9716, 80.2214];

  // Approximate zoom from latitudeDelta
  const zoom = r ? Math.round(Math.log2(360 / r.latitudeDelta)) - 1 : 12;

  // react-native StyleSheet objects are plain JS objects; cast width/height
  const flatStyle = StyleSheet.flatten ? StyleSheet.flatten(style) : (style as React.CSSProperties | undefined);
  const width  = (flatStyle as any)?.width  ?? '100%';
  const height = (flatStyle as any)?.height ?? 300;

  return (
    <View style={[{ width, height }, style as any]}>
      <MapContainer
        center={center}
        zoom={zoom}
        key={`${center}-${zoom}`}   // re-mount when region changes significantly
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </View>
  );
}

// re-export so callers can do:  import WebMapView, { WebMarker, WebPolyline } from './WebMapView'
export { WebMapView };

// Tiny shim so StyleSheet.flatten works when imported outside RN context
const StyleSheet = {
  flatten: (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s),
};