import { useState, useEffect, useCallback } from 'react';

interface GeolocationPosition {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
}

interface UseGeolocationResult {
  position: GeolocationPosition;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  requestGeolocation: () => void;
}

interface GeolocationPositionError {
  code: number;
  message: string;
}

export function useGeolocation(options: PositionOptions = {}): UseGeolocationResult {
  const [position, setPosition] = useState<GeolocationPosition>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
  });
  
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation not supported',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        setIsLoading(false);
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message,
        });
        setIsLoading(false);
      },
      options
    );
  }, [options]);

  useEffect(() => {
    if (options.enableHighAccuracy) {
      requestGeolocation();
    }
  }, [requestGeolocation, options.enableHighAccuracy]);

  return { position, error, isLoading, requestGeolocation };
}
