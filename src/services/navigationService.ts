import { GOOGLE_MAPS_API_KEY } from '@env';

import { Location, Route, RouteStep, SearchResult } from '@/types/navigation';

const BASE_URL = 'https://maps.googleapis.com/maps/api';

interface GoogleDirectionsResponse {
  routes: {
    legs: {
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      steps: {
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        maneuver?: string;
        polyline: { points: string };
      }[];
    }[];
    overview_polyline: { points: string };
    warnings?: string[];
  }[];
  status: string;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  result: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    name: string;
    formatted_address: string;
  };
  status: string;
  error_message?: string;
}

export class NavigationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'NavigationError';
  }
}

export const getDirections = async (
  origin: Location,
  waypoints: Location[],
  alternatives: boolean = true
): Promise<Route[]> => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new NavigationError('Google Maps API key is missing', 'CONFIGURATION_ERROR');
  }

  try {
    // If no waypoints, return empty array
    if (waypoints.length === 0) {
      return [];
    }

    // The last waypoint is the final destination
    const destination = waypoints[waypoints.length - 1];
    // All waypoints except the last one are intermediate stops
    const intermediateWaypoints = waypoints.slice(0, -1);

    // Format waypoints for the API
    const waypointsParam = intermediateWaypoints
      .map(wp => `via:${wp.latitude},${wp.longitude}`)
      .join('|');

    const response = await fetch(
      `${BASE_URL}/directions/json?` +
        `origin=${origin.latitude},${origin.longitude}` +
        `&destination=${destination.latitude},${destination.longitude}` +
        (waypointsParam ? `&waypoints=${waypointsParam}` : '') +
        `&alternatives=${alternatives}` +
        `&mode=driving` +
        `&departure_time=now` +
        `&traffic_model=best_guess` +
        `&optimize=true` + // Let Google optimize the waypoint order
        `&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new NavigationError('Failed to fetch directions', 'NETWORK_ERROR', {
        status: response.status,
      });
    }

    const data: GoogleDirectionsResponse = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new NavigationError('No routes found between the selected locations', 'NO_ROUTES');
    }

    if (data.status !== 'OK') {
      throw new NavigationError(
        data.error_message || `Directions API error: ${data.status}`,
        'API_ERROR',
        { status: data.status }
      );
    }

    if (!data.routes || data.routes.length === 0) {
      throw new NavigationError('No routes found', 'NO_ROUTES');
    }

    return data.routes.map(route => {
      // Combine all legs into one route
      const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
      const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);
      const allSteps = route.legs.flatMap(leg => leg.steps);

      // Extract and decode polylines for each leg
      const legsCoordinates = route.legs.map(leg => {
        // Combine step polylines for the current leg
        const legPolyline = leg.steps.map(step => step.polyline.points).join('');
        // Decode the combined leg polyline
        return decodePolyline(legPolyline);
      });

      return {
        distance: {
          text: formatDistance(totalDistance),
          value: totalDistance,
        },
        duration: {
          text: formatDuration(totalDuration),
          value: totalDuration,
        },
        steps: allSteps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          maneuver: step.maneuver,
          polyline: step.polyline.points,
        })),
        polyline: route.overview_polyline.points,
        legsCoordinates: legsCoordinates,
        warnings: route.warnings,
      };
    });
  } catch (error) {
    if (error instanceof NavigationError) {
      throw error;
    }
    throw new NavigationError('Failed to get directions', 'UNKNOWN_ERROR', { cause: error });
  }
};

// Helper function to format distance
const formatDistance = (meters: number): string => {
  const miles = meters * 0.000621371;
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

export const getPlaceDetails = async (placeId: string): Promise<Location> => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new NavigationError('Google Maps API key is missing', 'CONFIGURATION_ERROR');
  }

  try {
    const response = await fetch(
      `${BASE_URL}/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=geometry,name,formatted_address` +
        `&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new NavigationError('Failed to fetch place details', 'NETWORK_ERROR', {
        status: response.status,
      });
    }

    const data: GooglePlaceDetailsResponse = await response.json();

    if (data.status !== 'OK') {
      throw new NavigationError(
        data.error_message || `Places API error: ${data.status}`,
        'API_ERROR',
        { status: data.status }
      );
    }

    const { lat, lng } = data.result.geometry.location;
    return {
      latitude: lat,
      longitude: lng,
      accuracy: 0,
      altitude: 0,
      speed: 0,
      heading: 0,
    };
  } catch (error) {
    if (error instanceof NavigationError) {
      throw error;
    }
    throw new NavigationError('Error fetching place details', 'UNKNOWN_ERROR', {
      originalError: error,
    });
  }
};

export const getPlaceSuggestions = async (
  query: string,
  location?: Location,
  radius: number = 50000,
  timeout: number = 10000
): Promise<SearchResult[]> => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new NavigationError('Google Maps API key is missing', 'CONFIGURATION_ERROR');
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_MAPS_API_KEY,
      types: 'geocode|establishment',
      components: 'country:us',
      language: 'en',
    });

    if (location) {
      params.append('location', `${location.latitude},${location.longitude}`);
    }

    params.append('radius', radius.toString());

    const response = await fetch(`${BASE_URL}/place/autocomplete/json?${params.toString()}`, {
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new NavigationError('Failed to get place suggestions', 'NETWORK_ERROR', {
        status: response.status,
      });
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new NavigationError(
        data.error_message || 'Failed to get place suggestions',
        'API_ERROR',
        { status: data.status }
      );
    }

    return (data.predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      name: prediction.structured_formatting.main_text,
      address: prediction.structured_formatting.secondary_text,
      type: prediction.types?.[0],
      location: null,
    }));
  } catch (error) {
    if (error instanceof NavigationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NavigationError('Place suggestions request timed out', 'TIMEOUT_ERROR');
    }
    throw new NavigationError('Error getting place suggestions', 'UNKNOWN_ERROR', {
      originalError: error,
    });
  }
};

export const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  const coordinates: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  try {
    while (index < encoded.length) {
      // Decode latitude
      let shift = 0;
      let result = 0;
      let byte = null;

      do {
        if (index >= encoded.length) {
          throw new Error('Unexpected end of polyline');
        }
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      // Decode longitude
      shift = 0;
      result = 0;
      byte = null; // Reset byte

      do {
         if (index >= encoded.length) {
          throw new Error('Unexpected end of polyline');
        }
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      // Google's polyline algorithm uses a factor of 1e-5 for precision
      const latitude = Number((lat * 1e-5).toFixed(6));
      const longitude = Number((lng * 1e-5).toFixed(6));

      // Only add valid coordinates
      if (latitude >= -90 && latitude <= 90 && 
          longitude >= -180 && longitude <= 180 &&
          !isNaN(latitude) && !isNaN(longitude)) {
        coordinates.push({ latitude, longitude });
      }
    }
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return coordinates; // Return partial coordinates if decoding fails mid-way
  }

  return coordinates;
};

