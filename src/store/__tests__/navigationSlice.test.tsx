import { configureStore } from '@reduxjs/toolkit';
import * as Speech from 'expo-speech';

import navigationReducer, {
  setCurrentLocation,
  setDestination,
  setRoute,
  updateEta,
  setVoiceEnabled,
} from '../navigationSlice';

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
}));

describe('navigationSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        navigation: navigationReducer,
      },
    });
    jest.clearAllMocks();
  });

  // ... existing tests ...

  describe('voice guidance', () => {
    it('announces ETA when voice is enabled', () => {
      // Set up initial state
      store.dispatch(
        setCurrentLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          speed: 10,
          heading: 0,
        })
      );

      store.dispatch(
        setRoute({
          distance: { text: '10 mi', value: 16093 },
          duration: { text: '20 min', value: 1200 },
          steps: [],
          polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        })
      );

      // Enable voice
      store.dispatch(setVoiceEnabled(true));

      // Update ETA
      store.dispatch(updateEta());

      // Check if speech was called
      expect(Speech.speak).toHaveBeenCalled();
      const announcement = (Speech.speak as jest.Mock).mock.calls[0][0];
      expect(announcement).toContain('You will arrive in');
    });

    it('does not announce when voice is disabled', () => {
      // Set up initial state
      store.dispatch(
        setCurrentLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          speed: 10,
          heading: 0,
        })
      );

      store.dispatch(
        setRoute({
          distance: { text: '10 mi', value: 16093 },
          duration: { text: '20 min', value: 1200 },
          steps: [],
          polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        })
      );

      // Disable voice
      store.dispatch(setVoiceEnabled(false));

      // Update ETA
      store.dispatch(updateEta());

      // Check that speech was not called
      expect(Speech.speak).not.toHaveBeenCalled();
    });

    it('announces off-route status', () => {
      // Set up initial state with location far from route
      store.dispatch(
        setCurrentLocation({
          latitude: 38.7749, // Far from the route
          longitude: -123.4194,
          accuracy: 10,
          altitude: 0,
          speed: 10,
          heading: 0,
        })
      );

      store.dispatch(
        setRoute({
          distance: { text: '10 mi', value: 16093 },
          duration: { text: '20 min', value: 1200 },
          steps: [],
          polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        })
      );

      // Enable voice
      store.dispatch(setVoiceEnabled(true));

      // Update ETA
      store.dispatch(updateEta());

      // Check if off-route announcement was made
      expect(Speech.speak).toHaveBeenCalled();
      const announcement = (Speech.speak as jest.Mock).mock.calls[0][0];
      expect(announcement).toContain('You have gone off route');
    });

    it('announces traffic delays', () => {
      // Set up initial state during rush hour
      const rushHour = new Date();
      rushHour.setHours(8, 0, 0, 0); // 8 AM
      jest.setSystemTime(rushHour);

      store.dispatch(
        setCurrentLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          speed: 5, // Slow speed to simulate traffic
          heading: 0,
        })
      );

      store.dispatch(
        setRoute({
          distance: { text: '10 mi', value: 16093 },
          duration: { text: '20 min', value: 1200 },
          steps: [],
          polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        })
      );

      // Enable voice
      store.dispatch(setVoiceEnabled(true));

      // Update ETA
      store.dispatch(updateEta());

      // Check if traffic announcement was made
      expect(Speech.speak).toHaveBeenCalled();
      const announcement = (Speech.speak as jest.Mock).mock.calls[0][0];
      expect(announcement).toContain('delay due to traffic');

      // Reset system time
      jest.useRealTimers();
    });
  });
});
