import { useState, useCallback, useRef } from 'react';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  polyline: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: string;
  durationMin: number;
}

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjVhMGIxN2M1MzVhZjQ4MzNhMjNmYmI3MWFlMzQ2ZjJhIiwiaCI6Im11cm11cjY0In0=';

// Decode Google-style polyline encoding
function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export function useDirections() {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef<string>('');

  const calculateRoute = useCallback(async (waypoints: RoutePoint[]) => {
    if (!Array.isArray(waypoints) || waypoints.length < 2) return;

    // Deduplicate — only fetch if waypoints actually changed meaningfully
    const key = waypoints.map(w => `${w.latitude.toFixed(4)},${w.longitude.toFixed(4)}`).join('|');
    if (key === lastRequestRef.current) return;
    lastRequestRef.current = key;

    setLoading(true);
    setError(null);

    try {
      // ORS expects [lng, lat] format (GeoJSON)
      const coordinates = waypoints.map(w => [w.longitude, w.latitude]);

      const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_API_KEY,
        },
        body: JSON.stringify({
          coordinates,
          geometry_simplify: true,
          instructions: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`ORS ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const segment = data.routes?.[0];

      if (!segment) throw new Error('No route returned');

      const polyline = decodePolyline(segment.geometry);
      const distanceMeters = segment.summary?.distance || 0;
      const durationSeconds = segment.summary?.duration || 0;

      setRoute({
        polyline,
        distanceMeters,
        durationSeconds,
        distanceKm: (distanceMeters / 1000).toFixed(1),
        durationMin: Math.ceil(durationSeconds / 60),
      });
    } catch (err: any) {
      setError(err.message);
      // Fallback: draw straight line between points
      setRoute({
        polyline: waypoints,
        distanceMeters: 0,
        durationSeconds: 0,
        distanceKm: '—',
        durationMin: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    lastRequestRef.current = '';
  }, []);

  return { route, loading, error, calculateRoute, clearRoute };
}
