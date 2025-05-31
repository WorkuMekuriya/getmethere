import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import React from 'react';
import { Provider } from 'react-redux';

import { useLocation } from '../useLocation';

import navigationReducer from '@/store/navigationSlice';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(),
}));

describe('useLocation', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
    });

    // Mock location permissions
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Mock initial location
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: 0,
        speed: 0,
        heading: 0,
      },
    });

    // Mock location updates
    const mockWatchCallback = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockImplementation((_, callback) => {
      mockWatchCallback.mockImplementation(callback);
      return {
        remove: jest.fn(),
      };
    });

    // Mock heading updates
    (Location.watchHeadingAsync as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  it('should request location permissions and get initial location', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useLocation(), { wrapper });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 10,
    });

    const state = store.getState().navigation;
    expect(state.currentLocation).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: 0,
      speed: 0,
      heading: 0,
    });
  });

  it('should handle location permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const state = store.getState().navigation;
    expect(state.error).toBe('Location permission denied');
    expect(result.current.locationPermission).toBe(false);
  });

  it('should update location when watching position', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useLocation(), { wrapper });

    // Wait for initial setup
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Simulate location update
    const mockLocation = {
      coords: {
        latitude: 37.7848,
        longitude: -122.4294,
        accuracy: 5,
        altitude: 10,
        speed: 5,
        heading: 90,
      },
    };

    await act(async () => {
      const watchCallback = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1];
      await watchCallback(mockLocation);
    });

    const state = store.getState().navigation;
    expect(state.currentLocation).toEqual({
      latitude: 37.7848,
      longitude: -122.4294,
      accuracy: 5,
      altitude: 10,
      speed: 5,
      heading: 90,
    });
  });

  it('should handle location errors', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('Location error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const state = store.getState().navigation;
    expect(state.error).toBe('Error getting location');
  });
});
