import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';

import { RouteSelector } from '../RouteSelector';

import navigationReducer from '@/store/navigationSlice';

describe('RouteSelector', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: {
          currentLocation: null,
          destination: null,
          route: {
            distance: { text: '100 mi', value: 160934 },
            duration: { text: '2 hours', value: 7200 },
            steps: [],
            polyline: 'mockPolyline',
          },
          alternativeRoutes: [
            {
              distance: { text: '90 mi', value: 144840 },
              duration: { text: '1.5 hours', value: 5400 },
              steps: [],
              polyline: 'mockPolyline2',
            },
            {
              distance: { text: '110 mi', value: 177027 },
              duration: { text: '2.5 hours', value: 9000 },
              steps: [],
              polyline: 'mockPolyline3',
            },
          ],
          selectedRouteIndex: 0,
          loading: false,
          error: null,
          heading: 0,
          speed: 0,
        },
      },
    });
  });

  it('renders correctly with routes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByTestId, getByText } = render(<RouteSelector />, { wrapper });
    expect(getByTestId('route-selector')).toBeTruthy();
    expect(getByText('Fastest')).toBeTruthy();
    expect(getByText('Shortest')).toBeTruthy();
    expect(getByText('Scenic')).toBeTruthy();
  });

  it('does not render when no alternative routes', () => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: {
          ...store.getState().navigation,
          alternativeRoutes: null,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { queryByTestId } = render(<RouteSelector />, { wrapper });
    expect(queryByTestId('route-selector')).toBeNull();
  });

  it('handles route selection', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByText } = render(<RouteSelector />, { wrapper });
    const shortestRoute = getByText('Shortest');

    fireEvent.press(shortestRoute);

    const state = store.getState().navigation;
    expect(state.selectedRouteIndex).toBe(1);
  });

  it('displays route information correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByText } = render(<RouteSelector />, { wrapper });

    // Check fastest route info
    expect(getByText('100 mi • 2 hours')).toBeTruthy();

    // Check shortest route info
    expect(getByText('90 mi • 1.5 hours')).toBeTruthy();

    // Check scenic route info
    expect(getByText('110 mi • 2.5 hours')).toBeTruthy();
  });

  it('highlights selected route', () => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
      preloadedState: {
        navigation: {
          ...store.getState().navigation,
          selectedRouteIndex: 1,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { getByText } = render(<RouteSelector />, { wrapper });
    const shortestRoute = getByText('Shortest');

    expect(shortestRoute.parent?.parent).toHaveStyle({ backgroundColor: '#E8F0FE' });
  });
});
