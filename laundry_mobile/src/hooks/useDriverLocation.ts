import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export interface DriverCoords {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
}

interface UseDriverLocationReturn {
  coords: DriverCoords | null;
  error: string | null;
  isTracking: boolean;
}

export function useDriverLocation(): UseDriverLocationReturn {
  const [coords, setCoords] = useState<DriverCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        // Get initial position immediately
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (mounted) {
          setCoords({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: initial.coords.heading,
            speed: initial.coords.speed,
            accuracy: initial.coords.accuracy,
          });
          setIsTracking(true);
        }

        // Subscribe to position updates (every 5 seconds or 15m moved)
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,      // 5 seconds
            distanceInterval: 15,    // 15 meters
          },
          (location) => {
            if (mounted) {
              setCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading,
                speed: location.coords.speed,
                accuracy: location.coords.accuracy,
              });
            }
          }
        );
      } catch (err: any) {
        if (mounted) setError(err.message || 'Location error');
      }
    };

    startTracking();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      setIsTracking(false);
    };
  }, []);

  return { coords, error, isTracking };
}
