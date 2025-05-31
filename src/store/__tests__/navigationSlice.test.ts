import { NavigationState } from '@/store/navigationSlice';
import navigationReducer, {
  addWaypoint,
  clearWaypoints,
  removeWaypoint,
  setCurrentLocation,
  setError,
  setLoading,
  setRoute,
  setSelectedRoute,
  updateWaypointOrder,
} from '@/store/navigationSlice';

describe('navigationSlice', () => {
  let initialState: NavigationState;

  beforeEach(() => {
    initialState = {
      currentLocation: null,
      waypoints: [],
      route: null,
      alternativeRoutes: null,
      selectedRouteIndex: 0,
      loading: false,
      error: null,
      heading: 0,
      speed: 0,
      currentEta: null,
      lastEtaUpdate: 0,
      voiceEnabled: true,
      updateFrequency: 'normal',
      isNavigating: false,
    };
  });

  it('should handle initial state', () => {
    expect(navigationReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setCurrentLocation', () => {
    const location = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: 0,
      speed: 0,
      heading: 0,
    };

    const nextState = navigationReducer(initialState, setCurrentLocation(location));
    expect(nextState.currentLocation).toEqual(location);
  });

  it('should handle addWaypoint', () => {
    const waypoint = {
      location: {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 0,
        altitude: null,
        speed: null,
        heading: null,
      },
      name: 'Los Angeles',
      order: 0,
    };

    const nextState = navigationReducer(initialState, addWaypoint(waypoint));
    expect(nextState.waypoints).toEqual([waypoint]);

    // Add another waypoint
    const secondWaypoint = {
      ...waypoint,
      location: {
        ...waypoint.location,
        latitude: 40.7128,
        longitude: -74.0060,
      },
      name: 'New York',
      order: 1,
    };

    const finalState = navigationReducer(nextState, addWaypoint(secondWaypoint));
    expect(finalState.waypoints).toEqual([waypoint, secondWaypoint]);
  });

  it('should handle removeWaypoint', () => {
    const waypoints = [
      {
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 0,
          altitude: null,
          speed: null,
          heading: null,
        },
        name: 'Los Angeles',
        order: 0,
      },
      {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 0,
          altitude: null,
          speed: null,
          heading: null,
        },
        name: 'New York',
        order: 1,
      },
    ];

    const state = {
      ...initialState,
      waypoints,
    };

    const nextState = navigationReducer(state, removeWaypoint(0));
    expect(nextState.waypoints).toEqual([waypoints[1]]);
    expect(nextState.route).toBeNull();
  });

  it('should handle updateWaypointOrder', () => {
    const waypoints = [
      {
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 0,
          altitude: null,
          speed: null,
          heading: null,
        },
        name: 'Los Angeles',
        order: 0,
      },
      {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 0,
          altitude: null,
          speed: null,
          heading: null,
        },
        name: 'New York',
        order: 1,
      },
    ];

    const state = {
      ...initialState,
      waypoints,
    };

    const nextState = navigationReducer(state, updateWaypointOrder({ from: 0, to: 1 }));
    expect(nextState.waypoints).toEqual([
      { ...waypoints[1], order: 0 },
      { ...waypoints[0], order: 1 },
    ]);
    expect(nextState.route).toBeNull();
  });

  it('should handle clearWaypoints', () => {
    const state = {
      ...initialState,
      waypoints: [
        {
          location: {
            latitude: 34.0522,
            longitude: -118.2437,
            accuracy: 0,
            altitude: null,
            speed: null,
            heading: null,
          },
          name: 'Los Angeles',
          order: 0,
        },
      ],
      route: { distance: { text: '100 mi', value: 160934 }, duration: { text: '2 hours', value: 7200 }, steps: [], polyline: 'mockPolyline' },
    };

    const nextState = navigationReducer(state, clearWaypoints());
    expect(nextState.waypoints).toEqual([]);
    expect(nextState.route).toBeNull();
  });

  it('should handle setRoute', () => {
    const route = {
      distance: { text: '100 mi', value: 160934 },
      duration: { text: '2 hours', value: 7200 },
      steps: [],
      polyline: 'mockPolyline',
    };

    const nextState = navigationReducer(initialState, setRoute(route));
    expect(nextState.route).toEqual(route);
    expect(nextState.loading).toBe(false);
    expect(nextState.error).toBeNull();
  });

  it('should handle setSelectedRoute', () => {
    const nextState = navigationReducer(initialState, setSelectedRoute(1));
    expect(nextState.selectedRouteIndex).toBe(1);
  });

  it('should handle setLoading', () => {
    const nextState = navigationReducer(initialState, setLoading(true));
    expect(nextState.loading).toBe(true);
  });

  it('should handle setError', () => {
    const error = 'Failed to fetch route';
    const nextState = navigationReducer(initialState, setError(error));
    expect(nextState.error).toBe(error);
    expect(nextState.loading).toBe(false);
  });
}); 