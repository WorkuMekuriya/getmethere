import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Alert, Text, ScrollView, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { Map } from '@/components/Map';
import { NavigationInstructions } from '@/components/NavigationInstructions';
import { SearchBar } from '@/components/SearchBar';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useLocation } from '@/hooks/useLocation';
import { getDirections } from '@/services/navigationService';
import { RootState } from '@/store';
import { Location, Waypoint } from '@/types/navigation';
import {
  setRoute,
  setError,
  setLoading,
  setAlternativeRoutes,
  updateEta,
  removeWaypoint,
  addWaypoint,
  setNavigationCardVisible,
  setCardState,
  setVoiceEnabled,
} from '@/store/navigationSlice';
import { styles } from './NavigationScreen.styles';

const CACHE_KEY = '@navigation_route_cache';

export const NavigationScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { withErrorHandling } = useErrorHandler();
  const etaUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  
  const {
    currentLocation,
    waypoints,
    loading,
    error,
    route,
    currentEta,
    voiceEnabled,
  } = useSelector((state: RootState) => state.navigation);

  const { locationPermission } = useLocation();

  const handleLocationSelect = (location: Location, name: string) => {
    const waypoint: Waypoint = {
      location,
      name,
      order: waypoints.length,
    };
    dispatch(addWaypoint(waypoint));
  };

  const handleRetry = () => {
    dispatch(setError(null));
    if (currentLocation && waypoints.length > 0) {
      fetchRoute();
    }
  };

  const fetchRoute = async () => {
    if (!currentLocation || waypoints.length === 0) return;

    dispatch(setLoading(true));
    try {
      console.log('[NavigationScreen] Fetching routes...');
      const [mainRoute, ...alternatives] = await getDirections(
        currentLocation,
        waypoints.map(wp => wp.location),
        true
      );

      if (!mainRoute?.polyline || !mainRoute?.steps) {
        throw new Error('Invalid main route data');
      }

      dispatch(setRoute(mainRoute));
      
      if (alternatives.length > 0) {
        const validAlternatives = alternatives.filter(route => 
          route?.polyline && route?.steps
        );
        console.log('[NavigationScreen] Setting valid alternatives:', validAlternatives.length);
        dispatch(setAlternativeRoutes(validAlternatives));
      }

      dispatch(setNavigationCardVisible(true));
      dispatch(setCardState('expanded'));

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          route: mainRoute,
          alternativeRoutes: alternatives,
          timestamp: Date.now(),
          waypoints,
        })
      );

      console.log('[NavigationScreen] Route fetch complete:', {
        hasRoute: !!mainRoute,
        alternativesCount: alternatives.length,
        cardState: 'expanded'
      });

    } catch (error) {
      console.error('[NavigationScreen] Route fetch error:', error);
      dispatch(setError('Failed to fetch route. Please try again.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Load cached route on mount
  useEffect(() => {
    const loadCachedRoute = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { route, alternativeRoutes, timestamp, waypoints: cachedWaypoints } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;

          if (cacheAge < 3600000 && JSON.stringify(cachedWaypoints) === JSON.stringify(waypoints)) {
            dispatch(setRoute(route));
            if (alternativeRoutes) {
              dispatch(setAlternativeRoutes(alternativeRoutes));
            }
          } else {
            await AsyncStorage.removeItem(CACHE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading cached route:', error);
      }
    };

    loadCachedRoute();
  }, [dispatch, waypoints]);

  // Fetch route when location or waypoints change
  useEffect(() => {
    const fetchRoute = async () => {
      if (!currentLocation || waypoints.length === 0) return;

      await withErrorHandling(async () => {
        dispatch(setLoading(true));
        dispatch(setError(null));

        const routes = await getDirections(
          currentLocation,
          waypoints.map(wp => wp.location),
          true
        );

        if (!routes || routes.length === 0) {
          throw new Error('No routes found');
        }

        try {
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              route: routes[0],
              alternativeRoutes: routes.slice(1),
              waypoints,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error('Error caching route:', error);
        }

        dispatch(setRoute(routes[0]));
        if (routes.length > 1) {
          dispatch(setAlternativeRoutes(routes.slice(1)));
        }
      }, 'Error fetching route');
    };

    fetchRoute();
  }, [currentLocation, waypoints, dispatch, withErrorHandling]);

  // Set up ETA updates
  useEffect(() => {
    if (route && currentLocation) {
      dispatch(updateEta());

      etaUpdateInterval.current = setInterval(() => {
        dispatch(updateEta());
      }, 30000);

      return () => {
        if (etaUpdateInterval.current) {
          clearInterval(etaUpdateInterval.current);
        }
      };
    }
  }, [route, currentLocation, dispatch]);

  // Update ETA when speed changes
  useEffect(() => {
    if (route && currentLocation) {
      dispatch(updateEta());
    }
  }, [currentLocation?.speed, route, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleVoiceToggle = () => {
    dispatch(setVoiceEnabled(!voiceEnabled));
  };

  if (!locationPermission) {
    return (
      <View style={[styles.container, styles.centerContent]} testID="navigation-screen">
        <Text style={styles.permissionText}>
          Location permission is required to use navigation features.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="navigation-screen">
      <Map testID="map" mapRef={mapRef} />
      <SearchBar testID="search-bar" />
      
      {waypoints.length > 0 && (
        <View style={styles.waypointsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.waypointsScrollContent}
          >
            {waypoints.map((waypoint, index) => (
              <TouchableOpacity
                key={index}
                style={styles.waypointItem}
                onPress={() => {
                  if (mapRef.current) {
                    mapRef.current.animateToRegion({
                      latitude: waypoint.location.latitude,
                      longitude: waypoint.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                  }
                }}
              >
                <View style={styles.waypointNumber}>
                  <Text style={styles.waypointNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.waypointName} numberOfLines={1}>
                  {waypoint.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeWaypointButton}
                  onPress={() => dispatch(removeWaypoint(index))}
                >
                  <Ionicons name="close-circle" size={20} color="#666666" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentLocation && waypoints.length > 0 && (
        <>
          {currentEta && (
            <View
              style={[styles.etaContainer, currentEta.isOffRoute && styles.etaContainerOffRoute]}
            >
              <View style={styles.etaContent}>
                <Text style={[styles.etaText, currentEta.isOffRoute && styles.etaTextOffRoute]}>
                  {currentEta.text}
                </Text>
                {currentEta.isOffRoute && (
                  <Text style={styles.offRouteText}>
                    Off route - {Math.round(currentEta.distanceToRoute)}m to route
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleVoiceToggle}
                style={styles.voiceButton}
                testID="voice-toggle"
              >
                <Ionicons
                  name={voiceEnabled ? 'volume-high' : 'volume-mute'}
                  size={24}
                  color={voiceEnabled ? '#1a73e8' : '#666'}
                />
              </TouchableOpacity>
            </View>
          )}
          <NavigationInstructions />
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a73e8" />
            </View>
          )}
        </>
      )}
    </View>
  );
};
