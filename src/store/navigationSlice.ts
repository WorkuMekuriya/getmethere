import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { decodePolyline } from '@/services/navigationService';
import { Location, Route, Waypoint } from '@/types/navigation';

export interface NavigationState {
  currentLocation: Location | null;
  waypoints: Waypoint[];
  route: Route | null;
  alternativeRoutes: Route[] | null;
  selectedRouteIndex: number;
  loading: boolean;
  error: string | null;
  heading: number | null;
  speed: number | null;
  currentEta: {
    timestamp: number;
    text: string;
    value: number;
    trafficDelay?: number;
    isOffRoute: boolean;
    distanceToRoute: number;
    lastVoiceAnnouncement?: number;
  } | null;
  lastEtaUpdate: number;
  voiceEnabled: boolean;
  updateFrequency: 'normal' | 'frequent';
  isNavigating: boolean;
  isNavigationCardVisible: boolean;
  cardState: 'hidden' | 'minimized' | 'expanded';
  lastRouteSwitch: number;
}

interface EtaState {
  timestamp: number;
  text: string;
  value: number;
  trafficDelay?: number;
  isOffRoute: boolean;
  distanceToRoute: number;
  lastVoiceAnnouncement?: number;
}

const OFF_ROUTE_THRESHOLD = 100; // meters
const FREQUENT_UPDATE_DISTANCE = 5000; // meters
const VOICE_ANNOUNCEMENT_INTERVAL = 60000; // 1 minute
const TRAFFIC_UPDATE_INTERVAL = 300000; // 5 minutes
const ROUTE_SWITCH_DEBOUNCE = 500; // milliseconds

const initialState: NavigationState = {
  currentLocation: null,
  waypoints: [],
  route: null,
  alternativeRoutes: null,
  selectedRouteIndex: 0,
  loading: false,
  error: null,
  heading: null,
  speed: null,
  currentEta: null,
  lastEtaUpdate: 0,
  voiceEnabled: true,
  updateFrequency: 'normal',
  isNavigating: false,
  isNavigationCardVisible: true,
  cardState: 'hidden',
  lastRouteSwitch: 0,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentLocation: (state, action: PayloadAction<Location>) => {
      state.currentLocation = action.payload;
    },
    addWaypoint: (state, action: PayloadAction<Waypoint>) => {
      state.waypoints.push(action.payload);
      // Sort waypoints by order
      state.waypoints.sort((a, b) => a.order - b.order);
      // Don't automatically show navigation card when waypoint is added
      // This allows the map to render the route immediately
    },
    removeWaypoint: (state, action: PayloadAction<number>) => {
      state.waypoints = state.waypoints.filter(wp => wp.order !== action.payload);
      // Reorder remaining waypoints
      state.waypoints = state.waypoints.map((wp, index) => ({
        ...wp,
        order: index,
      }));
      // Clear route if no waypoints left
      if (state.waypoints.length === 0) {
        state.route = null;
        state.alternativeRoutes = null;
        state.selectedRouteIndex = 0;
      }
    },
    updateWaypointOrder: (state, action: PayloadAction<{ from: number; to: number }>) => {
      const { from, to } = action.payload;
      const waypoints = [...state.waypoints];
      const [movedWaypoint] = waypoints.splice(from, 1);
      waypoints.splice(to, 0, movedWaypoint);
      // Update order for all waypoints
      state.waypoints = waypoints.map((wp, index) => ({
        ...wp,
        order: index,
      }));
    },
    clearWaypoints: (state) => {
      state.waypoints = [];
      state.route = null;
      state.alternativeRoutes = null;
      state.selectedRouteIndex = 0;
    },
    setRoute: (state, action: PayloadAction<Route>) => {
      console.log('[NavigationSlice] Setting route:', {
        hasRoute: !!action.payload,
        currentCardState: state.cardState,
        currentVisibility: state.isNavigationCardVisible
      });

      state.route = action.payload;
      state.selectedRouteIndex = 0;
      
      // If we have a valid route, make sure the card is visible and expanded
      if (action.payload?.polyline && action.payload?.steps) {
        state.isNavigationCardVisible = true;
        state.cardState = 'expanded';
        console.log('[NavigationSlice] Updated card state for new route:', {
          newCardState: 'expanded',
          newVisibility: true
        });
      }
    },
    setAlternativeRoutes: (state, action: PayloadAction<Route[]>) => {
      state.alternativeRoutes = action.payload;
      // Don't automatically show navigation card when alternative routes are set
    },
    setSelectedRoute: (state, action: PayloadAction<number>) => {
      console.log('[NavigationSlice] setSelectedRoute called:', {
        payload: action.payload,
        currentState: {
          selectedRouteIndex: state.selectedRouteIndex,
          hasRoute: !!state.route,
          alternativeRoutesCount: state.alternativeRoutes?.length ?? 0,
          timestamp: new Date().toISOString()
        }
      });

      try {
        const index = Number(action.payload);
        
        // Basic validation
        if (isNaN(index) || index < 0) {
          console.error('[NavigationSlice] Invalid route index:', {
            index,
            type: typeof index,
            payload: action.payload
          });
          return;
        }

        // Get all available routes
        const routes = state.alternativeRoutes 
          ? [state.route, ...state.alternativeRoutes].filter(Boolean)
          : state.route 
            ? [state.route]
            : [];

        console.log('[NavigationSlice] Available routes:', {
          totalRoutes: routes.length,
          routesData: routes.map(r => ({
            hasPolyline: !!r?.polyline,
            hasSteps: !!r?.steps,
            distance: r?.distance?.text,
            duration: r?.duration?.text
          }))
        });

        // Validate routes array
        if (!routes.length) {
          console.error('[NavigationSlice] No valid routes available');
          return;
        }

        // Validate index bounds
        if (index >= routes.length) {
          console.error('[NavigationSlice] Route index out of bounds:', { 
            index, 
            totalRoutes: routes.length,
            currentIndex: state.selectedRouteIndex
          });
          return;
        }

        const selectedRoute = routes[index];
        
        // Validate selected route
        if (!selectedRoute) {
          console.error('[NavigationSlice] Selected route is undefined:', { 
            index, 
            totalRoutes: routes.length,
            routes: routes.map(r => ({
              hasPolyline: !!r?.polyline,
              hasSteps: !!r?.steps
            }))
          });
          return;
        }

        // Validate route data structure
        if (!selectedRoute.polyline || !selectedRoute.steps) {
          console.error('[NavigationSlice] Invalid route data:', {
            index,
            hasPolyline: !!selectedRoute.polyline,
            hasSteps: !!selectedRoute.steps,
            routeData: selectedRoute
          });
          return;
        }

        // Validate route metrics
        if (!selectedRoute.distance?.text || !selectedRoute.duration?.text) {
          console.error('[NavigationSlice] Invalid route metrics:', {
            index,
            hasDistance: !!selectedRoute.distance?.text,
            hasDuration: !!selectedRoute.duration?.text,
            routeData: selectedRoute
          });
          return;
        }

        console.log('[NavigationSlice] Updating selected route:', {
          fromIndex: state.selectedRouteIndex,
          toIndex: index,
          routeData: {
            hasPolyline: !!selectedRoute.polyline,
            hasSteps: !!selectedRoute.steps,
            distance: selectedRoute.distance.text,
            duration: selectedRoute.duration.text
          }
        });

        // All validations passed, update the state
        state.selectedRouteIndex = index;
        state.lastRouteSwitch = Date.now();

        console.log('[NavigationSlice] Route update successful');

      } catch (error) {
        console.error('[NavigationSlice] Error in setSelectedRoute:', error);
        // Don't update state if there's an error
        return;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setHeading: (state, action: PayloadAction<number | null>) => {
      state.heading = action.payload;
    },
    setSpeed: (state, action: PayloadAction<number | null>) => {
      state.speed = action.payload;
    },
    clearNavigation: state => {
      state.waypoints = [];
      state.route = null;
      state.alternativeRoutes = null;
      state.selectedRouteIndex = 0;
      state.error = null;
    },
    setCurrentEta: (state, action: PayloadAction<EtaState>) => {
      state.currentEta = action.payload;
      state.lastEtaUpdate = Date.now();
    },
    setVoiceEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceEnabled = action.payload;
    },
    setUpdateFrequency: (state, action: PayloadAction<'normal' | 'frequent'>) => {
      state.updateFrequency = action.payload;
    },
    updateEta: state => {
      if (!state.route || !state.currentLocation || !state.speed) {
        return;
      }

      const now = Date.now();
      const updateInterval = state.updateFrequency === 'frequent' ? 10000 : 30000;

      // Check if it's time to update
      if (now - state.lastEtaUpdate < updateInterval) {
        return;
      }

      // Calculate remaining distance and check if off route
      const routeStatus = calculateRouteStatus(state.currentLocation, state.route.polyline);

      if (!routeStatus) {
        return;
      }

      const { remainingDistance, isOffRoute, distanceToRoute } = routeStatus;

      // Update frequency based on remaining distance
      if (remainingDistance < FREQUENT_UPDATE_DISTANCE) {
        state.updateFrequency = 'frequent';
      }

      // Calculate new ETA based on current speed and traffic
      const speedMph = state.speed * 2.237; // Convert m/s to mph
      const baseTimeSeconds = (remainingDistance / speedMph) * 3600;

      // Get traffic delay (mock implementation - replace with real traffic API)
      const trafficDelay = getTrafficDelay(remainingDistance, now);

      const totalTimeSeconds = baseTimeSeconds + (trafficDelay || 0);
      const etaTimestamp = now + totalTimeSeconds * 1000;

      const newEta: EtaState = {
        timestamp: etaTimestamp,
        text: formatEta(etaTimestamp, trafficDelay),
        value: totalTimeSeconds,
        trafficDelay,
        isOffRoute: Boolean(isOffRoute),
        distanceToRoute,
        lastVoiceAnnouncement: state.currentEta?.lastVoiceAnnouncement,
      };

      // Handle voice announcements
      if (state.voiceEnabled && shouldAnnounceEta(state.currentEta, newEta)) {
        announceEta(newEta, newEta.isOffRoute);
        newEta.lastVoiceAnnouncement = now;
      }

      state.currentEta = newEta;
      state.lastEtaUpdate = now;
    },
    setNavigationCardVisible: (state, action: PayloadAction<boolean>) => {
      console.log('[NavigationSlice] Setting navigation card visible:', {
        newValue: action.payload,
        currentState: {
          isNavigationCardVisible: state.isNavigationCardVisible,
          cardState: state.cardState,
          hasWaypoints: state.waypoints.length > 0,
          hasRoute: !!state.route
        }
      });
      state.isNavigationCardVisible = action.payload;
      // Only update card state if explicitly requested
      if (action.payload) {
        state.cardState = 'expanded';
      } else {
        state.cardState = 'hidden';
      }
    },
    setCardState: (state, action: PayloadAction<'hidden' | 'minimized' | 'expanded'>) => {
      console.log('[NavigationSlice] Setting card state:', {
        newState: action.payload,
        currentState: {
          isNavigationCardVisible: state.isNavigationCardVisible,
          cardState: state.cardState,
          hasWaypoints: state.waypoints.length > 0,
          hasRoute: !!state.route
        }
      });
      state.cardState = action.payload;
      // Only update visibility if explicitly hidden
      state.isNavigationCardVisible = action.payload !== 'hidden';
    },
  },
});

// Helper function to calculate route status
const calculateRouteStatus = (
  currentLocation: Location,
  polyline: string
): { remainingDistance: number; isOffRoute: boolean; distanceToRoute: number } | null => {
  try {
    const coordinates = decodePolyline(polyline);
    if (coordinates.length < 2) return null;

    // Find the closest point on the route
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < coordinates.length; i++) {
      const distance = getDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        coordinates[i].latitude,
        coordinates[i].longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Calculate remaining distance along the route
    let remainingDistance = 0;
    for (let i = closestIndex; i < coordinates.length - 1; i++) {
      remainingDistance += getDistance(
        coordinates[i].latitude,
        coordinates[i].longitude,
        coordinates[i + 1].latitude,
        coordinates[i + 1].longitude
      );
    }

    const isOffRoute = minDistance > OFF_ROUTE_THRESHOLD;
    return {
      remainingDistance,
      isOffRoute,
      distanceToRoute: minDistance,
    };
  } catch (error) {
    console.error('Error calculating route status:', error);
    return null;
  }
};

// Helper function to get traffic delay (mock implementation)
const getTrafficDelay = (distance: number, timestamp: number): number => {
  // This is a mock implementation. Replace with real traffic API
  const hour = new Date(timestamp).getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);

  if (isRushHour) {
    // Add 20% delay during rush hour
    return (distance * 0.2) / 50; // 50 m/s is average speed
  }
  return 0;
};

// Helper function to format ETA with traffic information
const formatEta = (timestamp: number, trafficDelay?: number): string => {
  const now = Date.now();
  const diff = timestamp - now;
  const minutes = Math.round(diff / 60000);

  let etaText = '';
  if (minutes < 1) {
    etaText = 'Arriving now';
  } else if (minutes < 60) {
    etaText = `Arriving in ${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    etaText = `Arriving in ${hours}h ${remainingMinutes}m`;
  }

  if (trafficDelay && trafficDelay > 300) {
    // More than 5 minutes delay
    const delayMinutes = Math.round(trafficDelay / 60);
    etaText += ` (${delayMinutes} min delay due to traffic)`;
  }

  return etaText;
};

// Helper function to determine if ETA should be announced
const shouldAnnounceEta = (currentEta: EtaState | null, newEta: EtaState): boolean => {
  if (!currentEta) return true;

  const now = Date.now();
  if (now - (currentEta.lastVoiceAnnouncement || 0) < VOICE_ANNOUNCEMENT_INTERVAL) {
    return false;
  }

  // Announce if:
  // 1. ETA changed by more than 5 minutes
  // 2. User went off route
  // 3. Traffic delay changed significantly
  const etaChanged = Math.abs(currentEta.value - newEta.value) > 300;
  const wentOffRoute = !currentEta.isOffRoute && Boolean(newEta.isOffRoute);
  const trafficChanged = Boolean(
    currentEta.trafficDelay &&
    newEta.trafficDelay &&
    Math.abs(currentEta.trafficDelay - newEta.trafficDelay) > 300
  );

  return etaChanged || wentOffRoute || trafficChanged;
};

// Helper function to announce ETA
const announceEta = (eta: EtaState, isOffRoute: boolean) => {
  let announcement = '';
  if (isOffRoute) {
    announcement = 'You have gone off route. Please return to the suggested route.';
  } else {
    const minutes = Math.round(eta.value / 60);
    if (minutes < 1) {
      announcement = 'You have arrived at your destination.';
    } else if (minutes < 60) {
      announcement = `You will arrive in ${minutes} minutes.`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      announcement = `You will arrive in ${hours} hours and ${remainingMinutes} minutes.`;
    }

    if (eta.trafficDelay && eta.trafficDelay > 300) {
      const delayMinutes = Math.round(eta.trafficDelay / 60);
      announcement += ` There is a ${delayMinutes} minute delay due to traffic.`;
    }
  }

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Speech.speak(announcement, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
    });
  }
};

// Helper function to calculate distance between two points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const {
  setCurrentLocation,
  addWaypoint,
  removeWaypoint,
  updateWaypointOrder,
  clearWaypoints,
  setRoute,
  setAlternativeRoutes,
  setSelectedRoute,
  setLoading,
  setError,
  setHeading,
  setSpeed,
  clearNavigation,
  setCurrentEta,
  setVoiceEnabled,
  setUpdateFrequency,
  updateEta,
  setNavigationCardVisible,
  setCardState,
} = navigationSlice.actions;

export default navigationSlice.reducer;
