import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';

import { NavigationScreen } from '../NavigationScreen';

import { getDirections } from '@/services/navigationService';
import navigationReducer, { NavigationState } from '@/store/navigationSlice';

// Mock the navigation service
jest.mock('@/services/navigationService', () => ({
  getDirections: jest.fn(),
  getPlaceDetails: jest.fn(),
  getPlaceSuggestions: jest.fn(),
}));

describe('NavigationScreen', () => {
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

    const { getByTestId } = render(<NavigationScreen />, { wrapper });
    expect(getByTestId('navigation-screen')).toBeTruthy();
    expect(getByTestId('map')).toBeTruthy();
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  it('shows permission message when location permission is denied', () => {
    const stateWithoutLocation: NavigationState = {
      ...initialState,
      currentLocation: null,
    };

    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: stateWithoutLocation,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByText } = render(<NavigationScreen />, { wrapper });
    expect(getByText('Location permission is required to use navigation features.')).toBeTruthy();
  });

  it('fetches and displays route when waypoints are set', async () => {
    const mockRoute = {
      distance: { text: '100 mi', value: 160934 },
      duration: { text: '2 hours', value: 7200 },
      steps: [],
      polyline: 'mockPolyline',
    };

    (getDirections as jest.Mock).mockResolvedValueOnce([mockRoute]);

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

    const { getByTestId } = render(<NavigationScreen />, { wrapper });

    await waitFor(() => {
      expect(getDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
        }),
        [
          expect.objectContaining({
            latitude: 34.0522,
            longitude: -118.2437,
          }),
        ],
        true
      );
    });

    expect(getByTestId('route-selector')).toBeTruthy();
  });

  it('loads cached route on mount', async () => {
    const mockCachedRoute = {
      route: {
        distance: { text: '100 mi', value: 160934 },
        duration: { text: '2 hours', value: 7200 },
        steps: [],
        polyline: 'mockPolyline',
      },
      alternativeRoutes: [],
      timestamp: Date.now(),
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockCachedRoute));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    render(<NavigationScreen />, { wrapper });

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@navigation_route_cache');
    });

    const state = store.getState().navigation;
    expect(state.route).toEqual(mockCachedRoute.route);
  });

  it('handles route fetching errors', async () => {
    const errorMessage = 'Failed to fetch route';
    (getDirections as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

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

    const { getByText } = render(<NavigationScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  it('shows loading indicator while fetching route', async () => {
    (getDirections as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

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
      loading: true,
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

    const { getByTestId } = render(<NavigationScreen />, { wrapper });
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
