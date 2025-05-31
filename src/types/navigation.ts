export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface Destination {
  location: Location;
  name: string;
}

export interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  type?: string;
  location: Location | null;
}

export interface RouteStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  instruction: string;
  maneuver?: string;
  polyline: string;
}

export interface Route {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  steps: RouteStep[];
  polyline: string;
  legsCoordinates?: { latitude: number; longitude: number }[][];
  warnings?: string[];
  alternativeRoutes?: Route[];
  eta?: {
    timestamp: number;
    text: string;
    value: number;
    trafficDelay?: number;
    isOffRoute?: boolean;
    distanceToRoute?: number;
  };
}

export interface Waypoint {
  location: Location;
  name: string;
  order: number;
}

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
}

export interface RootState {
  navigation: NavigationState;
}
