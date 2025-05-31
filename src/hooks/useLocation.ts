import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { useErrorHandler } from './useErrorHandler';

import { setCurrentLocation, setError, setHeading, setSpeed } from '@/store/navigationSlice';
import { Location as LocationType } from '@/types/navigation';

const LOCATION_UPDATE_INTERVAL = 2000; // 2 seconds
const LOCATION_DISTANCE_INTERVAL = 10; // 10 meters
const HEADING_UPDATE_INTERVAL = 1000; // 1 second

export const useLocation = () => {
  const dispatch = useDispatch();
  const { withErrorHandling } = useErrorHandler();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<Location.LocationObject | null>(null);

  useEffect(() => {
    const setupLocation = async () => {
      try {
        // Request permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          dispatch(setError('Location permission denied'));
          return;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
        }

        // Enable network provider
        await Location.enableNetworkProviderAsync();

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_INTERVAL,
        });

        const currentLocation: LocationType = {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          accuracy: initialLocation.coords.accuracy,
          altitude: initialLocation.coords.altitude || 0,
          speed: initialLocation.coords.speed || 0,
          heading: initialLocation.coords.heading || 0,
        };

        dispatch(setCurrentLocation(currentLocation));
        lastLocation.current = initialLocation;

        // Watch location
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: LOCATION_UPDATE_INTERVAL,
            distanceInterval: LOCATION_DISTANCE_INTERVAL,
          },
          location => {
            // Only update if location has changed significantly
            if (
              !lastLocation.current ||
              location.coords.latitude !== lastLocation.current.coords.latitude ||
              location.coords.longitude !== lastLocation.current.coords.longitude ||
              Math.abs((location.coords.speed || 0) - (lastLocation.current.coords.speed || 0)) >
                0.5 ||
              Math.abs(
                (location.coords.heading || 0) - (lastLocation.current.coords.heading || 0)
              ) > 5
            ) {
              const updatedLocation: LocationType = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude || 0,
                speed: location.coords.speed || 0,
                heading: location.coords.heading || 0,
              };
              dispatch(setCurrentLocation(updatedLocation));
              lastLocation.current = location;
            }
          }
        );

        // Watch heading
        headingSubscription.current = await Location.watchHeadingAsync(heading => {
          if (heading.trueHeading !== null) {
            dispatch(setHeading(heading.trueHeading));
          }
        });
      } catch (error) {
        dispatch(setError('Error getting location'));
        console.error('Location error:', error);
      }
    };

    setupLocation();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, [dispatch, withErrorHandling]);

  return {
    locationPermission: true, // We know it's true if we get here
  };
};
