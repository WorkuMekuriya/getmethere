import {
  getDirections,
  getPlaceDetails,
  getPlaceSuggestions,
  NavigationError,
} from '../navigationService';

import { Location } from '@/types/navigation';

// Mock fetch
global.fetch = jest.fn();

describe('navigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  describe('getDirections', () => {
    const mockOrigin: Location = { latitude: 37.7749, longitude: -122.4194 };
    const mockDestination: Location = { latitude: 34.0522, longitude: -118.2437 };

    it('should fetch directions successfully', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { text: '100 mi', value: 160934 },
                duration: { text: '2 hours', value: 7200 },
                steps: [
                  {
                    distance: { text: '100 mi', value: 160934 },
                    duration: { text: '2 hours', value: 7200 },
                    html_instructions: 'Drive for 100 miles',
                    polyline: { points: 'mockPolyline' },
                  },
                ],
              },
            ],
            overview_polyline: { points: 'mockPolyline' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getDirections(mockOrigin, mockDestination);
      expect(result).toHaveLength(1);
      expect(result[0].distance.text).toBe('100 mi');
      expect(result[0].duration.text).toBe('2 hours');
    });

    it('should throw NavigationError when API key is missing', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      await expect(getDirections(mockOrigin, mockDestination)).rejects.toThrow(
        new NavigationError('Google Maps API key is missing', 'CONFIGURATION_ERROR')
      );
    });

    it('should throw NavigationError when no routes found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ZERO_RESULTS' }),
      });

      await expect(getDirections(mockOrigin, mockDestination)).rejects.toThrow(
        new NavigationError('No routes found between the selected locations', 'NO_ROUTES')
      );
    });
  });

  describe('getPlaceDetails', () => {
    const mockPlaceId = 'test-place-id';

    it('should fetch place details successfully', async () => {
      const mockResponse = {
        status: 'OK',
        result: {
          geometry: {
            location: { lat: 37.7749, lng: -122.4194 },
          },
          name: 'Test Place',
          formatted_address: '123 Test St',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getPlaceDetails(mockPlaceId);
      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('should throw NavigationError when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'INVALID_REQUEST',
            error_message: 'Invalid place ID',
          }),
      });

      await expect(getPlaceDetails(mockPlaceId)).rejects.toThrow(
        new NavigationError('Invalid place ID', 'API_ERROR', { status: 'INVALID_REQUEST' })
      );
    });
  });

  describe('getPlaceSuggestions', () => {
    const mockQuery = 'test query';
    const mockLocation: Location = { latitude: 37.7749, longitude: -122.4194 };

    it('should fetch place suggestions successfully', async () => {
      const mockResponse = {
        status: 'OK',
        predictions: [
          {
            place_id: 'test-place-id',
            structured_formatting: {
              main_text: 'Test Place',
              secondary_text: '123 Test St',
            },
            types: ['establishment'],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getPlaceSuggestions(mockQuery, mockLocation);
      expect(result).toHaveLength(1);
      expect(result[0].placeId).toBe('test-place-id');
      expect(result[0].name).toBe('Test Place');
      expect(result[0].address).toBe('123 Test St');
    });

    it('should handle empty results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ZERO_RESULTS' }),
      });

      const result = await getPlaceSuggestions(mockQuery);
      expect(result).toHaveLength(0);
    });
  });
});
