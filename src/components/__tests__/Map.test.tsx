import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';

import { Map } from '@/components/Map';
import navigationReducer, { NavigationState } from '@/store/navigationSlice';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Polyline: View,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock expo-vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Map', () => {
  let store: ReturnType<typeof configureStore>;

  const initialState: NavigationState = {
    currentLocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: 0,
      speed: 0,
      heading: 0,
    },
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
    updateFrequency: 'normal' as const,
    isNavigating: false,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: initialState,
      },
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('renders correctly with initial state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    expect(getByTestId('map')).toBeTruthy();
  });

  it('renders user marker when location is available', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    expect(getByTestId('user-marker')).toBeTruthy();
  });

  it('renders destination marker when destination is set', () => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: {
          ...store.getState().navigation,
          destination: {
            location: {
              latitude: 34.0522,
              longitude: -118.2437,
            },
            name: 'Los Angeles',
          },
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    expect(getByTestId('destination-marker')).toBeTruthy();
  });

  it('renders route when route is available', () => {
    const stateWithRoute: NavigationState = {
      ...initialState,
      route: {
        distance: { text: '100 mi', value: 160934 },
        duration: { text: '2 hours', value: 7200 },
        steps: [],
        polyline: 'mockPolyline',
      },
    };

    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: stateWithRoute,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    expect(getByTestId('route-polyline')).toBeTruthy();
  });

  it('handles map press events', () => {
    const onMapPress = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map onMapPress={onMapPress} />, { wrapper });
    fireEvent.press(getByTestId('map-view'), {
      nativeEvent: {
        coordinate: {
          latitude: 37.7848,
          longitude: -122.4294,
        },
      },
    });

    expect(onMapPress).toHaveBeenCalledWith({
      latitude: 37.7848,
      longitude: -122.4294,
    });
  });

  it('handles compass mode toggle', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    const compassButton = getByTestId('compass-button');

    fireEvent.press(compassButton);
    expect(getByTestId('compass-button')).toHaveStyle({ backgroundColor: '#E8F0FE' });

    fireEvent.press(compassButton);
    expect(getByTestId('compass-button')).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('handles map type changes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    const layerButton = getByTestId('layer-button');

    fireEvent.press(layerButton);
    expect(getByTestId('map-type-menu')).toBeTruthy();

    const satelliteOption = getByTestId('map-type-satellite');
    fireEvent.press(satelliteOption);
    expect(getByTestId('map-view')).toHaveProp('mapType', 'satellite');
  });

  it('renders waypoint markers when waypoints are set', () => {
    const stateWithWaypoints: NavigationState = {
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
    };

    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: stateWithWaypoints,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId } = render(<Map />, { wrapper });
    expect(getByTestId('waypoint-marker-0')).toBeTruthy();
  });
});
